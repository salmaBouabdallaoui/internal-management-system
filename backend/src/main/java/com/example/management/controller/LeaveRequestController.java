package com.example.management.controller;

import com.example.management.entity.AuditLog;
import com.example.management.entity.LeaveRequest;
import com.example.management.entity.User;
import com.example.management.repository.AuditLogRepository;
import com.example.management.repository.UserRepository;
import com.example.management.service.ApplicationUptimeService;
import com.example.management.service.LeaveRequestService;
import com.example.management.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping({"/api/leaves", "/api/conges"})
@Transactional(readOnly = true)
public class LeaveRequestController {

    private final LeaveRequestService leaveRequestService;
    private final UserService userService;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final ApplicationUptimeService applicationUptimeService;
    private final DataSource dataSource;

    public LeaveRequestController(
            LeaveRequestService leaveRequestService,
            UserService userService,
            UserRepository userRepository,
            AuditLogRepository auditLogRepository,
            ApplicationUptimeService applicationUptimeService,
            DataSource dataSource
    ) {
        this.leaveRequestService = leaveRequestService;
        this.userService = userService;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.applicationUptimeService = applicationUptimeService;
        this.dataSource = dataSource;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyLeaveSpace(Authentication authentication) {
        User user = authenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur introuvable.");
        }

        List<LeaveRequestItem> requests = leaveRequestService.findByRequesterId(user.getId()).stream()
                .map(this::toItem)
                .toList();

        return ResponseEntity.ok(new MyLeaveSpaceResponse(
                new LeaveProfile(
                        user.getId(),
                        displayName(user),
                        displayJobTitle(user),
                        displayDepartment(user),
                        safeLeaveDays(user.getRemainingLeaveDays())
                ),
                userService.canReviewLeaveApprovals(user),
                isAdmin(user),
                requests,
                buildEmployeeNotifications(requests)
        ));
    }

    @GetMapping("/approvals")
    public ResponseEntity<?> getPendingApprovals(
            Authentication authentication,
            @RequestParam(required = false) Long requestId,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String reject,
            @RequestHeader(value = "X-Leave-Request-Id", required = false) Long reviewRequestId,
            @RequestHeader(value = "X-Leave-State", required = false) String reviewState
    ) {
        User user = authenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur introuvable.");
        }

        if (!userService.canReviewLeaveApprovals(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acces reserve au chef de division, ou au chef de service si le chef de division est en conge.");
        }

        Long effectiveRequestId = requestId != null ? requestId : reviewRequestId;
        String effectiveState = state != null ? state : reviewState;
        if (effectiveRequestId != null && (effectiveState == null || effectiveState.isBlank())) {
            effectiveState = (reject != null && !reject.isBlank()) ? "REFUSED" : "APPROVED";
        }

        if (effectiveRequestId != null || effectiveState != null) {
            String normalizedAction = normalize(effectiveState).toUpperCase(Locale.ROOT);
            if (!"APPROVED".equals(normalizedAction) && !"REFUSED".equals(normalizedAction)) {
                return ResponseEntity.badRequest().body("Action de validation invalide.");
            }
            return review(effectiveRequestId, authentication, normalizedAction, null);
        }

        String department = normalize(user.getDepartment());
        List<LeaveRequestItem> requests = leaveRequestService.findPendingByDepartment(department).stream()
                .filter(request -> request.getRequester() != null && !request.getRequester().getId().equals(user.getId()))
                .map(this::toItem)
                .toList();

        return ResponseEntity.ok(requests);
    }

    @PostMapping("/approvals/review")
    @Transactional
    public ResponseEntity<?> reviewPendingApproval(
            @RequestBody ReviewPendingApprovalRequest payload,
            Authentication authentication
    ) {
        User user = authenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur introuvable.");
        }

        if (!userService.canReviewLeaveApprovals(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acces reserve au chef de division, ou au chef de service si le chef de division est en conge.");
        }

        if (payload == null || payload.getRequestId() == null) {
            return ResponseEntity.badRequest().body("Identifiant de demande manquant.");
        }

        String normalizedDecision = normalize(payload.getDecision()).toUpperCase(Locale.ROOT);
        if (!"APPROVED".equals(normalizedDecision) && !"REFUSED".equals(normalizedDecision)) {
            return ResponseEntity.badRequest().body("Action de validation invalide.");
        }

        return review(payload.getRequestId(), authentication, normalizedDecision, payload.getReason());
    }

