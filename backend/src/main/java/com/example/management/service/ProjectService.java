package com.example.management.service;

import com.example.management.dto.ProjectListItemDto;
import com.example.management.entity.Project;
import com.example.management.entity.User;
import com.example.management.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    public List<Project> findAll() {
        return projectRepository.findAllByOrderByCreatedDateDesc();
    }

    public List<ProjectListItemDto> findAllSummaries() {
        return projectRepository.findAllSummaries();
    }

    public Project save(Project project, User user) {
        project.setCreatedBy(user);
        if (project.getCreatedDate() == null) {
            project.setCreatedDate(java.time.LocalDateTime.now());
        }
        return projectRepository.save(project);
    }

    public Project findById(Long id) {
        return projectRepository.findById(id).orElse(null);
    }

    public Project update(Project existingProject, Project input) {
        existingProject.setName(input.getName());
        existingProject.setDescription(input.getDescription());
        existingProject.setPhotoUrl(input.getPhotoUrl());
        existingProject.setParticipants(input.getParticipants());
        return projectRepository.save(existingProject);
    }

    public void deleteById(Long id) {
        projectRepository.deleteById(id);
    }
}
