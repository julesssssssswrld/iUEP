package com.iuep.service;

import com.iuep.entity.User;
import com.iuep.exception.GlobalExceptionHandler.ApiException;
import com.iuep.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class UserService {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    public User getUser(String stuId) {
        return userRepo.findByStuId(stuId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
    }

    public Map<String, Object> updateProfilePic(String stuId, String profilePic) {
        User user = getUser(stuId);
        user.setProfilePic(profilePic);
        userRepo.save(user);
        return Map.of("success", true);
    }

    public Map<String, Object> updateUsername(String stuId, String username) {
        if (username == null || username.trim().length() < 3) {
            throw ApiException.badRequest("Username must be at least 3 characters.");
        }

        User user = getUser(stuId);
        var existing = userRepo.findByUsernameAndStuIdNot(username.trim(), stuId);
        if (existing.isPresent()) {
            throw ApiException.conflict("Username already taken.");
        }

        user.setUsername(username.trim());
        userRepo.save(user);
        return Map.of("success", true);
    }

    public Map<String, Object> updatePassword(String stuId, String currentPassword, String newPassword) {
        if (currentPassword == null) {
            throw ApiException.badRequest("Current password is required.");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw ApiException.badRequest("New password must be at least 8 characters.");
        }

        User user = getUser(stuId);

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw ApiException.unauthorized("Current password is incorrect.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepo.save(user);
        return Map.of("success", true);
    }
}