    @GetMapping("/hr-approvals")
    public ResponseEntity<?> getPendingHrApprovals(Authentication authentication) {
        User user = authenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur introuvable.");
        }

        if (!isAdmin(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acces reserve a l'admin RH.");
        }

        List<LeaveRequestItem> requests = leaveRequestService.findPendingHrApprovals().stream()
                .map(this::toItem)
                .toList();

        return ResponseEntity.ok(requests);
    }

    @PostMapping("/hr-approvals/review")
    @Transactional
    public ResponseEntity<?> reviewPendingHrApproval(
            @RequestBody ReviewPendingApprovalRequest payload,
            Authentication authentication
    ) {
        User user = authenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur introuvable.");
        }

        if (!isAdmin(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acces reserve a l'admin RH.");
        }

        if (payload == null || payload.getRequestId() == null) {
            return ResponseEntity.badRequest().body("Identifiant de demande manquant.");
        }

        String normalizedDecision = normalize(payload.getDecision()).toUpperCase(Locale.ROOT);
        if (!"APPROVED".equals(normalizedDecision) && !"REFUSED".equals(normalizedDecision)) {
            return ResponseEntity.badRequest().body("Action de validation invalide.");
        }

        return reviewByHr(payload.getRequestId(), user, normalizedDecision, payload.getReason());
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(Authentication authentication) {
        User user = authenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur introuvable.");
        }

        boolean canReview = userService.canReviewLeaveApprovals(user);
        boolean canReviewHr = isAdmin(user);
        String department = normalize(user.getDepartment());
        List<LeaveRequest> pendingRequests = canReview
                ? leaveRequestService.findPendingByDepartment(department).stream()
                .filter(request -> request.getRequester() != null && !request.getRequester().getId().equals(user.getId()))
                .toList()
                : List.of();
        List<LeaveRequest> pendingHrRequests = canReviewHr
                ? leaveRequestService.findPendingHrApprovals()
                : List.of();
        List<LeaveRequestItem> pendingItems = pendingRequests.stream()
                .limit(3)
                .map(this::toItem)
                .toList();
        List<LeaveRequestItem> pendingHrItems = pendingHrRequests.stream()
                .limit(3)
                .map(this::toItem)
                .toList();
        List<LeaveRequestItem> todayAbsences = canReview
                ? leaveRequestService.findApprovedByDepartment(department).stream()
                .filter(request -> request.getRequester() != null && !request.getRequester().getId().equals(user.getId()))
                .filter(this::coversToday)
                .limit(5)
                .map(this::toItem)
                .toList()
                : List.of();
        long pendingCount = pendingRequests.size();
        long pendingHrCount = pendingHrRequests.size();
        List<LeaveRequestItem> myRequests = leaveRequestService.findByRequesterId(user.getId()).stream()
                .map(this::toItem)
                .toList();
        AdminHrDashboardStats adminHrStats = null;
        if (canReviewHr) {
            long totalEmployees = userService.findEmployees().size();
            long employeesOnLeave = leaveRequestService.countEmployeesOnLeaveToday();
            double absenteeismRate = totalEmployees == 0 ? 0.0 : (employeesOnLeave * 100.0 / totalEmployees);
            adminHrStats = new AdminHrDashboardStats(
                    totalEmployees,
                    employeesOnLeave,
                    Math.round(absenteeismRate * 10.0) / 10.0,
                    new GlobalLeaveStats(
                            leaveRequestService.countAll(),
                            leaveRequestService.countByStatus("PENDING"),
                            leaveRequestService.countByStatus("PENDING_HR"),
                            leaveRequestService.countByStatus("APPROVED"),
                            leaveRequestService.countByStatus("REFUSED")
                    )
            );
        }
        SuperAdminDashboardStats superAdminStats = userService.isSuperAdmin(user)
                ? buildSuperAdminStats()
                : null;

        return ResponseEntity.ok(new LeaveDashboardResponse(
                canReview,
                canReviewHr,
                pendingCount,
                pendingHrCount,
                pendingItems,
                pendingHrItems,
                buildEmployeeNotifications(myRequests),
                adminHrStats,
                todayAbsences,
                superAdminStats
        ));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createLeaveRequest(@RequestBody CreateLeaveRequest payload, Authentication authentication) {
        User user = authenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur introuvable.");
        }

        if (payload == null) {
            return ResponseEntity.badRequest().body("Donnees manquantes.");
        }

        String leaveType = normalizeLeaveType(payload.getLeaveType());
        LocalDate startDate = payload.getStartDate();
        LocalDate endDate = payload.getEndDate();
        String department = normalize(user.getDepartment());

        if (leaveType.isEmpty()) {
            return ResponseEntity.badRequest().body("Le type de conge est obligatoire.");
        }

        if (startDate == null || endDate == null) {
            return ResponseEntity.badRequest().body("Les dates de debut et de fin sont obligatoires.");
        }

        if (endDate.isBefore(startDate)) {
            return ResponseEntity.badRequest().body("La date de fin doit etre posterieure ou egale a la date de debut.");
        }

        int durationDays = leaveRequestService.calculateLeaveDays(startDate, endDate);
        if (durationDays <= 0) {
            return ResponseEntity.badRequest().body("La periode selectionnee ne contient aucun jour ouvrable apres exclusion des weekends et jours feries.");
        }

        if (safeLeaveDays(user.getRemainingLeaveDays()) < durationDays) {
            return ResponseEntity.badRequest().body("Le solde de conge est insuffisant.");
        }

        if (department.isEmpty()) {
            return ResponseEntity.badRequest().body("Le departement de l'employe est obligatoire.");
        }

        if (!userService.canSubmitLeaveRequest(user, department)) {
            return ResponseEntity.badRequest().body("Aucun chef de division ou chef de service disponible pour ce departement.");
        }

        LeaveRequest leaveRequest = new LeaveRequest();
        leaveRequest.setRequester(user);
        leaveRequest.setRequesterFullName(displayName(user));
        leaveRequest.setRequesterJobTitle(displayJobTitle(user));
        leaveRequest.setRequesterDepartment(displayDepartment(user));
        leaveRequest.setLeaveType(leaveType);
        leaveRequest.setStartDate(startDate);
        leaveRequest.setEndDate(endDate);
        leaveRequest.setDurationDays(durationDays);
        leaveRequest.setStatus(userService.resolveInitialLeaveStatus(user, department));
        leaveRequest.setCreatedAt(LocalDateTime.now());

        return ResponseEntity.status(HttpStatus.CREATED).body(toItem(leaveRequestService.save(leaveRequest)));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateLeaveRequest(
            @PathVariable Long id,
            @RequestBody CreateLeaveRequest payload,
            Authentication authentication
    ) {
        User user = authenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur introuvable.");
        }

        if (payload == null) {
            return ResponseEntity.badRequest().body("Donnees manquantes.");
        }

        LeaveRequest leaveRequest = leaveRequestService.findById(id).orElse(null);
        if (leaveRequest == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Demande introuvable.");
        }

        if (!isRequester(user, leaveRequest)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Vous ne pouvez modifier que vos propres demandes.");
        }

        String leaveType = normalizeLeaveType(payload.getLeaveType());
        LocalDate startDate = payload.getStartDate();
        LocalDate endDate = payload.getEndDate();
        String department = normalize(user.getDepartment());

        ResponseEntity<String> invalid = validateLeaveRequestPayload(leaveType, startDate, endDate, department);
        if (invalid != null) {
            return invalid;
        }

        int newDurationDays = leaveRequestService.calculateLeaveDays(startDate, endDate);
        if (newDurationDays <= 0) {
            return ResponseEntity.badRequest().body("La periode selectionnee ne contient aucun jour ouvrable apres exclusion des weekends et jours feries.");
        }

        int balance = safeLeaveDays(user.getRemainingLeaveDays());
        int previousDurationDays = leaveRequest.getDurationDays() == null ? 0 : leaveRequest.getDurationDays();
        boolean wasApproved = "APPROVED".equalsIgnoreCase(leaveRequest.getStatus());
        int availableDays = wasApproved ? balance + previousDurationDays : balance;
        if (availableDays < newDurationDays) {
            return ResponseEntity.badRequest().body("Le solde de conge est insuffisant.");
        }

        leaveRequest.setRequesterFullName(displayName(user));
        leaveRequest.setRequesterJobTitle(displayJobTitle(user));
        leaveRequest.setRequesterDepartment(displayDepartment(user));
        leaveRequest.setLeaveType(leaveType);
        leaveRequest.setStartDate(startDate);
        leaveRequest.setEndDate(endDate);
        leaveRequest.setDurationDays(newDurationDays);

        if (wasApproved) {
            user.setRemainingLeaveDays(availableDays - newDurationDays);
            userService.saveWithoutPasswordChange(user);
        } else if ("REFUSED".equalsIgnoreCase(leaveRequest.getStatus()) || "PENDING_HR".equalsIgnoreCase(leaveRequest.getStatus())) {
            leaveRequest.setStatus(userService.resolveInitialLeaveStatus(user, department));
            leaveRequest.setReviewer(null);
            leaveRequest.setReviewerName(null);
            leaveRequest.setReviewReason(null);
            leaveRequest.setReviewedAt(null);
        }

        return ResponseEntity.ok(toItem(leaveRequestService.save(leaveRequest)));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteLeaveRequest(@PathVariable Long id, Authentication authentication) {
        User user = authenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur introuvable.");
        }

        LeaveRequest leaveRequest = leaveRequestService.findById(id).orElse(null);
        if (leaveRequest == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Demande introuvable.");
        }

        if (!isRequester(user, leaveRequest)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Vous ne pouvez supprimer que vos propres demandes.");
        }

        if ("APPROVED".equalsIgnoreCase(leaveRequest.getStatus())) {
            int duration = leaveRequest.getDurationDays() == null ? 0 : leaveRequest.getDurationDays();
            user.setRemainingLeaveDays(safeLeaveDays(user.getRemainingLeaveDays()) + duration);
            userService.saveWithoutPasswordChange(user);
        }

        leaveRequestService.delete(leaveRequest);
        return ResponseEntity.noContent().build();
    }

