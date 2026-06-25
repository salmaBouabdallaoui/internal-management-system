package com.example.management.repository;

import com.example.management.entity.LeaveRequest;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findAllByRequesterIdOrderByCreatedAtDesc(Long requesterId);

    @EntityGraph(attributePaths = "requester")
    List<LeaveRequest> findAllByRequesterDepartmentIgnoreCaseAndStatusOrderByCreatedAtDesc(String requesterDepartment, String status);

    @EntityGraph(attributePaths = "requester")
    List<LeaveRequest> findAllByStatusOrderByCreatedAtDesc(String status);

    @Override
    @EntityGraph(attributePaths = "requester")
    Optional<LeaveRequest> findById(Long id);

    long countByRequesterDepartmentIgnoreCaseAndStatus(String requesterDepartment, String status);
    long countByStatus(String status);
    void deleteAllByRequesterId(Long requesterId);

    @Query("""
            select count(lr) > 0
            from LeaveRequest lr
            where lr.requester.id = :requesterId
              and upper(lr.status) = upper(:status)
              and lr.startDate <= :date
              and lr.endDate >= :date
            """)
    boolean existsRequesterLeaveCoveringDate(
            @Param("requesterId") Long requesterId,
            @Param("status") String status,
            @Param("date") LocalDate date
    );

    @Modifying
    @Query("update LeaveRequest lr set lr.reviewer = null, lr.reviewerName = null where lr.reviewer.id = :reviewerId")
    void clearReviewerReferences(Long reviewerId);
}
