package com.iuep.service;

import com.iuep.entity.Admin;
import com.iuep.entity.User;
import com.iuep.exception.GlobalExceptionHandler.ApiException;
import com.iuep.repository.AdminRepository;
import com.iuep.repository.UserRepository;
import com.iuep.security.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepo;
    private final AdminRepository adminRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepo, AdminRepository adminRepo,
                       PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepo = userRepo;
        this.adminRepo = adminRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    /** Step 1: Check if student ID exists in the system */
    public Map<String, Object> checkStudent(String stuId) {
        if (stuId == null || !stuId.matches("^\\d{6}$")) {
            throw ApiException.badRequest("Student ID must be exactly 6 digits.");
        }

        var user = userRepo.findByStuId(stuId);
        if (user.isEmpty()) {
            return Map.of("exists", false);
        }

        User u = user.get();
        if (u.getUsername() != null) {
            throw ApiException.conflict("This student ID already has a registered account.");
        }

        String maskedEmail = null;
        if (u.getEmail() != null) {
            String[] parts = u.getEmail().split("@");
            maskedEmail = parts[0].charAt(0) + "***@" + parts[1];
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("exists", true);
        result.put("maskedEmail", maskedEmail);
        return result;
    }

    /** Step 2: Verify student's birthday */
    public Map<String, Object> verifyBirthday(String stuId, String birthday) {
        if (stuId == null || birthday == null) {
            throw ApiException.badRequest("Student ID and birthday are required.");
        }

        User user = userRepo.findByStuId(stuId)
                .orElseThrow(() -> ApiException.notFound("Student not found."));

        if (!birthday.equals(user.getBirthday())) {
            return Map.of("verified", false);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("verified", true);
        result.put("firstName", user.getFirstName());
        result.put("middleName", user.getMiddleName());
        result.put("lastName", user.getLastName());
        result.put("course", user.getCourse());
        result.put("yearLevel", user.getYearLevel());
        result.put("section", user.getSection());
        return result;
    }

    /** Step 4: Create account */
    public Map<String, Object> register(String stuId, String username, String password, String email) {
        if (stuId == null || username == null || password == null) {
            throw ApiException.badRequest("All fields are required.");
        }

        // Username validation: 3-20 chars, alphanumeric + underscores only
        String trimmedUsername = username.trim();
        if (trimmedUsername.length() < 3 || trimmedUsername.length() > 20) {
            throw ApiException.badRequest("Username must be 3-20 characters.");
        }
        if (!trimmedUsername.matches("^[a-zA-Z0-9_]+$")) {
            throw ApiException.badRequest("Username may only contain letters, numbers, and underscores.");
        }

        // Password strength
        if (password.length() < 8) {
            throw ApiException.badRequest("Password must be at least 8 characters.");
        }

        String trimmedStuId = stuId.trim();
        User user = userRepo.findByStuId(trimmedStuId)
                .orElseThrow(() -> ApiException.notFound("Student not found."));

        if (user.getUsername() != null) {
            throw ApiException.conflict("This student already has an account.");
        }

        if (userRepo.findByUsername(trimmedUsername).isPresent()) {
            throw ApiException.conflict("Username already taken.");
        }

        user.setUsername(trimmedUsername);
        user.setPasswordHash(passwordEncoder.encode(password));
        if (email != null) user.setEmail(email.trim().toLowerCase());
        userRepo.save(user);

        return Map.of("success", true, "message", "Account created successfully.");
    }

    /** Student login — returns JWT cookie + user data */
    public Map<String, Object> login(String stuId, String password, HttpServletResponse response) {
        if (stuId == null || password == null) {
            throw ApiException.badRequest("Student ID and password are required.");
        }

        String trimmedStuId = stuId.trim();
        User user = userRepo.findByStuId(trimmedStuId)
                .orElseThrow(() -> ApiException.unauthorized("Invalid credentials."));

        if (user.getUsername() == null) {
            throw ApiException.unauthorized("Invalid credentials.");
        }

        if (!verifyPassword(password, user.getPasswordHash())) {
            throw ApiException.unauthorized("Invalid credentials.");
        }

        // Migrate plain-text passwords to BCrypt on successful login
        if (!user.getPasswordHash().startsWith("$2")) {
            user.setPasswordHash(passwordEncoder.encode(password));
            userRepo.save(user);
        }

        // Generate JWT and set cookie
        String token = jwtUtil.generateStudentToken(user.getStuId(), user.getUsername());
        setJwtCookie(response, token);

        Map<String, Object> userData = new LinkedHashMap<>();
        userData.put("stuId", user.getStuId());
        userData.put("username", user.getUsername());
        userData.put("firstName", user.getFirstName());
        userData.put("middleName", user.getMiddleName());
        userData.put("lastName", user.getLastName());
        userData.put("course", user.getCourse());
        userData.put("yearLevel", user.getYearLevel());
        userData.put("section", user.getSection());
        userData.put("profilePic", user.getProfilePic());

        return Map.of("success", true, "user", userData);
    }

    /** Admin login */
    public Map<String, Object> adminLogin(String username, String password, HttpServletResponse response) {
        if (username == null || password == null) {
            throw ApiException.badRequest("Username and password are required.");
        }

        Admin admin = adminRepo.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("Invalid admin credentials."));

        if (admin.getPasswordHash() == null || !verifyPassword(password, admin.getPasswordHash())) {
            throw ApiException.unauthorized("Invalid admin credentials.");
        }

        // Migrate plain-text passwords to BCrypt
        if (!admin.getPasswordHash().startsWith("$2")) {
            admin.setPasswordHash(passwordEncoder.encode(password));
            adminRepo.save(admin);
        }

        String token = jwtUtil.generateAdminToken(admin.getId(), admin.getUsername());
        setJwtCookie(response, token);

        Map<String, Object> adminData = new LinkedHashMap<>();
        adminData.put("id", admin.getId());
        adminData.put("username", admin.getUsername());
        adminData.put("displayName", admin.getDisplayName());
        adminData.put("role", admin.getRole());

        return Map.of("success", true, "admin", adminData);
    }

    /** Logout — clear JWT cookie */
    public void logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("iUEP_token", "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    /** Password recovery — reset password after OTP verification */
    public Map<String, Object> resetPassword(String stuId, String newPassword) {
        if (stuId == null) {
            throw ApiException.badRequest("Student ID is required.");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw ApiException.badRequest("New password must be at least 8 characters.");
        }

        User user = userRepo.findByStuId(stuId)
                .orElseThrow(() -> ApiException.notFound("Student not found."));

        if (user.getUsername() == null) {
            throw ApiException.badRequest("This student does not have an account.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepo.save(user);

        return Map.of("success", true, "message", "Password has been reset successfully.");
    }

    /** Look up masked email for a student ID (password recovery) */
    public Map<String, Object> lookupEmail(String stuId) {
        if (stuId == null || !stuId.matches("^\\d{6}$")) {
            throw ApiException.badRequest("Student ID must be exactly 6 digits.");
        }

        User user = userRepo.findByStuId(stuId)
                .orElseThrow(() -> ApiException.notFound("No student found with this ID."));

        if (user.getUsername() == null) {
            throw ApiException.badRequest("This student does not have an account.");
        }

        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw ApiException.badRequest("No email on file for this student. Contact the registrar.");
        }

        String[] parts = user.getEmail().split("@");
        String masked = parts[0].charAt(0) + "***@" + parts[1];

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("found", true);
        result.put("maskedEmail", masked);
        result.put("email", user.getEmail()); // Full email needed for OTP sending
        return result;
    }

    /** Verify password — supports both plain-text (legacy) and BCrypt */
    private boolean verifyPassword(String rawPassword, String storedHash) {
        if (storedHash == null) return false;
        // BCrypt hashes start with $2a$, $2b$, or $2y$
        if (storedHash.startsWith("$2")) {
            return passwordEncoder.matches(rawPassword, storedHash);
        }
        // Legacy plain-text comparison
        return storedHash.equals(rawPassword);
    }

    private void setJwtCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie("iUEP_token", token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(86400); // 24 hours
        cookie.setSecure(false); // Set to true in production with HTTPS
        response.addCookie(cookie);
    }
}
