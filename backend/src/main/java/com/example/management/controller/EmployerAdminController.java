package com.example.management.controller;

import com.example.management.entity.User;
import com.example.management.service.AuditLogService;
import com.example.management.service.EmployerParticipationService;
import com.example.management.service.PlatformCatalogOptionService;
import com.example.management.service.UserService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/admin/employers")
public class EmployerAdminController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final EmployerParticipationService employerParticipationService;
    private final AuditLogService auditLogService;
    private final PlatformCatalogOptionService catalogOptionService;

    public EmployerAdminController(
            UserService userService,
            PasswordEncoder passwordEncoder,
            EmployerParticipationService employerParticipationService,
            AuditLogService auditLogService,
            PlatformCatalogOptionService catalogOptionService
    ) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.employerParticipationService = employerParticipationService;
        this.auditLogService = auditLogService;
        this.catalogOptionService = catalogOptionService;
    }

    @GetMapping
    public ResponseEntity<?> listEmployers(Authentication authentication) {
        User currentUser = currentUser(authentication);
        ResponseEntity<String> forbidden = ensureEmployeeDirectoryAccess(currentUser);
        if (forbidden != null) {
            return forbidden;
        }

        return userService.findVisibleEmployees(currentUser).stream()
                .map(user -> new EmployerListItem(
                        user.getId(),
                        defaultName(user),
                        user.getUsername(),
                        normalizeDepartment(user.getDepartment()),
                        emptyIfBlank(user.getJobTitle())
                ))
                .collect(java.util.stream.Collectors.collectingAndThen(java.util.stream.Collectors.toList(), ResponseEntity::ok));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getEmployer(@PathVariable Long id, Authentication authentication) {
        User currentUser = currentUser(authentication);
        ResponseEntity<String> forbidden = ensureEmployeeDirectoryAccess(currentUser);
        if (forbidden != null) {
            return forbidden;
        }

        User user = userService.findById(id).orElse(null);
        if (user == null || !canViewTarget(currentUser, user)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Employe introuvable.");
        }

        EmployerParticipationService.ParticipationSummary summary = employerParticipationService.buildSummary(user);
        return ResponseEntity.ok(new EmployerDetails(
                user.getId(),
                defaultName(user),
                user.getUsername(),
                emptyIfBlank(user.getJobTitle()),
                normalizeDepartment(user.getDepartment()),
                emptyIfBlank(user.getGrade()),
                "********",
                user.getPhotoUrl(),
                defaultLeaveDays(user.getRemainingLeaveDays()),
                summary.projects(),
                summary.eventCount(),
                summary.total()
                ,
                summary.events()
        ));
    }

    @PostMapping
    public ResponseEntity<?> createEmployer(@RequestBody EmployerRequest request, Authentication authentication) {
        User currentUser = currentUser(authentication);
        ResponseEntity<String> forbidden = ensurePlatformAdmin(currentUser);
        if (forbidden != null) {
            return forbidden;
        }

        String username = normalize(request.getUsername());
        String fullName = normalize(request.getFullName());
        String password = request.getPassword() != null ? request.getPassword().trim() : "";
        String role = normalizeRole(request.getRole());
        String department = normalize(request.getDepartment());
        String jobTitle = normalize(request.getJobTitle());
        String grade = normalize(request.getGrade());
        String photoUrl = normalize(request.getPhotoUrl());

        if (fullName.isEmpty()) {
            return ResponseEntity.badRequest().body("Le nom de l'employe est obligatoire.");
        }

        if (username.isEmpty()) {
            return ResponseEntity.badRequest().body("L'identifiant est obligatoire.");
        }

        if (password.isEmpty()) {
            return ResponseEntity.badRequest().body("Le mot de passe est obligatoire.");
        }

        if (userService.findByUsername(username) != null) {
            return ResponseEntity.badRequest().body("Cet identifiant existe deja.");
        }

        ResponseEntity<String> catalogValidation = validateCatalogValues(department, jobTitle);
        if (catalogValidation != null) {
            return catalogValidation;
        }

        User user = new User();
        user.setUsername(username);
        user.setFullName(fullName);
        user.setPassword(password);
        user.setRole(resolveRoleForCreation(currentUser, role));
        user.setDepartment(emptyToNull(department));
        user.setJobTitle(emptyToNull(jobTitle));
        user.setGrade(emptyToNull(grade));
        user.setPhotoUrl(emptyToNull(photoUrl));
        user.setRemainingLeaveDays(defaultLeaveDays(request.getRemainingLeaveDays()));
        user.setForcePasswordChange(true);

        try {
            User savedUser = userService.save(user);
            return ResponseEntity.status(HttpStatus.CREATED).body(new EmployerListItem(
                    savedUser.getId(),
                    defaultName(savedUser),
                    savedUser.getUsername(),
                    normalizeDepartment(savedUser.getDepartment()),
                    emptyIfBlank(savedUser.getJobTitle())
            ));
        } catch (DataIntegrityViolationException exception) {
            return ResponseEntity.badRequest().body("Impossible de creer cet employe.");
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateEmployer(@PathVariable Long id, @RequestBody EmployerRequest request, Authentication authentication) {
        User currentUser = currentUser(authentication);
        ResponseEntity<String> forbidden = ensurePlatformAdmin(currentUser);
        if (forbidden != null) {
            return forbidden;
        }

        User user = userService.findById(id).orElse(null);
        if (user == null || !canManageTarget(currentUser, user)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Employe introuvable.");
        }

        String previousJobTitle = emptyIfBlank(user.getJobTitle());
        String previousDepartment = normalizeDepartment(user.getDepartment());
        String previousUsername = user.getUsername();

        String username = normalize(request.getUsername());
        String fullName = normalize(request.getFullName());
        String requestedRole = normalizeRole(request.getRole());
        String department = normalize(request.getDepartment());
        String jobTitle = normalize(request.getJobTitle());
        String grade = normalize(request.getGrade());
        String photoUrl = normalize(request.getPhotoUrl());

        if (fullName.isEmpty()) {
            return ResponseEntity.badRequest().body("Le nom de l'employe est obligatoire.");
        }

        if (username.isEmpty()) {
            return ResponseEntity.badRequest().body("L'identifiant est obligatoire.");
        }

        User existingUser = userService.findByUsername(username);
        if (existingUser != null && !existingUser.getId().equals(id)) {
            return ResponseEntity.badRequest().body("Cet identifiant existe deja.");
        }

        ResponseEntity<String> catalogValidation = validateCatalogValues(department, jobTitle);
        if (catalogValidation != null) {
            return catalogValidation;
        }

        user.setUsername(username);
        user.setFullName(fullName);
        user.setRole(resolveRoleForUpdate(currentUser, user, requestedRole));
        user.setDepartment(emptyToNull(department));
        user.setJobTitle(emptyToNull(jobTitle));
        user.setGrade(emptyToNull(grade));
        user.setPhotoUrl(emptyToNull(photoUrl));
        user.setRemainingLeaveDays(defaultLeaveDays(request.getRemainingLeaveDays()));

        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword().trim()));
            user.setForcePasswordChange(true);
        }

        userService.saveWithoutPasswordChange(user);

        if (!previousJobTitle.equals(emptyIfBlank(user.getJobTitle()))) {
            auditLogService.log(
                    currentUser,
                    "ROLE_CHANGE",
                    "USER",
                    String.valueOf(user.getId()),
                    "jobTitle: " + previousJobTitle + " -> " + emptyIfBlank(user.getJobTitle())
            );
        }

        if (!previousUsername.equals(user.getUsername()) || !previousDepartment.equals(normalizeDepartment(user.getDepartment()))) {
            auditLogService.log(
                    currentUser,
                    "EMPLOYEE_UPDATE",
                    "USER",
                    String.valueOf(user.getId()),
                    "username: " + previousUsername + " -> " + user.getUsername() + ", department: " + previousDepartment + " -> " + normalizeDepartment(user.getDepartment())
            );
        }

        EmployerParticipationService.ParticipationSummary summary = employerParticipationService.buildSummary(user);

        return ResponseEntity.ok(new EmployerDetails(
                user.getId(),
                defaultName(user),
                user.getUsername(),
                emptyIfBlank(user.getJobTitle()),
                normalizeDepartment(user.getDepartment()),
                emptyIfBlank(user.getGrade()),
                "********",
                user.getPhotoUrl(),
                defaultLeaveDays(user.getRemainingLeaveDays()),
                summary.projects(),
                summary.eventCount(),
                summary.total()
                ,
                summary.events()
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEmployer(@PathVariable Long id, Authentication authentication) {
        User currentUser = currentUser(authentication);
        ResponseEntity<String> forbidden = ensurePlatformAdmin(currentUser);
        if (forbidden != null) {
            return forbidden;
        }

        User user = userService.findById(id).orElse(null);
        if (user == null || !canManageTarget(currentUser, user)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Employe introuvable.");
        }

        userService.delete(user);
        auditLogService.log(
                currentUser,
                "DELETE",
                "USER",
                String.valueOf(user.getId()),
                "Deleted employee " + user.getUsername()
        );
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<String> ensurePlatformAdmin(User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur non authentifie.");
        }

        if (!userService.hasPlatformAdminPrivileges(currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acces reserve a l'administrateur.");
        }

        return null;
    }

    private ResponseEntity<String> ensureEmployeeDirectoryAccess(User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur non authentifie.");
        }

        if (!userService.canAccessEmployeeDirectory(currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acces reserve au personnel autorise.");
        }

        return null;
    }

    private boolean canManageTarget(User currentUser, User targetUser) {
        if (currentUser == null || targetUser == null) {
            return false;
        }

        if (userService.isSuperAdmin(targetUser)) {
            return userService.isSuperAdmin(currentUser);
        }

        if (userService.isAdmin(targetUser)) {
            return userService.isSuperAdmin(currentUser);
        }

        return userService.hasPlatformAdminPrivileges(currentUser);
    }

    private boolean canViewTarget(User currentUser, User targetUser) {
        if (userService.hasPlatformAdminPrivileges(currentUser)) {
            return canManageTarget(currentUser, targetUser);
        }

        return userService.canViewEmployeeDetails(currentUser, targetUser);
    }

    private String resolveRoleForCreation(User currentUser, String requestedRole) {
        if (userService.isSuperAdmin(currentUser) && !requestedRole.isEmpty()) {
            return requestedRole;
        }

        return "EMPLOYEE";
    }

    private String resolveRoleForUpdate(User currentUser, User targetUser, String requestedRole) {
        String currentRole = normalizeRole(targetUser.getRole());
        if (userService.isSuperAdmin(currentUser) && !requestedRole.isEmpty()) {
            return requestedRole;
        }

        return currentRole.isEmpty() ? "EMPLOYEE" : currentRole;
    }

    private String normalizeRole(String value) {
        String normalized = normalize(value);
        if (normalized.isEmpty()) {
            return "";
        }
        return normalized.toUpperCase(Locale.ROOT).replace(' ', '_');
    }

    private ResponseEntity<String> validateCatalogValues(String department, String jobTitle) {
        if (!department.isBlank() && !catalogOptionService.existsDepartment(department)) {
            return ResponseEntity.badRequest().body("Departement inconnu. Ajoutez-le d'abord depuis les options.");
        }

        if (!jobTitle.isBlank() && !catalogOptionService.existsJobTitle(jobTitle)) {
            return ResponseEntity.badRequest().body("Role inconnu. Ajoutez-le d'abord depuis les options.");
        }

        return null;
    }

    private User currentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return userService.findByUsername(authentication.getName());
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String defaultName(User user) {
        return (user.getFullName() == null || user.getFullName().isBlank()) ? user.getUsername() : user.getFullName();
    }

    private String normalizeDepartment(String value) {
        String normalized = normalize(value);
        return normalized.isEmpty() ? "Non renseigne" : normalized.toUpperCase(Locale.ROOT);
    }

    private String emptyIfBlank(String value) {
        String normalized = normalize(value);
        return normalized.isEmpty() ? "Non renseigne" : normalized;
    }

    private String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private int defaultLeaveDays(Integer value) {
        return value == null ? User.ANNUAL_LEAVE_DAYS : Math.max(value, 0);
    }

    public static class EmployerRequest {
        private String fullName;
        private String username;
        private String password;
        private String role;
        private String department;
        private String jobTitle;
        private String grade;
        private String photoUrl;
        private Integer remainingLeaveDays;

        public String getFullName() {
            return fullName;
        }

        public void setFullName(String fullName) {
            this.fullName = fullName;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getDepartment() {
            return department;
        }

        public void setDepartment(String department) {
            this.department = department;
        }

        public String getJobTitle() {
            return jobTitle;
        }

        public void setJobTitle(String jobTitle) {
            this.jobTitle = jobTitle;
        }

        public String getPhotoUrl() {
            return photoUrl;
        }

        public void setPhotoUrl(String photoUrl) {
            this.photoUrl = photoUrl;
        }

        public String getGrade() {
            return grade;
        }

        public void setGrade(String grade) {
            this.grade = grade;
        }

        public Integer getRemainingLeaveDays() {
            return remainingLeaveDays;
        }

        public void setRemainingLeaveDays(Integer remainingLeaveDays) {
            this.remainingLeaveDays = remainingLeaveDays;
        }
    }

    public record EmployerListItem(Long id, String fullName, String username, String department, String jobTitle) {}

    public record EmployerDetails(
            Long id,
            String fullName,
            String username,
            String jobTitle,
            String department,
            String grade,
            String maskedPassword,
            String photoUrl,
            int remainingLeaveDays,
            int projectParticipationCount,
            int eventParticipationCount,
            int totalParticipationCount,
            List<EmployerParticipationService.EventParticipationItem> events
    ) {}
}
