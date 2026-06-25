package com.example.management.controller;

import com.example.management.entity.PublicHoliday;
import com.example.management.entity.User;
import com.example.management.service.PublicHolidayService;
import com.example.management.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/holidays")
public class PublicHolidayController {

    private final PublicHolidayService publicHolidayService;
    private final UserService userService;

    public PublicHolidayController(PublicHolidayService publicHolidayService, UserService userService) {
        this.publicHolidayService = publicHolidayService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<?> listHolidays() {
        List<PublicHolidayItem> holidays = publicHolidayService.findAll().stream()
                .map(this::toItem)
                .toList();

        return ResponseEntity.ok(holidays);
    }

    @PostMapping
    public ResponseEntity<?> createHoliday(@RequestBody HolidayRequest request, Authentication authentication) {
        ResponseEntity<String> forbidden = ensureAdmin(authentication);
        if (forbidden != null) {
            return forbidden;
        }

        ResponseEntity<String> invalid = validate(request);
        if (invalid != null) {
            return invalid;
        }

        PublicHoliday holiday = new PublicHoliday();
        applyRequest(holiday, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toItem(publicHolidayService.save(holiday)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateHoliday(
            @PathVariable Long id,
            @RequestBody HolidayRequest request,
            Authentication authentication
    ) {
        ResponseEntity<String> forbidden = ensureAdmin(authentication);
        if (forbidden != null) {
            return forbidden;
        }

        ResponseEntity<String> invalid = validate(request);
        if (invalid != null) {
            return invalid;
        }

        PublicHoliday holiday = publicHolidayService.findById(id).orElse(null);
        if (holiday == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Jour ferie introuvable.");
        }

        applyRequest(holiday, request);
        return ResponseEntity.ok(toItem(publicHolidayService.save(holiday)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteHoliday(@PathVariable Long id, Authentication authentication) {
        ResponseEntity<String> forbidden = ensureAdmin(authentication);
        if (forbidden != null) {
            return forbidden;
        }

        PublicHoliday holiday = publicHolidayService.findById(id).orElse(null);
        if (holiday == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Jour ferie introuvable.");
        }

        publicHolidayService.delete(holiday);
        return ResponseEntity.noContent().build();
    }

    private void applyRequest(PublicHoliday holiday, HolidayRequest request) {
        holiday.setName(normalize(request.getName()));
        holiday.setDate(request.getDate());
        holiday.setCategory(normalizeCategory(request.getCategory()));
        holiday.setDurationDays(normalizeDuration(request.getDurationDays()));
        holiday.setRecurringAnnual(request.isRecurringAnnual());
        holiday.setActive(request.isActive());
    }

    private ResponseEntity<String> validate(HolidayRequest request) {
        if (request == null) {
            return ResponseEntity.badRequest().body("Donnees manquantes.");
        }

        if (normalize(request.getName()).isEmpty()) {
            return ResponseEntity.badRequest().body("Le nom du jour ferie est obligatoire.");
        }

        if (request.getDate() == null) {
            return ResponseEntity.badRequest().body("La date du jour ferie est obligatoire.");
        }

        if (normalizeDuration(request.getDurationDays()) < 1) {
            return ResponseEntity.badRequest().body("La duree doit etre superieure ou egale a 1 jour.");
        }

        String category = normalizeCategory(request.getCategory());
        if (!"NATIONAL".equals(category) && !"RELIGIEUX".equals(category)) {
            return ResponseEntity.badRequest().body("Categorie de jour ferie invalide.");
        }

        return null;
    }

    private ResponseEntity<String> ensureAdmin(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur non authentifie.");
        }

        User currentUser = userService.findByUsername(authentication.getName());
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur introuvable.");
        }

        if (currentUser.getRole() == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acces reserve a l'administrateur.");
        }

        return null;
    }

    private PublicHolidayItem toItem(PublicHoliday holiday) {
        return new PublicHolidayItem(
                holiday.getId(),
                holiday.getName(),
                holiday.getDate(),
                holiday.getCategory(),
                holiday.getDurationDays() == null ? 1 : holiday.getDurationDays(),
                holiday.isRecurringAnnual(),
                holiday.isActive()
        );
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeCategory(String value) {
        String normalized = normalize(value).toUpperCase(Locale.ROOT);
        return normalized.isEmpty() ? "NATIONAL" : normalized;
    }

    private int normalizeDuration(Integer value) {
        return value == null ? 1 : Math.max(value, 1);
    }

    public static class HolidayRequest {
        private String name;
        private LocalDate date;
        private String category;
        private Integer durationDays = 1;
        private boolean recurringAnnual;
        private boolean active = true;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public LocalDate getDate() { return date; }
        public void setDate(LocalDate date) { this.date = date; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public Integer getDurationDays() { return durationDays; }
        public void setDurationDays(Integer durationDays) { this.durationDays = durationDays; }

        public boolean isRecurringAnnual() { return recurringAnnual; }
        public void setRecurringAnnual(boolean recurringAnnual) { this.recurringAnnual = recurringAnnual; }

        public boolean isActive() { return active; }
        public void setActive(boolean active) { this.active = active; }
    }

    public record PublicHolidayItem(
            Long id,
            String name,
            LocalDate date,
            String category,
            int durationDays,
            boolean recurringAnnual,
            boolean active
    ) {}
}
