package com.iuep.service;

import com.iuep.entity.Admin;
import com.iuep.entity.IdApplication;
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
    private final IdApplicationMapper appMapper;

    public AdminService(AdminRepository adminRepo, IdApplicationRepository appRepo,
                        UserRepository userRepo, PasswordEncoder passwordEncoder,
                        NotificationService notificationService, IdApplicationMapper appMapper) {
        this.adminRepo = adminRepo;
        this.appRepo = appRepo;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
        this.appMapper = appMapper;
    }

    // ── Application Management ──

    public List<Map<String, Object>> listApplications(String status) {
        List<IdApplication> apps;
        if (status == null || "all".equals(status)) {
            apps = appRepo.findAllOrderByIdDesc();
        } else {
            apps = appRepo.findByStatusOrderByIdDesc(status);
        }
        return apps.stream().map(appMapper::toMap).toList();
    }

    public Map<String, Object> getApplication(Long id) {
        IdApplication app = appRepo.findById(id)
                .orElseThrow(() -> ApiException.notFound("Application not found"));
        return appMapper.toMap(app);
    }

    public Map<String, Object> updateApplicationStatus(Long id, String status, String rejectionReason) {
        List<String> valid = List.of("uploaded", "received", "processing", "completed", "claimed", "rejected", "lost", "lost_declined");
        if (!valid.contains(status)) {
            throw ApiException.badRequest("Invalid status. Must be one of: " + String.join(", ", valid));
        }

        IdApplication app = appRepo.findById(id)
                .orElseThrow(() -> ApiException.notFound("Application not found"));

        app.setStatus(status);
        app.setRejectionReason(rejectionReason);
        app.setUpdatedBy("admin");
        appRepo.save(app);

        // Send WebSocket notifications
        notificationService.notifyStatusUpdate(app.getStudentId(), status);
        notificationService.notifyAdmins("status_update", Map.of("studentId", app.getStudentId(), "status", status));

        return appMapper.toMap(app);
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
        return appRepo.findByStatusOrderByIdDesc("claimed")
                .stream().map(appMapper::toMap).toList();
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
}
