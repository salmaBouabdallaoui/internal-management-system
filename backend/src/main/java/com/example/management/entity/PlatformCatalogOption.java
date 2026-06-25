package com.example.management.entity;

import jakarta.persistence.*;

@Entity
@Table(
        name = "platform_catalog_options",
        uniqueConstraints = @UniqueConstraint(columnNames = {"option_type", "option_value"})
)
public class PlatformCatalogOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "option_type", nullable = false)
    private String optionType;

    @Column(name = "option_value", nullable = false)
    private String optionValue;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOptionType() {
        return optionType;
    }

    public void setOptionType(String optionType) {
        this.optionType = optionType;
    }

    public String getOptionValue() {
        return optionValue;
    }

    public void setOptionValue(String optionValue) {
        this.optionValue = optionValue;
    }
}
