package com.example.management.controller;

import com.example.management.entity.User;
import com.example.management.security.JwtUtil;
import com.example.management.service.AuditLogService;
import com.example.management.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserService userService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuditLogService auditLogService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        String username = loginRequest.getUsername() != null ? loginRequest.getUsername().trim() : "";
        String password = loginRequest.getPassword() != null ? loginRequest.getPassword().trim() : "";

        if (username.isEmpty() || password.isEmpty()) {
            return ResponseEntity.badRequest().body("Username and password are required");
        }

        User existingUser = userService.findByUsername(username);
        if (existingUser != null && userService.isLocked(existingUser)) {
            return ResponseEntity.status(HttpStatus.LOCKED)
                    .body("Account locked. Try again in " + userService.remainingLockoutMinutes(existingUser) + " minute(s).");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
            );

            User user = userService.findByUsername(username);
            if (user == null) {
                return ResponseEntity.status(401).body("User not found");
            }

            userService.resetLoginFailures(user);
            String role = user.getRole() == null ? "EMPLOYEE" : user.getRole();

            String token = jwtUtil.generateToken(
                    username,
                    Map.of("role", role)
            );
            return ResponseEntity.ok(buildSessionResponse(user, token));
        } catch (AuthenticationException e) {
            if (existingUser != null) {
                User updatedUser = userService.recordFailedLogin(existingUser);
                if (userService.isLocked(updatedUser)) {
                    return ResponseEntity.status(HttpStatus.LOCKED)
                            .body("Too many failed login attempts. Account locked for 15 minutes.");
                }
                int remainingAttempts = 5 - (updatedUser.getFailedLoginAttempts() == null ? 0 : updatedUser.getFailedLoginAttempts());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Invalid credentials. " + Math.max(0, remainingAttempts) + " attempt(s) remaining.");
            }
            return ResponseEntity.status(401).body("Invalid credentials");
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        User user = authenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur introuvable.");
        }

        return ResponseEntity.ok(buildSessionResponse(user, null));
    }

    @PutMapping("/me")
    @Transactional
    public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileRequest request, Authentication authentication) {
        User user = authenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur introuvable.");
        }

        if (request == null) {
            return ResponseEntity.badRequest().body("Les donnees du profil sont obligatoires.");
        }

        user.setPhoneNumber(trimToNull(request.getPhoneNumber()));
        user.setEmail(trimToNull(request.getEmail()));
        user = userService.saveWithoutPasswordChange(user);

        return ResponseEntity.ok(buildSessionResponse(user, null));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request, Authentication authentication) {
        User user = authenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur introuvable.");
        }

        if (request == null) {
            return ResponseEntity.badRequest().body("Les mots de passe sont obligatoires.");
        }

        String currentPassword = request.getCurrentPassword() != null ? request.getCurrentPassword().trim() : "";
        String newPassword = request.getNewPassword() != null ? request.getNewPassword().trim() : "";

        if (currentPassword.isEmpty() || newPassword.isEmpty()) {
            return ResponseEntity.badRequest().body("Les mots de passe sont obligatoires.");
        }

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Mot de passe actuel invalide.");
        }

        userService.changePassword(user, newPassword);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody(required = false) LogoutRequest request, Authentication authentication) {
        User user = authenticatedUser(authentication);
        if (user != null) {
            String reason = request != null && request.getReason() != null ? request.getReason().trim() : "MANUAL";
            boolean forceLogout = request != null && Boolean.TRUE.equals(request.getForceLogout());
            String action = forceLogout || "INACTIVITY".equalsIgnoreCase(reason) ? "FORCE_LOGOUT" : "LOGOUT";
            auditLogService.log(user, action, "SESSION", user.getUsername(), reason.isEmpty() ? null : reason);
        }

        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest registerRequest) {
        String username = registerRequest.getUsername() != null ? registerRequest.getUsername().trim() : "";
        String password = registerRequest.getPassword() != null ? registerRequest.getPassword().trim() : "";

        if (username.isEmpty()) {
            return ResponseEntity.badRequest().body("Username is required");
        }

        if (userService.findByUsername(username) != null) {
            return ResponseEntity.badRequest().body("Username already exists");
        }
        User user = new User(username, username, password, "EMPLOYEE");
        userService.save(user);
        return ResponseEntity.ok("User registered successfully");
    }

    private User authenticatedUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return userService.findByUsername(authentication.getName());
    }

    public static class LoginRequest {
        private String username;
        private String password;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class RegisterRequest {
        private String username;
        private String password;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class ChangePasswordRequest {
        private String currentPassword;
        private String newPassword;

        public String getCurrentPassword() { return currentPassword; }
        public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }

    public static class LogoutRequest {
        private Boolean forceLogout;
        private String reason;

        public Boolean getForceLogout() { return forceLogout; }
        public void setForceLogout(Boolean forceLogout) { this.forceLogout = forceLogout; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class UpdateProfileRequest {
        private String phoneNumber;
        private String email;

        public String getPhoneNumber() { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }

    private Map<String, Object> buildSessionResponse(User user, String token) {
        Map<String, Object> response = new HashMap<>();
        if (token != null) {
            response.put("token", token);
        }
        response.put("role", user.getRole() == null ? "EMPLOYEE" : user.getRole());
        response.put("username", user.getUsername());
        response.put("fullName", user.getFullName());
        response.put("jobTitle", user.getJobTitle());
        response.put("department", user.getDepartment());
        response.put("phoneNumber", user.getPhoneNumber());
        response.put("email", user.getEmail());
        response.put("forcePasswordChange", Boolean.TRUE.equals(user.getForcePasswordChange()));
        return response;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
