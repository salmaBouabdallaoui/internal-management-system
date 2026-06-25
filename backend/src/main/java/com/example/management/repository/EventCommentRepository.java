package com.example.management.repository;

import com.example.management.entity.EventComment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EventCommentRepository extends JpaRepository<EventComment, Long> {
    @EntityGraph(attributePaths = {"createdBy"})
    List<EventComment> findAllByEventIdOrderByCreatedAtAsc(Long eventId);

    @EntityGraph(attributePaths = {"createdBy", "event"})
    Optional<EventComment> findById(Long id);

    void deleteAllByEventId(Long eventId);
    void deleteAllByCreatedById(Long userId);
}
