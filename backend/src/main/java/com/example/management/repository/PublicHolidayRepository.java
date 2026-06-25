package com.example.management.repository;

import com.example.management.entity.PublicHoliday;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface PublicHolidayRepository extends JpaRepository<PublicHoliday, Long> {
    boolean existsByNameAndDate(String name, LocalDate date);
    List<PublicHoliday> findAllByActiveTrue();
    List<PublicHoliday> findAllByOrderByDateAscNameAsc();
    void deleteAllByNameIn(List<String> names);
}
