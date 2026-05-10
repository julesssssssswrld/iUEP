package com.iuep.controller;

import com.iuep.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ── Application Management ──

    @GetMapping("/applications")
    public ResponseEntity<?> listApplications(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(adminService.listApplications(status));
    }

    @GetMapping("/applications/{id}")
    public ResponseEntity<?> getApplication(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getApplication(id));
    }

    @PatchMapping("/applications/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminService.updateApplicationStatus(id, body.get("status"), body.get("rejectionReason")));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        return ResponseEntity.ok(adminService.getStats());
    }

    @GetMapping("/claimed-history")
    public ResponseEntity<?> claimedHistory() {
        return ResponseEntity.ok(adminService.claimedHistory());
    }

    // ── Admin Credential Management ──

    @GetMapping("/admins")
    public ResponseEntity<?> listAdmins() {
        return ResponseEntity.ok(adminService.listAdmins());
    }

    @PostMapping("/admins")
    public ResponseEntity<?> createAdmin(@RequestBody Map<String, String> body) {
        return ResponseEntity.status(201).body(
                adminService.createAdmin(body.get("username"), body.get("displayName"), body.get("password"), body.get("role")));
    }

    @PatchMapping("/admins/{id}/password")
    public ResponseEntity<?> updateAdminPassword(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminService.updateAdminPassword(id, body.get("currentPassword"), body.get("password")));
    }

    @PatchMapping("/admins/{id}/username")
    public ResponseEntity<?> updateAdminUsername(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminService.updateAdminUsername(id, body.get("username")));
    }

    @DeleteMapping("/admins/{id}")
    public ResponseEntity<?> deleteAdmin(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.deleteAdmin(id));
    }
}
