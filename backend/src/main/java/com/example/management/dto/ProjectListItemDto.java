package com.example.management.dto;

import java.time.LocalDateTime;

public record ProjectListItemDto(
        Long id,
        String name,
        String description,
        String photoUrl,
        String participants,
        LocalDateTime createdDate,
        String createdByUsername
) {
}
