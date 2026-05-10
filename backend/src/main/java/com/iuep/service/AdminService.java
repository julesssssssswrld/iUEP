package com.iuep.service;

import com.iuep.entity.Admin;
import com.iuep.entity.IdApplication;
import com.iuep.entity.User;
import com.iuep.exception.GlobalExceptionHandler.ApiException;
import com.iuep.repository.AdminRepository;
import com.iuep.repository.IdApplicationRepository;
import com.iuep.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AdminService {

    private final AdminRepository adminRepo;
    private final IdApplicationRepository appRepo;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;

    public AdminService(AdminRepository adminRepo, IdApplicationRepository appRepo,
                        UserRepository userRepo, PasswordEncoder passwordEncoder,
                        NotificationService notificationService) {
        this.adminRepo = adminRepo;
        this.appRepo = appRepo;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
    }

    // ── Application Management ──

    public List<Map<String, Object>> listApplications(String status) {
        List<IdApplication> apps;
        if (status == null || "all".equals(status)) {
            apps = appRepo.findAllOrderBySubmittedAtDesc();
        } else {
            apps = appRepo.findByStatusOrderBySubmittedAtDesc(status);
        }
        return apps.stream().map(this::enrichApplication).toList();
    }

    public Map<String, Object> getApplication(Long id) {
        IdApplication app = appRepo.findById(id)
                .orElseThrow(() -> ApiException.notFound("Application not found"));
        return enrichApplication(app);
    }

    public Map<String, Object> updateApplicationStatus(Long id, String status, String rejectionReason) {
        List<String> valid = List.of("uploaded", "received", "processing", "completed", "claimed", "rejected");
        if (!valid.contains(status)) {
            throw ApiException.badRequest("Invalid status. Must be one of: " + String.join(", ", valid));
        }

        IdApplication app = appRepo.findById(id)
                .orElseThrow(() -> ApiException.notFound("Application not found"));

        app.setStatus(status);
        app.setRejectionReason(rejectionReason);
        app.setUpdatedBy("admin");
        appRepo.save(app);

        // Send WebSocket notification
        notificationService.notifyStatusUpdate(app.getStudentId(), status);

        return enrichApplication(app);
    }

    public Map<String, Object> getStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", appRepo.countTotal());
        stats.put("pending", appRepo.countPending());
        stats.put("processing", appRepo.countProcessing());
        stats.put("completed", appRepo.countCompleted());
        stats.put("claimed", appRepo.countClaimed());
        stats.put("rejected", appRepo.countRejected());
        return stats;
    }

    public List<Map<String, Object>> claimedHistory() {
        return appRepo.findByStatusOrderBySubmittedAtDesc("claimed")
                .stream().map(this::enrichApplication).toList();
    }

    // ── Admin Credential Management ──

    public List<Map<String, Object>> listAdmins() {
        return adminRepo.findAll().stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            m.put("username", a.getUsername());
            m.put("display_name", a.getDisplayName());
            m.put("role", a.getRole());
            m.put("created_at", a.getCreatedAt());
            return m;
        }).toList();
    }

    public Map<String, Object> createAdmin(String username, String displayName, String password, String role) {
        if (username == null || displayName == null || password == null) {
            throw ApiException.badRequest("Username, display name, and password are required.");
        }
        if (password.length() < 6) {
            throw ApiException.badRequest("Password must be at least 6 characters.");
        }
        if (adminRepo.existsByUsername(username)) {
            throw ApiException.conflict("Username already taken.");
        }

        Admin admin = new Admin();
        admin.setUsername(username);
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setDisplayName(displayName);
        admin.setRole(role != null ? role : "id_production");
        adminRepo.save(admin);

        return Map.of("success", true, "id", admin.getId());
    }

    public Map<String, Object> updateAdminPassword(Long id, String currentPassword, String newPassword) {
        if (newPassword == null || newPassword.length() < 6) {
            throw ApiException.badRequest("New password must be at least 6 characters.");
        }

        Admin admin = adminRepo.findById(id)
                .orElseThrow(() -> ApiException.notFound("Admin not found."));

        // Verify current password if provided
        if (currentPassword != null) {
            boolean matches = admin.getPasswordHash().startsWith("$2")
                    ? passwordEncoder.matches(currentPassword, admin.getPasswordHash())
                    : admin.getPasswordHash().equals(currentPassword);
            if (!matches) {
                throw ApiException.unauthorized("Current password is incorrect.");
            }
        }

        admin.setPasswordHash(passwordEncoder.encode(newPassword));
        adminRepo.save(admin);
        return Map.of("success", true);
    }

    public Map<String, Object> updateAdminUsername(Long id, String username) {
        if (username == null || username.trim().length() < 3) {
            throw ApiException.badRequest("Username must be at least 3 characters.");
        }

        adminRepo.findById(id).orElseThrow(() -> ApiException.notFound("Admin not found."));

        if (adminRepo.findByUsernameAndIdNot(username.trim(), id).isPresent()) {
            throw ApiException.conflict("Username already taken.");
        }

        Admin admin = adminRepo.findById(id).get();
        admin.setUsername(username.trim());
        adminRepo.save(admin);
        return Map.of("success", true);
    }

    public Map<String, Object> deleteAdmin(Long id) {
        if (adminRepo.count() <= 1) {
            throw ApiException.badRequest("Cannot delete the last admin account.");
        }
        adminRepo.findById(id).orElseThrow(() -> ApiException.notFound("Admin not found."));
        adminRepo.deleteById(id);
        return Map.of("success", true);
    }

    // ── Helpers ──

    private Map<String, Object> enrichApplication(IdApplication app) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", app.getId());
        map.put("student_id", app.getStudentId());
        map.put("status", app.getStatus());
        map.put("photo_base64", app.getPhotoBase64());
        map.put("cor_base64", app.getCorBase64());
        map.put("photo_path", app.getPhotoPath());
        map.put("cor_path", app.getCorPath());
        map.put("library_id", app.getLibraryId());
        map.put("rejection_reason", app.getRejectionReason());
        map.put("submitted_at", app.getSubmittedAt());
        map.put("updated_at", app.getUpdatedAt());
        map.put("updated_by", app.getUpdatedBy());

        // photo_url / cor_url for frontend compatibility
        map.put("photo_url", app.getPhotoPath() != null ? app.getPhotoPath() : app.getPhotoBase64());
        map.put("cor_url", app.getCorPath() != null ? app.getCorPath() : app.getCorBase64());

        // Enrich with student info
        userRepo.findByStuId(app.getStudentId()).ifPresent(user -> {
            map.put("first_name", user.getFirstName());
            map.put("middle_name", user.getMiddleName());
            map.put("last_name", user.getLastName());
            map.put("course", user.getCourse());
            map.put("year_level", user.getYearLevel());
            map.put("section", user.getSection());
            map.put("stu_id", user.getStuId());
        });

        return map;
    }
}
