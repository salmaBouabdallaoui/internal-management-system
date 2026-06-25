package com.example.management.entity;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "public_holidays")
public class PublicHoliday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String category;

    @Column(name = "duration_days")
    private Integer durationDays = 1;

    @Column(nullable = false)
    private boolean recurringAnnual = false;

    @Column(nullable = false)
    private boolean active = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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
