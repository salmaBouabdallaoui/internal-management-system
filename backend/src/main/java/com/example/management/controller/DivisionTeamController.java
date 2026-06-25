package com.example.management.controller;

import com.example.management.entity.User;
import com.example.management.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/division")
public class DivisionTeamController {

    private final UserService userService;

    public DivisionTeamController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/employees")
    public ResponseEntity<?> listDivisionEmployees(Authentication authentication) {
        User currentUser = currentUser(authentication);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur non authentifie.");
        }

        if (!userService.isDivisionChief(currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acces reserve au chef de division.");
        }

        String department = currentUser.getDepartment();
        List<DivisionEmployeeItem> employees = userService.findEmployees().stream()
                .filter(user -> user.getId() == null || !user.getId().equals(currentUser.getId()))
                .filter(user -> normalize(user.getDepartment()).equalsIgnoreCase(normalize(department)))
                .map(user -> new DivisionEmployeeItem(
                        user.getId(),
                        defaultName(user),
                        user.getUsername(),
                        normalizeOrFallback(user.getJobTitle()),
                        normalizeOrFallback(user.getGrade())
                ))
                .toList();

        return ResponseEntity.ok(employees);
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

    private String normalizeOrFallback(String value) {
        String normalized = normalize(value);
        return normalized.isEmpty() ? "Non renseigne" : normalized;
    }

    private String defaultName(User user) {
        return (user.getFullName() == null || user.getFullName().isBlank()) ? user.getUsername() : user.getFullName();
    }

    public record DivisionEmployeeItem(
            Long id,
            String fullName,
            String username,
            String jobTitle,
            String grade
    ) {}
}
