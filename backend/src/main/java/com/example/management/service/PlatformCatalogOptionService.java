package com.example.management.service;

import com.example.management.entity.PlatformCatalogOption;
import com.example.management.entity.User;
import com.example.management.repository.PlatformCatalogOptionRepository;
import com.example.management.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class PlatformCatalogOptionService {

    public static final String TYPE_DEPARTMENT = "DEPARTMENT";
    public static final String TYPE_JOB_TITLE = "JOB_TITLE";

    private static final List<String> DEFAULT_DEPARTMENTS = List.of("DSIC", "DBPI", "DP");
    private static final List<String> DEFAULT_JOB_TITLES = List.of(
            "Ingenieur",
            "Architecte",
            "Administrateur",
            "Technicien",
            "Chef de division",
            "Chef de service",
            "Admin RH"
    );

    private final PlatformCatalogOptionRepository repository;
    private final UserRepository userRepository;

    public PlatformCatalogOptionService(PlatformCatalogOptionRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void ensureDefaults() {
        DEFAULT_DEPARTMENTS.forEach(this::ensureDepartment);
        DEFAULT_JOB_TITLES.forEach(this::ensureJobTitle);
    }

    public List<String> findDepartments() {
        return repository.findAllByOptionTypeIgnoreCaseOrderByOptionValueAsc(TYPE_DEPARTMENT).stream()
                .map(PlatformCatalogOption::getOptionValue)
                .collect(Collectors.toList());
    }

    public List<String> findJobTitles() {
        return repository.findAllByOptionTypeIgnoreCaseOrderByOptionValueAsc(TYPE_JOB_TITLE).stream()
                .map(PlatformCatalogOption::getOptionValue)
                .collect(Collectors.toList());
    }

    @Transactional
    public PlatformCatalogOption addDepartment(String value) {
        return addOption(TYPE_DEPARTMENT, normalizeDepartment(value));
    }

    @Transactional
    public PlatformCatalogOption addJobTitle(String value) {
        return addOption(TYPE_JOB_TITLE, normalizeJobTitle(value));
    }

    @Transactional
    public PlatformCatalogOption deleteDepartment(String value) {
        return deleteOption(TYPE_DEPARTMENT, normalizeDepartment(value));
    }

    @Transactional
    public PlatformCatalogOption deleteJobTitle(String value) {
        return deleteOption(TYPE_JOB_TITLE, normalizeJobTitle(value));
    }

    public boolean existsDepartment(String value) {
        return repository.existsByOptionTypeIgnoreCaseAndOptionValueIgnoreCase(TYPE_DEPARTMENT, normalizeDepartment(value));
    }

    public boolean existsJobTitle(String value) {
        return repository.existsByOptionTypeIgnoreCaseAndOptionValueIgnoreCase(TYPE_JOB_TITLE, normalizeJobTitle(value));
    }

    private PlatformCatalogOption ensureDepartment(String value) {
        return repository.findByOptionTypeIgnoreCaseAndOptionValueIgnoreCase(TYPE_DEPARTMENT, normalizeDepartment(value))
                .orElseGet(() -> repository.save(buildOption(TYPE_DEPARTMENT, normalizeDepartment(value))));
    }

    private PlatformCatalogOption ensureJobTitle(String value) {
        return repository.findByOptionTypeIgnoreCaseAndOptionValueIgnoreCase(TYPE_JOB_TITLE, normalizeJobTitle(value))
                .orElseGet(() -> repository.save(buildOption(TYPE_JOB_TITLE, normalizeJobTitle(value))));
    }

    private PlatformCatalogOption addOption(String type, String value) {
        if (value.isEmpty()) {
            throw new IllegalArgumentException("La valeur est obligatoire.");
        }

        if (repository.existsByOptionTypeIgnoreCaseAndOptionValueIgnoreCase(type, value)) {
            throw new IllegalArgumentException("Cette valeur existe deja.");
        }

        return repository.save(buildOption(type, value));
    }

    private PlatformCatalogOption deleteOption(String type, String value) {
        if (value.isEmpty()) {
            throw new IllegalArgumentException("La valeur est obligatoire.");
        }

        PlatformCatalogOption option = repository.findByOptionTypeIgnoreCaseAndOptionValueIgnoreCase(type, value)
                .orElseThrow(() -> new IllegalArgumentException("Cette valeur n'existe pas."));

        if (isValueInUse(type, option.getOptionValue())) {
            throw new IllegalStateException("Cette valeur est encore utilisee par des employes.");
        }

        repository.delete(option);
        return option;
    }

    private boolean isValueInUse(String type, String value) {
        String normalizedValue = normalize(value);
        return userRepository.findAll().stream().anyMatch(user -> {
            if (TYPE_DEPARTMENT.equalsIgnoreCase(type)) {
                return normalizedValue.equalsIgnoreCase(normalize(user.getDepartment()));
            }

            if (TYPE_JOB_TITLE.equalsIgnoreCase(type)) {
                return normalizedValue.equalsIgnoreCase(normalize(user.getJobTitle()));
            }

            return false;
        });
    }

    private PlatformCatalogOption buildOption(String type, String value) {
        PlatformCatalogOption option = new PlatformCatalogOption();
        option.setOptionType(type.toUpperCase(Locale.ROOT));
        option.setOptionValue(value);
        return option;
    }

    private String normalizeDepartment(String value) {
        return normalize(value).toUpperCase(Locale.ROOT);
    }

    private String normalizeJobTitle(String value) {
        return normalize(value);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
