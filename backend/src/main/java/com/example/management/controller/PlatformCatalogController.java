package com.example.management.controller;

import com.example.management.entity.PlatformCatalogOption;
import com.example.management.entity.User;
import com.example.management.service.AuditLogService;
import com.example.management.service.PlatformCatalogOptionService;
import com.example.management.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/catalog-options")
public class PlatformCatalogController {

    private final PlatformCatalogOptionService catalogOptionService;
    private final UserService userService;
    private final AuditLogService auditLogService;

    public PlatformCatalogController(PlatformCatalogOptionService catalogOptionService, UserService userService, AuditLogService auditLogService) {
        this.catalogOptionService = catalogOptionService;
        this.userService = userService;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ResponseEntity<?> list(Authentication authentication) {
        User currentUser = currentUser(authentication);
        ResponseEntity<String> forbidden = ensurePlatformAdmin(currentUser);
        if (forbidden != null) {
            return forbidden;
        }

        return ResponseEntity.ok(new CatalogOptionsResponse(
                catalogOptionService.findDepartments(),
                catalogOptionService.findJobTitles()
        ));
    }

    @PostMapping("/departments")
    public ResponseEntity<?> addDepartment(@RequestBody OptionRequest request, Authentication authentication) {
        User currentUser = currentUser(authentication);
        ResponseEntity<String> forbidden = ensurePlatformAdmin(currentUser);
        if (forbidden != null) {
            return forbidden;
        }

        try {
            PlatformCatalogOption option = catalogOptionService.addDepartment(valueOf(request));
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "message", "Departement ajoute.",
                    "value", option.getOptionValue()
            ));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(exception.getMessage());
        }
    }

    @PostMapping("/job-titles")
    public ResponseEntity<?> addJobTitle(@RequestBody OptionRequest request, Authentication authentication) {
        User currentUser = currentUser(authentication);
        ResponseEntity<String> forbidden = ensurePlatformAdmin(currentUser);
        if (forbidden != null) {
            return forbidden;
        }

        try {
            PlatformCatalogOption option = catalogOptionService.addJobTitle(valueOf(request));
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "message", "Role ajoute.",
                    "value", option.getOptionValue()
            ));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(exception.getMessage());
        }
    }

    @DeleteMapping("/departments/{value}")
    public ResponseEntity<?> deleteDepartment(@PathVariable String value, Authentication authentication) {
        User currentUser = currentUser(authentication);
        ResponseEntity<String> forbidden = ensurePlatformAdmin(currentUser);
        if (forbidden != null) {
            return forbidden;
        }

        try {
            PlatformCatalogOption option = catalogOptionService.deleteDepartment(value);
            auditLogService.log(
                    currentUser,
                    "DELETE",
                    "CATALOG_OPTION",
                    String.valueOf(option.getId()),
                    "Deleted department " + option.getOptionValue()
            );
            return ResponseEntity.ok(Map.of(
                    "message", "Departement supprime.",
                    "value", option.getOptionValue()
            ));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(exception.getMessage());
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(exception.getMessage());
        }
    }

    @DeleteMapping("/job-titles/{value}")
    public ResponseEntity<?> deleteJobTitle(@PathVariable String value, Authentication authentication) {
        User currentUser = currentUser(authentication);
        ResponseEntity<String> forbidden = ensurePlatformAdmin(currentUser);
        if (forbidden != null) {
            return forbidden;
        }

        try {
            PlatformCatalogOption option = catalogOptionService.deleteJobTitle(value);
            auditLogService.log(
                    currentUser,
                    "DELETE",
                    "CATALOG_OPTION",
                    String.valueOf(option.getId()),
                    "Deleted job title " + option.getOptionValue()
            );
            return ResponseEntity.ok(Map.of(
                    "message", "Role supprime.",
                    "value", option.getOptionValue()
            ));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(exception.getMessage());
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(exception.getMessage());
        }
    }

    private String valueOf(OptionRequest request) {
        return request == null || request.getValue() == null ? "" : request.getValue().trim();
    }

    private User currentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return userService.findByUsername(authentication.getName());
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

    public static class OptionRequest {
        private String value;

        public String getValue() {
            return value;
        }

        public void setValue(String value) {
            this.value = value;
        }
    }

    public record CatalogOptionsResponse(List<String> departments, List<String> jobTitles) {}
}
