package com.example.management.controller;

import com.example.management.dto.EventListItemDto;
import com.example.management.entity.Event;
import com.example.management.entity.EventComment;
import com.example.management.entity.User;
import com.example.management.service.EventService;
import com.example.management.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
public class EventController {

    @Autowired
    private EventService eventService;

    @Autowired
    private UserService userService;

    @GetMapping
    public List<EventListItemDto> getAllEvents() {
        return eventService.findAllSummaries();
    }

    @PostMapping
    public ResponseEntity<?> createEvent(@RequestBody Event event, Authentication authentication) {
        String username = authentication.getName();
        User user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }
        Event savedEvent = eventService.save(event, user);
        return ResponseEntity.ok(savedEvent);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Event> getEventById(@PathVariable Long id) {
        Event event = eventService.findById(id);
        if (event == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(event);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateEvent(@PathVariable Long id, @RequestBody Event eventInput) {
        Event event = eventService.findById(id);
        if (event == null) {
            return ResponseEntity.notFound().build();
        }

        Event updatedEvent = eventService.update(event, eventInput);
        return ResponseEntity.ok(updatedEvent);
    }

    @PostMapping("/{id}/participate")
    public ResponseEntity<?> participate(@PathVariable Long id, Authentication authentication) {
        Event event = eventService.findById(id);
        if (event == null) {
            return ResponseEntity.notFound().build();
        }

        String username = authentication.getName();
        User user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        try {
            Event updatedEvent = eventService.addParticipant(event, user);
            return ResponseEntity.ok(updatedEvent);
        } catch (IllegalStateException exception) {
            return ResponseEntity.badRequest().body(exception.getMessage());
        }
    }

    @DeleteMapping("/{id}/participate")
    public ResponseEntity<?> cancelParticipation(@PathVariable Long id, Authentication authentication) {
        Event event = eventService.findById(id);
        if (event == null) {
            return ResponseEntity.notFound().build();
        }

        String username = authentication.getName();
        User user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        try {
            Event updatedEvent = eventService.removeParticipant(event, user);
            return ResponseEntity.ok(updatedEvent);
        } catch (IllegalStateException exception) {
            return ResponseEntity.badRequest().body(exception.getMessage());
        }
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<EventComment>> getComments(@PathVariable Long id) {
        Event event = eventService.findById(id);
        if (event == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(eventService.findCommentsByEventId(id));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<?> addComment(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload,
            Authentication authentication
    ) {
        Event event = eventService.findById(id);
        if (event == null) {
            return ResponseEntity.notFound().build();
        }

        String username = authentication.getName();
        User user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        String content = payload.getOrDefault("content", "").trim();
        if (content.isEmpty()) {
            return ResponseEntity.badRequest().body("Comment content is required");
        }

        EventComment comment = eventService.addComment(event, user, content);
        return ResponseEntity.ok(comment);
    }

    @DeleteMapping("/{id}/comments/{commentId}")
    public ResponseEntity<?> deleteComment(
            @PathVariable Long id,
            @PathVariable Long commentId,
            Authentication authentication
    ) {
        Event event = eventService.findById(id);
        if (event == null) {
            return ResponseEntity.notFound().build();
        }

        EventComment comment = eventService.findCommentById(commentId);
        if (comment == null || comment.getEvent() == null || !comment.getEvent().getId().equals(id)) {
            return ResponseEntity.notFound().build();
        }

        String username = authentication.getName();
        User user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        boolean isAuthor = comment.getCreatedBy() != null && comment.getCreatedBy().getId().equals(user.getId());
        boolean isAdmin = "ADMIN".equalsIgnoreCase(user.getRole());
        if (!isAuthor && !isAdmin) {
            return ResponseEntity.status(403).body("You cannot delete this comment");
        }

        eventService.deleteComment(comment);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        Event event = eventService.findById(id);
        if (event == null) {
            return ResponseEntity.notFound().build();
        }
        eventService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
