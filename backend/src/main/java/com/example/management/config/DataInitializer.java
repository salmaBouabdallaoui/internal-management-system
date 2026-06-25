package com.example.management.config;

import com.example.management.entity.User;
import com.example.management.repository.UserRepository;
import com.example.management.service.PlatformCatalogOptionService;
import com.example.management.service.PublicHolidayService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedDefaultAdmin(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.seed.admin.username:admin}") String adminUsername,
            @Value("${app.seed.admin.password:admin123}") String adminPassword
    ) {
        return args -> {
            ensureSeedUser(userRepository, passwordEncoder, adminUsername, adminPassword, "ADMIN");
        };
    }

    @Bean
    CommandLineRunner seedSuperAdmin(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.seed.superadmin.username:superadmin}") String superAdminUsername,
            @Value("${app.seed.superadmin.password:superadmin123}") String superAdminPassword
    ) {
        return args -> {
            ensureSeedUser(userRepository, passwordEncoder, superAdminUsername, superAdminPassword, "SUPER_ADMIN");
        };
    }

    @Bean
    CommandLineRunner seedDefaultUser(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.seed.user.username:emp001}") String username,
            @Value("${app.seed.user.password:user123}") String password
    ) {
        return args -> {
            ensureSeedUser(userRepository, passwordEncoder, username, password, "EMPLOYEE");
        };
    }

    @Bean
    CommandLineRunner initializeLeaveBalances(UserRepository userRepository) {
        return args -> {
            userRepository.findAll().forEach(user -> {
                Integer remainingLeaveDays = user.getRemainingLeaveDays();
                if (remainingLeaveDays == null || remainingLeaveDays == 0) {
                    user.setRemainingLeaveDays(User.ANNUAL_LEAVE_DAYS);
                    userRepository.save(user);
                }
            });
        };
    }

    @Bean
    CommandLineRunner seedDefaultPublicHolidays(PublicHolidayService publicHolidayService) {
        return args -> {
            publicHolidayService.seedDefaultMoroccoHolidays();
        };
    }

    @Bean
    CommandLineRunner seedPlatformCatalogOptions(PlatformCatalogOptionService catalogOptionService) {
        return args -> catalogOptionService.ensureDefaults();
    }

    private void ensureSeedUser(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            String username,
            String rawPassword,
            String role
    ) {
        Optional<User> existingUser = userRepository.findByUsername(username);

        if (existingUser.isEmpty()) {
            User user = new User();
            user.setUsername(username);
            user.setFullName(username);
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setRole(role);
            user.setRemainingLeaveDays(User.ANNUAL_LEAVE_DAYS);
            user.setForcePasswordChange(false);
            user.setFailedLoginAttempts(0);
            userRepository.save(user);
            return;
        }

        User user = existingUser.get();
        boolean passwordMatches = passwordEncoder.matches(rawPassword, user.getPassword());
        boolean roleMatches = role.equals(user.getRole());
        boolean fullNameMissing = user.getFullName() == null || user.getFullName().isBlank();

        if (fullNameMissing) {
            user.setFullName(user.getUsername());
        }

        if (user.getForcePasswordChange() == null || user.getForcePasswordChange()) {
            user.setForcePasswordChange(false);
        }

        if (user.getFailedLoginAttempts() == null) {
            user.setFailedLoginAttempts(0);
        }

        if (!passwordMatches || !roleMatches || fullNameMissing) {
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setRole(role);
        }

        userRepository.save(user);
    }

}
