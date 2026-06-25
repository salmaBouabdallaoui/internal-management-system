package com.example.management.service;

import com.example.management.entity.User;
import com.example.management.entity.Event;
import com.example.management.repository.EventCommentRepository;
import com.example.management.repository.EventRepository;
import com.example.management.repository.LeaveRequestRepository;
import com.example.management.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class UserService {

    private static final int MAX_FAILED_LOGIN_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventCommentRepository eventCommentRepository;

    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    public User save(User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getFailedLoginAttempts() == null) {
            user.setFailedLoginAttempts(0);
        }
        if (user.getForcePasswordChange() == null) {
            user.setForcePasswordChange(true);
        }
        return userRepository.save(user);
    }

    public User saveWithoutPasswordChange(User user) {
        return userRepository.save(user);
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username).orElse(null);
    }

    public boolean isAdmin(User user) {
        return user != null && "ADMIN".equalsIgnoreCase(user.getRole());
    }

    public boolean isSuperAdmin(User user) {
        return user != null && "SUPER_ADMIN".equalsIgnoreCase(user.getRole());
    }

    public boolean hasPlatformAdminPrivileges(User user) {
        return isAdmin(user) || isSuperAdmin(user);
    }

    public List<User> findManageableUsers(User currentUser) {
        boolean superAdmin = isSuperAdmin(currentUser);

        return userRepository.findAll().stream()
                .filter(user -> user.getId() == null || currentUser == null || !user.getId().equals(currentUser.getId()))
                .filter(user -> superAdmin || !isAdmin(user) && !isSuperAdmin(user))
                .sorted(Comparator.comparing(User::getId))
                .collect(Collectors.toList());
    }

    public boolean canAccessEmployeeDirectory(User user) {
        return hasPlatformAdminPrivileges(user) || isDivisionChief(user) || isServiceChief(user);
    }

    public List<User> findVisibleEmployees(User currentUser) {
        if (currentUser == null) {
            return List.of();
        }

        if (hasPlatformAdminPrivileges(currentUser)) {
            return findManageableUsers(currentUser);
        }

        if (!canAccessEmployeeDirectory(currentUser)) {
            return List.of();
        }

        String department = normalize(currentUser.getDepartment());
        if (department.isEmpty()) {
            return List.of();
        }

        return findEmployees().stream()
                .filter(user -> user.getId() == null || !user.getId().equals(currentUser.getId()))
                .filter(user -> normalize(user.getDepartment()).equals(department))
                .sorted(Comparator.comparing(User::getId))
                .collect(Collectors.toList());
    }

    public boolean canViewEmployeeDetails(User currentUser, User targetUser) {
        if (currentUser == null || targetUser == null) {
            return false;
        }

        if (hasPlatformAdminPrivileges(currentUser)) {
            return true;
        }

        if (!canAccessEmployeeDirectory(currentUser)) {
            return false;
        }

        if (isAdmin(targetUser) || isSuperAdmin(targetUser)) {
            return false;
        }

        return normalize(currentUser.getDepartment()).equals(normalize(targetUser.getDepartment()));
    }

    public boolean isLocked(User user) {
        return user != null && user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now());
    }

    public int remainingLockoutMinutes(User user) {
        if (!isLocked(user)) {
            return 0;
        }

        long seconds = java.time.Duration.between(LocalDateTime.now(), user.getLockedUntil()).toSeconds();
        return Math.max(1, (int) Math.ceil(seconds / 60.0));
    }

    public User recordFailedLogin(User user) {
        if (user == null) {
            return null;
        }

        int attempts = user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts();
        attempts += 1;
        user.setFailedLoginAttempts(attempts);

        if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
            user.setLockedUntil(LocalDateTime.now().plusMinutes(LOCKOUT_MINUTES));
        }

        return userRepository.save(user);
    }

    public User resetLoginFailures(User user) {
        if (user == null) {
            return null;
        }

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        return userRepository.save(user);
    }

    public User changePassword(User user, String rawPassword) {
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setForcePasswordChange(false);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        return userRepository.save(user);
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public List<User> findEmployees() {
        return userRepository.findAll().stream()
                .filter(user -> user.getRole() == null || (!"ADMIN".equalsIgnoreCase(user.getRole()) && !"SUPER_ADMIN".equalsIgnoreCase(user.getRole())))
                .sorted(Comparator.comparing(User::getId))
                .collect(Collectors.toList());
    }

    public List<User> findDivisionChiefsByDepartment(String department) {
        String normalizedDepartment = normalize(department);
        return userRepository.findAll().stream()
                .filter(this::isDivisionChief)
                .filter(user -> normalize(user.getDepartment()).equals(normalizedDepartment))
                .sorted(Comparator.comparing(User::getId))
                .collect(Collectors.toList());
    }

    public List<User> findServiceChiefsByDepartment(String department) {
        String normalizedDepartment = normalize(department);
        return userRepository.findAll().stream()
                .filter(this::isServiceChief)
                .filter(user -> normalize(user.getDepartment()).equals(normalizedDepartment))
                .sorted(Comparator.comparing(User::getId))
                .collect(Collectors.toList());
    }

    public List<User> findLeaveApprovalReviewersByDepartment(String department) {
        LocalDate today = LocalDate.now();
        List<User> divisionChiefs = findDivisionChiefsByDepartment(department);
        List<User> availableDivisionChiefs = divisionChiefs.stream()
                .filter(user -> !isOnApprovedLeave(user, today))
                .collect(Collectors.toList());

        if (!availableDivisionChiefs.isEmpty()) {
            return availableDivisionChiefs;
        }

        if (divisionChiefs.isEmpty()) {
            return List.of();
        }

        return findServiceChiefsByDepartment(department).stream()
                .filter(user -> !isOnApprovedLeave(user, today))
                .collect(Collectors.toList());
    }

    public boolean hasLeaveApproverForDepartment(String department, User requester) {
        Long requesterId = requester == null ? null : requester.getId();
        return findLeaveApprovalReviewersByDepartment(department).stream()
                .anyMatch(candidate -> requesterId == null || !candidate.getId().equals(requesterId));
    }

    public boolean shouldBypassDepartmentApproval(User requester, String department) {
        if (requester == null) {
            return false;
        }

        if (isDivisionChief(requester)) {
            return true;
        }

        if (isServiceChief(requester)) {
            return areAllDivisionChiefsAbsent(department, LocalDate.now());
        }

        return false;
    }

    public boolean canSubmitLeaveRequest(User requester, String department) {
        if (shouldBypassDepartmentApproval(requester, department)) {
            return true;
        }

        return hasLeaveApproverForDepartment(department, requester);
    }

    public String resolveInitialLeaveStatus(User requester, String department) {
        return shouldBypassDepartmentApproval(requester, department) ? "PENDING_HR" : "PENDING";
    }

    public boolean areAllDivisionChiefsAbsent(String department, LocalDate date) {
        List<User> divisionChiefs = findDivisionChiefsByDepartment(department);
        return !divisionChiefs.isEmpty() && divisionChiefs.stream()
                .allMatch(divisionChief -> isOnApprovedLeave(divisionChief, date));
    }

    public boolean canReviewLeaveApprovals(User user) {
        if (user == null || normalize(user.getDepartment()).isEmpty()) {
            return false;
        }

        LocalDate today = LocalDate.now();
        if (isDivisionChief(user)) {
            return !isOnApprovedLeave(user, today);
        }

        if (!isServiceChief(user) || isOnApprovedLeave(user, today)) {
            return false;
        }

        List<User> divisionChiefs = findDivisionChiefsByDepartment(user.getDepartment());
        return !divisionChiefs.isEmpty() && divisionChiefs.stream()
                .allMatch(divisionChief -> isOnApprovedLeave(divisionChief, today));
    }

    public boolean isDivisionChief(User user) {
        if (user == null) {
            return false;
        }

        String normalizedJobTitle = normalize(user.getJobTitle());
        return normalizedJobTitle.contains("chef de division");
    }

    public boolean isServiceChief(User user) {
        if (user == null) {
            return false;
        }

        String normalizedJobTitle = normalize(user.getJobTitle());
        return normalizedJobTitle.contains("chef de service");
    }

    public boolean isOnApprovedLeave(User user, LocalDate date) {
        if (user == null || user.getId() == null || date == null) {
            return false;
        }

        return leaveRequestRepository.existsRequesterLeaveCoveringDate(user.getId(), "APPROVED", date);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    @Transactional
    public void delete(User user) {
        leaveRequestRepository.clearReviewerReferences(user.getId());
        leaveRequestRepository.deleteAllByRequesterId(user.getId());
        eventCommentRepository.deleteAllByCreatedById(user.getId());

        for (Event event : eventRepository.findAll()) {
            boolean participantsChanged = event.getParticipantUsers().removeIf(participant -> participant.getId().equals(user.getId()));
            boolean creatorChanged = event.getCreatedBy() != null && event.getCreatedBy().getId().equals(user.getId());

            if (creatorChanged) {
                event.setCreatedBy(null);
            }

            if (participantsChanged || creatorChanged) {
                eventRepository.save(event);
            }
        }

        userRepository.delete(user);
    }
}
