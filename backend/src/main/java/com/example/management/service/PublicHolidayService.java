package com.example.management.service;

import com.example.management.entity.PublicHoliday;
import com.example.management.repository.PublicHolidayRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.MonthDay;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class PublicHolidayService {

    private final PublicHolidayRepository publicHolidayRepository;

    public PublicHolidayService(PublicHolidayRepository publicHolidayRepository) {
        this.publicHolidayRepository = publicHolidayRepository;
    }

    public List<PublicHoliday> findAll() {
        return publicHolidayRepository.findAllByOrderByDateAscNameAsc().stream()
                .filter(holiday -> !isCompanyHoliday(holiday))
                .toList();
    }

    public Optional<PublicHoliday> findById(Long id) {
        return publicHolidayRepository.findById(id);
    }

    public PublicHoliday save(PublicHoliday holiday) {
        return publicHolidayRepository.save(holiday);
    }

    public void delete(PublicHoliday holiday) {
        publicHolidayRepository.delete(holiday);
    }

    public boolean isHoliday(LocalDate date) {
        if (date == null) {
            return false;
        }

        MonthDay monthDay = MonthDay.from(date);
        return publicHolidayRepository.findAllByActiveTrue().stream()
                .filter(holiday -> !isCompanyHoliday(holiday))
                .anyMatch(holiday -> isDateInsideHoliday(holiday, date, monthDay));
    }

    @Transactional
    public void seedDefaultMoroccoHolidays() {
        List<PublicHoliday> companyHolidays = publicHolidayRepository.findAll().stream()
                .filter(this::isCompanyHoliday)
                .toList();
        if (!companyHolidays.isEmpty()) {
            publicHolidayRepository.deleteAll(companyHolidays);
        }

        if (publicHolidayRepository.count() > 0) {
            return;
        }

        publicHolidayRepository.deleteAllByNameIn(List.of(
                "Aid Al Fitr - 2eme jour",
                "Aid Al Adha - 2eme jour",
                "Aid Al Mawlid - 2eme jour"
        ));

        List<HolidaySeed> seeds = List.of(
                new HolidaySeed("Nouvel An", LocalDate.of(2026, 1, 1), "NATIONAL", true, 1),
                new HolidaySeed("Manifeste de l'independance", LocalDate.of(2026, 1, 11), "NATIONAL", true, 1),
                new HolidaySeed("Nouvel An Amazigh", LocalDate.of(2026, 1, 14), "NATIONAL", true, 1),
                new HolidaySeed("Fete du Travail", LocalDate.of(2026, 5, 1), "NATIONAL", true, 1),
                new HolidaySeed("Fete du Trone", LocalDate.of(2026, 7, 30), "NATIONAL", true, 1),
                new HolidaySeed("Journee Oued Ed-Dahab", LocalDate.of(2026, 8, 14), "NATIONAL", true, 1),
                new HolidaySeed("Revolution du Roi et du Peuple", LocalDate.of(2026, 8, 20), "NATIONAL", true, 1),
                new HolidaySeed("Fete de la Jeunesse", LocalDate.of(2026, 8, 21), "NATIONAL", true, 1),
                new HolidaySeed("Aid Al Wahda", LocalDate.of(2026, 10, 31), "NATIONAL", true, 1),
                new HolidaySeed("Marche Verte", LocalDate.of(2026, 11, 6), "NATIONAL", true, 1),
                new HolidaySeed("Fete de l'independance", LocalDate.of(2026, 11, 18), "NATIONAL", true, 1),
                new HolidaySeed("Aid Al Fitr", LocalDate.of(2026, 3, 20), "RELIGIEUX", false, 2),
                new HolidaySeed("Aid Al Adha", LocalDate.of(2026, 5, 27), "RELIGIEUX", false, 2),
                new HolidaySeed("Nouvel An Hegirien", LocalDate.of(2026, 6, 16), "RELIGIEUX", false, 1),
                new HolidaySeed("Aid Al Mawlid", LocalDate.of(2026, 8, 25), "RELIGIEUX", false, 2)
        );

        seeds.stream()
                .sorted(Comparator.comparing(HolidaySeed::date))
                .forEach(seed -> {
                    Optional<PublicHoliday> existingHoliday = publicHolidayRepository.findAll().stream()
                            .filter(holiday -> seed.name().equals(holiday.getName()))
                            .findFirst();

                    if (existingHoliday.isPresent()) {
                        PublicHoliday holiday = existingHoliday.get();
                        holiday.setDurationDays(seed.durationDays());
                        holiday.setCategory(seed.category());
                        holiday.setRecurringAnnual(seed.recurringAnnual());
                        publicHolidayRepository.save(holiday);
                    } else if (!publicHolidayRepository.existsByNameAndDate(seed.name(), seed.date())) {
                        PublicHoliday holiday = new PublicHoliday();
                        holiday.setName(seed.name());
                        holiday.setDate(seed.date());
                        holiday.setCategory(seed.category());
                        holiday.setDurationDays(seed.durationDays());
                        holiday.setRecurringAnnual(seed.recurringAnnual());
                        holiday.setActive(true);
                        publicHolidayRepository.save(holiday);
                    }
                });
    }

    private boolean isCompanyHoliday(PublicHoliday holiday) {
        return holiday.getCategory() != null && "ENTREPRISE".equalsIgnoreCase(holiday.getCategory());
    }

    private boolean isDateInsideHoliday(PublicHoliday holiday, LocalDate date, MonthDay monthDay) {
        int durationDays = Math.max(holiday.getDurationDays() == null ? 1 : holiday.getDurationDays(), 1);
        Set<MonthDay> recurringDays = java.util.stream.IntStream.range(0, durationDays)
                .mapToObj(index -> MonthDay.from(holiday.getDate().plusDays(index)))
                .collect(java.util.stream.Collectors.toSet());

        if (holiday.isRecurringAnnual()) {
            return recurringDays.contains(monthDay);
        }

        LocalDate endDate = holiday.getDate().plusDays(durationDays - 1L);
        return !date.isBefore(holiday.getDate()) && !date.isAfter(endDate);
    }

    private record HolidaySeed(String name, LocalDate date, String category, boolean recurringAnnual, int durationDays) {}
}
