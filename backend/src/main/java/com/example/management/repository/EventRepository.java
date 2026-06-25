package com.example.management.repository;

import com.example.management.dto.EventListItemDto;
import com.example.management.entity.Event;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface EventRepository extends JpaRepository<Event, Long> {
    @Query("""
            select new com.example.management.dto.EventListItemDto(
                e.id,
                e.title,
                e.description,
                e.type,
                e.location,
                e.organizer,
                coalesce(e.startDate, e.legacyDate),
                coalesce(e.endDate, coalesce(e.startDate, e.legacyDate)),
                e.photoUrl,
                e.participantLimit,
                creator.username,
                count(distinct participant.id)
            )
            from Event e
            left join e.createdBy creator
            left join e.participantUsers participant
            group by
                e.id,
                e.title,
                e.description,
                e.type,
                e.location,
                e.organizer,
                e.startDate,
                e.legacyDate,
                e.endDate,
                e.participantLimit,
                creator.username
            order by coalesce(e.startDate, e.legacyDate) asc
            """)
    List<EventListItemDto> findAllSummaries();

    @EntityGraph(attributePaths = {"createdBy", "participantUsers"})
    List<Event> findAllByOrderByStartDateAsc();

    @EntityGraph(attributePaths = {"createdBy", "participantUsers"})
    Optional<Event> findById(Long id);
}