    @RequestMapping(value = "/{id}/approve", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT})
    @Transactional
    public ResponseEntity<?> approve(@PathVariable Long id, Authentication authentication) {
        return review(id, authentication, "APPROVED", null);
    }

    @RequestMapping(value = "/{id}/refuse", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT})
    @Transactional
    public ResponseEntity<?> refuse(@PathVariable Long id, Authentication authentication) {
        return review(id, authentication, "REFUSED", null);
    }

    @PutMapping("/review/{id}")
    @Transactional
    public ResponseEntity<?> reviewRequest(
            @PathVariable Long id,
            @RequestBody ReviewLeaveRequest payload,
            Authentication authentication
    ) {
        if (payload == null) {
            return ResponseEntity.badRequest().body("Donnees manquantes.");
        }

        String action = normalize(payload.getDecision()).toUpperCase(Locale.ROOT);
        if (!"APPROVED".equals(action) && !"REFUSED".equals(action)) {
            return ResponseEntity.badRequest().body("Action de validation invalide.");
        }

        return review(id, authentication, action, payload.getReason());
    }

    @GetMapping("/review-request")
    @Transactional
    public ResponseEntity<?> reviewRequestQuery(
            @RequestParam Long requestId,
            @RequestParam String decision,
            Authentication authentication
    ) {
        String normalizedAction = normalize(decision).toUpperCase(Locale.ROOT);
        if (!"APPROVED".equals(normalizedAction) && !"REFUSED".equals(normalizedAction)) {
            return ResponseEntity.badRequest().body("Action de validation invalide.");
        }

        return review(requestId, authentication, normalizedAction, null);
    }

    private ResponseEntity<?> review(Long id, Authentication authentication, String nextStatus, String reason) {
        User reviewer = authenticatedUser(authentication);
        if (reviewer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur introuvable.");
        }

        if (id == null) {
            return ResponseEntity.badRequest().body("Identifiant de demande manquant.");
        }

        if (!userService.canReviewLeaveApprovals(reviewer)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acces reserve au chef de division, ou au chef de service si le chef de division est en conge.");
        }

        LeaveRequest leaveRequest = leaveRequestService.findById(id).orElse(null);
        if (leaveRequest == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Demande introuvable.");
        }

        User requester = leaveRequest.getRequester();
        if (requester == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Employe introuvable pour cette demande.");
        }

        if (!normalize(reviewer.getDepartment()).equals(normalize(leaveRequest.getRequesterDepartment()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Vous ne pouvez traiter que les demandes de votre departement.");
        }

        if (requester.getId().equals(reviewer.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Vous ne pouvez pas valider votre propre demande.");
        }

        if (!"PENDING".equalsIgnoreCase(leaveRequest.getStatus())) {
            return ResponseEntity.badRequest().body("Cette demande a deja ete traitee.");
        }

        String normalizedReason = normalize(reason);
        if ("REFUSED".equalsIgnoreCase(nextStatus) && normalizedReason.isEmpty()) {
            return ResponseEntity.badRequest().body("Le motif du refus est obligatoire.");
        }

        leaveRequest.setStatus("APPROVED".equalsIgnoreCase(nextStatus) ? "PENDING_HR" : nextStatus);
        leaveRequest.setReviewer(reviewer);
        leaveRequest.setReviewerName(displayName(reviewer));
        leaveRequest.setReviewReason("REFUSED".equalsIgnoreCase(nextStatus) ? normalizedReason : null);
        leaveRequest.setReviewedAt(LocalDateTime.now());
        leaveRequestService.save(leaveRequest);

        return ResponseEntity.ok(toItem(leaveRequest));
    }

    private ResponseEntity<?> reviewByHr(Long id, User reviewer, String nextStatus, String reason) {
        LeaveRequest leaveRequest = leaveRequestService.findById(id).orElse(null);
        if (leaveRequest == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Demande introuvable.");
        }

        User requester = leaveRequest.getRequester();
        if (requester == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Employe introuvable pour cette demande.");
        }

        if (!"PENDING_HR".equalsIgnoreCase(leaveRequest.getStatus())) {
            return ResponseEntity.badRequest().body("Cette demande n'est pas en attente RH.");
        }

        String normalizedReason = normalize(reason);
        if ("REFUSED".equalsIgnoreCase(nextStatus) && normalizedReason.isEmpty()) {
            return ResponseEntity.badRequest().body("Le motif du refus est obligatoire.");
        }

        if ("APPROVED".equalsIgnoreCase(nextStatus)) {
            int balance = safeLeaveDays(requester.getRemainingLeaveDays());
            int duration = leaveRequest.getDurationDays() == null ? 0 : leaveRequest.getDurationDays();
            if (balance < duration) {
                return ResponseEntity.badRequest().body("Le solde de conge de cet employe est insuffisant.");
            }
            requester.setRemainingLeaveDays(balance - duration);
            userService.saveWithoutPasswordChange(requester);
        }

        leaveRequest.setStatus(nextStatus);
        leaveRequest.setReviewer(reviewer);
        leaveRequest.setReviewerName(displayName(reviewer));
        leaveRequest.setReviewReason("REFUSED".equalsIgnoreCase(nextStatus) ? normalizedReason : null);
        leaveRequest.setReviewedAt(LocalDateTime.now());
        leaveRequestService.save(leaveRequest);

        return ResponseEntity.ok(toItem(leaveRequest));
    }

    private User authenticatedUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return userService.findByUsername(authentication.getName());
    }

    private ResponseEntity<String> validateLeaveRequestPayload(
            String leaveType,
            LocalDate startDate,
            LocalDate endDate,
            String department
    ) {
        if (leaveType.isEmpty()) {
            return ResponseEntity.badRequest().body("Le type de conge est obligatoire.");
        }

        if (startDate == null || endDate == null) {
            return ResponseEntity.badRequest().body("Les dates de debut et de fin sont obligatoires.");
        }

        if (endDate.isBefore(startDate)) {
            return ResponseEntity.badRequest().body("La date de fin doit etre posterieure ou egale a la date de debut.");
        }

        if (department.isEmpty()) {
            return ResponseEntity.badRequest().body("Le departement de l'employe est obligatoire.");
        }

        return null;
    }

    private boolean isRequester(User user, LeaveRequest leaveRequest) {
        return leaveRequest.getRequester() != null && leaveRequest.getRequester().getId().equals(user.getId());
    }

    private boolean isAdmin(User user) {
        return userService.hasPlatformAdminPrivileges(user);
    }

    private List<LeaveNotification> buildEmployeeNotifications(List<LeaveRequestItem> requests) {
        return requests.stream()
                .filter(request -> "APPROVED".equalsIgnoreCase(request.status()) || "REFUSED".equalsIgnoreCase(request.status()))
                .limit(5)
                .map(request -> new LeaveNotification(
                        request.id(),
                        "APPROVED".equalsIgnoreCase(request.status()) ? "Demande de conge acceptee par l'admin RH." : "Demande de conge refusee.",
                        request.status(),
                        request.reviewReason(),
                        request.reviewedAt()
                ))
                .toList();
    }

    private boolean coversToday(LeaveRequest leaveRequest) {
        if (leaveRequest == null) {
            return false;
        }

        LocalDate today = LocalDate.now();
        LocalDate startDate = leaveRequest.getStartDate();
        LocalDate endDate = leaveRequest.getEndDate();
        return startDate != null && endDate != null
                && !today.isBefore(startDate)
                && !today.isAfter(endDate);
    }

    private SuperAdminDashboardStats buildSuperAdminStats() {
        List<User> allUsers = userRepository.findAll();
        long totalAccounts = allUsers.size();
        long employees = allUsers.stream()
                .filter(user -> !userService.hasPlatformAdminPrivileges(user))
                .count();
        long admins = allUsers.stream()
                .filter(userService::hasPlatformAdminPrivileges)
                .count();
        long divisionChiefs = allUsers.stream()
                .filter(userService::isDivisionChief)
                .count();
        long serviceChiefs = allUsers.stream()
                .filter(userService::isServiceChief)
                .count();
        long employeesOnLeaveToday = leaveRequestService.countEmployeesOnLeaveToday();
        long lockedAccounts = allUsers.stream()
                .filter(userService::isLocked)
                .count();
        long pendingLeaveRequests = leaveRequestService.countByStatus("PENDING");
        long pendingHrRequests = leaveRequestService.countByStatus("PENDING_HR");

        List<SystemAlertItem> alerts = List.of(
                new SystemAlertItem(
                        "Demandes en attente",
                        pendingLeaveRequests + " demande(s) de conge en attente de validation.",
                        pendingLeaveRequests,
                        pendingLeaveRequests > 0 ? "warning" : "info"
                ),
                new SystemAlertItem(
                        "Demandes RH",
                        pendingHrRequests + " demande(s) attendent la validation RH.",
                        pendingHrRequests,
                        pendingHrRequests > 0 ? "warning" : "info"
                ),
                new SystemAlertItem(
                        "Comptes verrouilles",
                        lockedAccounts + " compte(s) sont temporairement bloques.",
                        lockedAccounts,
                        lockedAccounts > 0 ? "critical" : "info"
                )
        ).stream()
                .filter(item -> item.count() > 0)
                .toList();

        List<AdminActivityItem> recentActivity = auditLogRepository.findTop20ByOrderByCreatedAtDesc().stream()
                .map(log -> new AdminActivityItem(
                        log.getActorUsername(),
                        log.getAction(),
                        log.getTargetType(),
                        log.getTargetId(),
                        log.getDetails(),
                        log.getCreatedAt()
                ))
                .filter(item -> item.actorUsername() != null)
                .filter(item -> {
                    User actor = userService.findByUsername(item.actorUsername());
                    return userService.hasPlatformAdminPrivileges(actor);
                })
                .limit(6)
                .toList();

        SystemHealthStats systemHealth = new SystemHealthStats(
                "OK",
                isDatabaseHealthy() ? "OK" : "DOWN",
                applicationUptimeService.formatUptime(),
                applicationUptimeService.getUptime().getSeconds()
        );

        return new SuperAdminDashboardStats(
                systemHealth,
                new GlobalEffectifStats(
                        totalAccounts,
                        employees,
                        admins,
                        divisionChiefs,
                        serviceChiefs,
                        employeesOnLeaveToday,
                        lockedAccounts
                ),
                alerts,
                recentActivity
        );
    }

    private boolean isDatabaseHealthy() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(2);
        } catch (Exception exception) {
            return false;
        }
    }

    private LeaveRequestItem toItem(LeaveRequest leaveRequest) {
        return new LeaveRequestItem(
                leaveRequest.getId(),
                leaveRequest.getRequesterFullName(),
                displayValue(leaveRequest.getRequesterJobTitle(), "Non renseigne"),
                displayValue(leaveRequest.getRequesterDepartment(), "Non renseigne"),
                leaveRequest.getLeaveType(),
                leaveRequest.getStartDate(),
                leaveRequest.getEndDate(),
                leaveRequest.getDurationDays() == null ? 0 : leaveRequest.getDurationDays(),
                leaveRequest.getStatus(),
                leaveRequest.getReviewerName(),
                leaveRequest.getReviewReason(),
                leaveRequest.getCreatedAt(),
                leaveRequest.getReviewedAt()
        );
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String displayName(User user) {
        String fullName = normalize(user.getFullName());
        return fullName.isEmpty() ? user.getUsername() : fullName;
    }

    private String displayDepartment(User user) {
        return displayValue(user.getDepartment(), "Non renseigne");
    }

    private String displayJobTitle(User user) {
        return displayValue(user.getJobTitle(), "Non renseigne");
    }

    private String displayValue(String value, String fallback) {
        String normalized = normalize(value);
        return normalized.isEmpty() ? fallback : normalized;
    }

    private int safeLeaveDays(Integer value) {
        return value == null ? User.ANNUAL_LEAVE_DAYS : Math.max(0, value);
    }

    private String normalizeLeaveType(String value) {
        String normalized = normalize(value).toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "administratif" -> "Administratif";
            case "maladie" -> "Maladie";
            case "exceptionnel" -> "Exceptionnel";
            default -> "";
        };
    }

    public static class CreateLeaveRequest {
        private String leaveType;
        private LocalDate startDate;
        private LocalDate endDate;

        public String getLeaveType() { return leaveType; }
        public void setLeaveType(String leaveType) { this.leaveType = leaveType; }

        public LocalDate getStartDate() { return startDate; }
        public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

        public LocalDate getEndDate() { return endDate; }
        public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    }

    public static class ReviewLeaveRequest {
        private String decision;
        private String reason;

        public String getDecision() { return decision; }
        public void setDecision(String decision) { this.decision = decision; }

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class ReviewPendingApprovalRequest {
        private Long requestId;
        private String decision;
        private String reason;

        public Long getRequestId() { return requestId; }
        public void setRequestId(Long requestId) { this.requestId = requestId; }

        public String getDecision() { return decision; }
        public void setDecision(String decision) { this.decision = decision; }

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public record LeaveProfile(
            Long id,
            String fullName,
            String role,
            String department,
            int remainingLeaveDays
    ) {}

    public record LeaveRequestItem(
            Long id,
            String requesterFullName,
            String requesterRole,
            String requesterDepartment,
            String leaveType,
            LocalDate startDate,
            LocalDate endDate,
            int durationDays,
            String status,
            String reviewerName,
            String reviewReason,
            LocalDateTime createdAt,
            LocalDateTime reviewedAt
    ) {}

    public record MyLeaveSpaceResponse(
            LeaveProfile profile,
            boolean canReview,
            boolean canReviewHr,
            List<LeaveRequestItem> requests,
            List<LeaveNotification> notifications
    ) {}

    public record LeaveDashboardResponse(
            boolean canReview,
            boolean canReviewHr,
            long pendingApprovalCount,
            long pendingHrApprovalCount,
            List<LeaveRequestItem> pendingRequests,
            List<LeaveRequestItem> pendingHrRequests,
            List<LeaveNotification> notifications,
            AdminHrDashboardStats adminHrStats,
            List<LeaveRequestItem> todayAbsences,
            SuperAdminDashboardStats superAdminStats
    ) {}

    public record AdminHrDashboardStats(
            long totalEmployees,
            long employeesOnLeave,
            double absenteeismRate,
            GlobalLeaveStats globalLeaveStats
    ) {}

    public record GlobalLeaveStats(
            long totalRequests,
            long pendingRequests,
            long pendingHrRequests,
            long approvedRequests,
            long refusedRequests
    ) {}

    public record SuperAdminDashboardStats(
            SystemHealthStats systemHealth,
            GlobalEffectifStats globalEffectifStats,
            List<SystemAlertItem> alerts,
            List<AdminActivityItem> recentActivity
    ) {}

    public record SystemHealthStats(
            String applicationStatus,
            String databaseStatus,
            String uptimeLabel,
            long uptimeSeconds
    ) {}

    public record GlobalEffectifStats(
            long totalAccounts,
            long employees,
            long admins,
            long divisionChiefs,
            long serviceChiefs,
            long employeesOnLeaveToday,
            long lockedAccounts
    ) {}

    public record SystemAlertItem(
            String title,
            String description,
            long count,
            String severity
    ) {}

    public record AdminActivityItem(
            String actorUsername,
            String action,
            String targetType,
            String targetId,
            String details,
            LocalDateTime createdAt
    ) {}

    public record LeaveNotification(
            Long requestId,
            String message,
            String status,
            String reason,
            LocalDateTime createdAt
    ) {}
}
