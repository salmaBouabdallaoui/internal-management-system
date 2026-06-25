package com.example.management.repository;

import com.example.management.dto.ProjectListItemDto;
import com.example.management.entity.Project;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    @Query("""
            select new com.example.management.dto.ProjectListItemDto(
                p.id,
                p.name,
                p.description,
                case when p.photoUrl like 'data:%' then null else p.photoUrl end,
                p.participants,
                p.createdDate,
                creator.username
            )
            from Project p
            left join p.createdBy creator
            order by p.createdDate desc
            """)
    List<ProjectListItemDto> findAllSummaries();

    @EntityGraph(attributePaths = {"createdBy"})
    List<Project> findAllByOrderByCreatedDateDesc();

    @EntityGraph(attributePaths = {"createdBy"})
    Optional<Project> findById(Long id);
}
