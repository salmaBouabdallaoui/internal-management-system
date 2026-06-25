package com.example.management.service;

import com.example.management.dto.EventListItemDto;
import com.example.management.entity.Event;
import com.example.management.entity.EventComment;
import com.example.management.entity.User;
import com.example.management.repository.EventCommentRepository;
import com.example.management.repository.EventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class EventService {

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventCommentRepository eventCommentRepository;

    public List<Event> findAll() {
        return eventRepository.findAllByOrderByStartDateAsc();
    }

    public List<EventListItemDto> findAllSummaries() {
        return eventRepository.findAllSummaries();
    }

    public Event save(Event event, User user) {
        event.setCreatedBy(user);
        if (event.getParticipantLimit() == null || event.getParticipantLimit() < 1) {
            event.setParticipantLimit(50);
        }
        return eventRepository.save(event);
    }

    public Event findById(Long id) {
        return eventRepository.findById(id).orElse(null);
    }

    public Event update(Event existingEvent, Event input) {
        existingEvent.setTitle(input.getTitle());
        existingEvent.setDescription(input.getDescription());
        existingEvent.setType(input.getType());
        existingEvent.setLocation(input.getLocation());
        existingEvent.setOrganizer(input.getOrganizer());
        existingEvent.setStartDate(input.getStartDate());
        existingEvent.setEndDate(input.getEndDate());
        existingEvent.setProgramme(input.getProgramme());
        existingEvent.setTargetAudience(input.getTargetAudience());
        existingEvent.setGalleryPhotos(input.getGalleryPhotos());
        existingEvent.setResourceLinks(input.getResourceLinks());
        existingEvent.setPhotoUrl(input.getPhotoUrl());

        if (input.getParticipantLimit() != null && input.getParticipantLimit() > 0) {
            existingEvent.setParticipantLimit(input.getParticipantLimit());
        }

        return eventRepository.save(existingEvent);
    }

    public Event addParticipant(Event event, User user) {
        if (event.getParticipantUsers().stream().anyMatch(participant -> participant.getId().equals(user.getId()))) {
            throw new IllegalStateException("User already participates in this event");
        }

        int limit = event.getParticipantLimit() != null ? event.getParticipantLimit() : 0;
        if (limit > 0 && event.getParticipantUsers().size() >= limit) {
            throw new IllegalStateException("Participant limit reached");
        }

        event.getParticipantUsers().add(user);
        return eventRepository.save(event);
    }

    public Event removeParticipant(Event event, User user) {
        boolean removed = event.getParticipantUsers().removeIf(participant -> participant.getId().equals(user.getId()));
        if (!removed) {
            throw new IllegalStateException("User does not participate in this event");
        }

        return eventRepository.save(event);
    }

    public List<EventComment> findCommentsByEventId(Long eventId) {
        return eventCommentRepository.findAllByEventIdOrderByCreatedAtAsc(eventId);
    }

    public EventComment addComment(Event event, User user, String content) {
        EventComment comment = new EventComment();
        comment.setEvent(event);
        comment.setCreatedBy(user);
        comment.setContent(content);
        comment.setCreatedAt(java.time.LocalDateTime.now());
        return eventCommentRepository.save(comment);
    }

    public EventComment findCommentById(Long commentId) {
        return eventCommentRepository.findById(commentId).orElse(null);
    }

    public void deleteComment(EventComment comment) {
        eventCommentRepository.delete(comment);
    }

    @Transactional
    public void deleteById(Long id) {
        Event event = eventRepository.findById(id).orElse(null);
        if (event == null) {
            return;
        }

        eventCommentRepository.deleteAllByEventId(id);
        event.getParticipantUsers().clear();
        eventRepository.save(event);
        eventRepository.delete(event);
    }
}
