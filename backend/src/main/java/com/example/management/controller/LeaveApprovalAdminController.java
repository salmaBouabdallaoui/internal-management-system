package com.example.management.controller;

import com.example.management.entity.LeaveRequest;
import com.example.management.entity.User;
import com.example.management.service.LeaveRequestService;
import com.example.management.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Locale;

@RestController
@RequestMapping("/api/admin/leave-approvals")
public class LeaveApprovalAdminController {

    private final LeaveRequestService leaveRequestService;
    private final UserService userService;

    public LeaveApprovalAdminController(LeaveRequestService leaveRequestService, UserService userService) {
        this.leaveRequestService = leaveRequestService;
        this.userService = userService;
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> reviewRequest(
            @PathVariable Long id,
            @RequestBody ReviewLeaveApprovalRequest payload,
            Authentication authentication
    ) {
        User reviewer = authenticatedUser(authentication);
        if (reviewer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur introuvable.");
        }

        if (!userService.canReviewLeaveApprovals(reviewer)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acces reserve au chef de division, ou au chef de service si le chef de division est en conge.");
        }

        String action = normalize(payload.getAction()).toUpperCase(Locale.ROOT);
        if (action.isEmpty()) {
            action = normalize(payload.getDecision()).toUpperCase(Locale.ROOT);
        }
        if (!"APPROVED".equals(action) && !"REFUSED".equals(action)) {
            return ResponseEntity.badRequest().body("Action de validation invalide.");
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

        leaveRequest.setStatus("APPROVED".equals(action) ? "PENDING_HR" : action);
        leaveRequest.setReviewer(reviewer);
        leaveRequest.setReviewerName(displayName(reviewer));
        leaveRequest.setReviewedAt(LocalDateTime.now());
        leaveRequestService.save(leaveRequest);

        return ResponseEntity.ok().build();
    }

    private User authenticatedUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return userService.findByUsername(authentication.getName());
    }

    private String displayName(User user) {
        String fullName = normalize(user.getFullName());
        return fullName.isEmpty() ? user.getUsername() : fullName;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    public static class ReviewLeaveApprovalRequest {
        private String action;
        private String decision;

        public String getAction() { return action; }
        public void setAction(String action) { this.action = action; }

        public String getDecision() { return decision; }
        public void setDecision(String decision) { this.decision = decision; }
    }
}
