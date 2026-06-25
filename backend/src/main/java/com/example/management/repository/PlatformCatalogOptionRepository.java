package com.example.management.repository;

import com.example.management.entity.PlatformCatalogOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlatformCatalogOptionRepository extends JpaRepository<PlatformCatalogOption, Long> {
    List<PlatformCatalogOption> findAllByOptionTypeIgnoreCaseOrderByOptionValueAsc(String optionType);
    boolean existsByOptionTypeIgnoreCaseAndOptionValueIgnoreCase(String optionType, String optionValue);
    Optional<PlatformCatalogOption> findByOptionTypeIgnoreCaseAndOptionValueIgnoreCase(String optionType, String optionValue);
}
