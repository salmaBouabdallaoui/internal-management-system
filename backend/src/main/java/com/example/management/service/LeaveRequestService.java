package com.example.management.service;

import com.example.management.entity.LeaveRequest;
import com.example.management.repository.LeaveRequestRepository;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class LeaveRequestService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final PublicHolidayService publicHolidayService;

    public LeaveRequestService(LeaveRequestRepository leaveRequestRepository, PublicHolidayService publicHolidayService) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.publicHolidayService = publicHolidayService;
    }

    public LeaveRequest save(LeaveRequest leaveRequest) {
        return leaveRequestRepository.save(leaveRequest);
    }

    public void delete(LeaveRequest leaveRequest) {
        leaveRequestRepository.delete(leaveRequest);
    }

    public Optional<LeaveRequest> findById(Long id) {
        return leaveRequestRepository.findById(id);
    }

    public List<LeaveRequest> findByRequesterId(Long requesterId) {
        return leaveRequestRepository.findAllByRequesterIdOrderByCreatedAtDesc(requesterId);
    }

    public List<LeaveRequest> findPendingByDepartment(String department) {
        return leaveRequestRepository.findAllByRequesterDepartmentIgnoreCaseAndStatusOrderByCreatedAtDesc(department, "PENDING");
    }

    public List<LeaveRequest> findPendingHrApprovals() {
        return leaveRequestRepository.findAllByStatusOrderByCreatedAtDesc("PENDING_HR");
    }

    public List<LeaveRequest> findApprovedByDepartment(String department) {
        return leaveRequestRepository.findAllByRequesterDepartmentIgnoreCaseAndStatusOrderByCreatedAtDesc(department, "APPROVED");
    }

    public List<LeaveRequest> findAll() {
        return leaveRequestRepository.findAll();
    }

    public long countPendingByDepartment(String department) {
        return leaveRequestRepository.countByRequesterDepartmentIgnoreCaseAndStatus(department, "PENDING");
    }

    public long countPendingHrApprovals() {
        return leaveRequestRepository.countByStatus("PENDING_HR");
    }

    public long countAll() {
        return leaveRequestRepository.count();
    }

    public long countByStatus(String status) {
        return leaveRequestRepository.countByStatus(status);
    }

    public long countEmployeesOnLeaveToday() {
        LocalDate today = LocalDate.now();
        Set<Long> employeesOnLeave = new HashSet<>();

        for (LeaveRequest leaveRequest : findAll()) {
            if (!"APPROVED".equalsIgnoreCase(leaveRequest.getStatus())) {
                continue;
            }

            if (leaveRequest.getRequester() == null || leaveRequest.getRequester().getId() == null) {
                continue;
            }

            LocalDate startDate = leaveRequest.getStartDate();
            LocalDate endDate = leaveRequest.getEndDate();
            if (startDate == null || endDate == null) {
                continue;
            }

            if (!today.isBefore(startDate) && !today.isAfter(endDate)) {
                employeesOnLeave.add(leaveRequest.getRequester().getId());
            }
        }

        return employeesOnLeave.size();
    }

    public int calculateLeaveDays(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || endDate.isBefore(startDate)) {
            return 0;
        }

        int days = 0;

        for (LocalDate current = startDate; !current.isAfter(endDate); current = current.plusDays(1)) {
            DayOfWeek dayOfWeek = current.getDayOfWeek();
            boolean isWeekend = dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY;
            boolean isHoliday = publicHolidayService.isHoliday(current);
            if (!isWeekend && !isHoliday) {
                days++;
            }
        }

        return days;
    }
}
