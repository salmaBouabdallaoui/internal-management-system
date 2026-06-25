package com.example.management.service;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Service
public class ApplicationUptimeService {

    private volatile Instant startedAt = Instant.now();

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        startedAt = Instant.now();
    }

    public Duration getUptime() {
        return Duration.between(startedAt, Instant.now());
    }

    public String formatUptime() {
        Duration uptime = getUptime();
        long totalSeconds = Math.max(0, uptime.getSeconds());
        long days = totalSeconds / 86_400;
        long hours = (totalSeconds % 86_400) / 3_600;
        long minutes = (totalSeconds % 3_600) / 60;

        if (days > 0) {
            return days + "d " + String.format("%02dh %02dm", hours, minutes);
        }

        return String.format("%02dh %02dm", hours, minutes);
    }
}
