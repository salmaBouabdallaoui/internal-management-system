package com.example.management.dto;

import java.time.LocalDateTime;

public record EventListItemDto(
        Long id,
        String title,
        String description,
        String type,
        String location,
        String organizer,
        LocalDateTime startDate,
        LocalDateTime endDate,
        String photoUrl,
        Integer participantLimit,
        String createdByUsername,
        long participantCount
) {
}
