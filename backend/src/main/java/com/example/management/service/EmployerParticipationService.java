package com.example.management.service;

import com.example.management.entity.Event;
import com.example.management.entity.Project;
import com.example.management.entity.User;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class EmployerParticipationService {

    private final ProjectService projectService;
    private final EventService eventService;

    public EmployerParticipationService(ProjectService projectService, EventService eventService) {
        this.projectService = projectService;
        this.eventService = eventService;
    }

    public ParticipationSummary buildSummary(User user) {
        long projectCount = projectService.findAll().stream()
                .filter(project -> projectContainsUser(project, user))
                .count();

        List<EventParticipationItem> eventParticipations = eventService.findAll().stream()
                .filter(event -> eventContainsUser(event, user))
                .map(event -> new EventParticipationItem(event.getId(), event.getTitle()))
                .collect(Collectors.toList());

        return new ParticipationSummary((int) projectCount, eventParticipations);
    }

    private boolean projectContainsUser(Project project, User user) {
        return tokenize(project.getParticipants()).stream()
                .anyMatch(token -> matchesUserToken(token, user));
    }

    private boolean eventContainsUser(Event event, User user) {
        return event.getParticipantUsers() != null
                && event.getParticipantUsers().stream().anyMatch(participant -> participant.getId().equals(user.getId()));
    }

    private List<String> tokenize(String rawParticipants) {
        if (rawParticipants == null || rawParticipants.isBlank()) {
            return List.of();
        }

        return Arrays.stream(rawParticipants.split("[,;\\n\\r]+"))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();
    }

    private boolean matchesUserToken(String token, User user) {
        String normalizedToken = normalize(token);
        return normalizedToken.equals(normalize(user.getUsername()))
                || normalizedToken.equals(normalize(user.getFullName()));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    public record EventParticipationItem(Long id, String title) {}

    public record ParticipationSummary(int projects, List<EventParticipationItem> events) {
        public int eventCount() {
            return events != null ? events.size() : 0;
        }

        public int total() {
            return projects + eventCount();
        }
    }
}
