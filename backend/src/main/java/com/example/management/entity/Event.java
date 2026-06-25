package com.example.management.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.persistence.Transient;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Table(name = "events")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String type;

    private String location;

    private String organizer;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    @Column(name = "date")
    private LocalDateTime legacyDate;

    @Column(columnDefinition = "TEXT")
    private String programme;

    @Column(columnDefinition = "TEXT")
    private String targetAudience;

    @Column(columnDefinition = "TEXT")
    private String galleryPhotos;

    @Column(columnDefinition = "TEXT")
    private String resourceLinks;

    @Column(columnDefinition = "TEXT")
    private String photoUrl;

    private Integer participantLimit;

    @ManyToOne
    @JoinColumn(name = "created_by")
    @JsonIgnore
    private User createdBy;

    @ManyToMany
    @JoinTable(
            name = "event_participants",
            joinColumns = @JoinColumn(name = "event_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @JsonIgnore
    private Set<User> participantUsers = new LinkedHashSet<>();

    public Event() {}

    public Event(String title, String description, LocalDateTime startDate, User createdBy) {
        this.title = title;
        this.description = description;
        this.startDate = startDate;
        this.createdBy = createdBy;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getOrganizer() { return organizer; }
    public void setOrganizer(String organizer) { this.organizer = organizer; }

    public LocalDateTime getStartDate() { return startDate != null ? startDate : legacyDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }

    public LocalDateTime getEndDate() { return endDate != null ? endDate : getStartDate(); }
    public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }

    public String getProgramme() { return programme; }
    public void setProgramme(String programme) { this.programme = programme; }

    public String getTargetAudience() { return targetAudience; }
    public void setTargetAudience(String targetAudience) { this.targetAudience = targetAudience; }

    public String getGalleryPhotos() { return galleryPhotos; }
    public void setGalleryPhotos(String galleryPhotos) { this.galleryPhotos = galleryPhotos; }

    public String getResourceLinks() { return resourceLinks; }
    public void setResourceLinks(String resourceLinks) { this.resourceLinks = resourceLinks; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public Integer getParticipantLimit() { return participantLimit; }
    public void setParticipantLimit(Integer participantLimit) { this.participantLimit = participantLimit; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public Set<User> getParticipantUsers() { return participantUsers; }
    public void setParticipantUsers(Set<User> participantUsers) { this.participantUsers = participantUsers; }

    @Transient
    public String getCreatedByUsername() {
        return createdBy != null ? createdBy.getUsername() : null;
    }

    @Transient
    public int getParticipantCount() {
        return participantUsers != null ? participantUsers.size() : 0;
    }

    @Transient
    public Set<String> getParticipantUsernames() {
        if (participantUsers == null) {
          return Set.of();
        }
        return participantUsers.stream()
                .map(User::getUsername)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    @Transient
    public boolean getArchived() {
        LocalDateTime reference = getEndDate();
        return reference != null && reference.isBefore(LocalDateTime.now());
    }
}
