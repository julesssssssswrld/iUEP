package com.iuep.controller;

import com.iuep.service.AuthService;
import com.iuep.service.OtpService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final OtpService otpService;

    public AuthController(AuthService authService, OtpService otpService) {
        this.authService = authService;
        this.otpService = otpService;
    }

    @PostMapping("/check-student")
    public ResponseEntity<?> checkStudent(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authService.checkStudent(body.get("stuId")));
    }

    @PostMapping("/verify-birthday")
    public ResponseEntity<?> verifyBirthday(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authService.verifyBirthday(body.get("stuId"), body.get("birthday")));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        return ResponseEntity.status(201).body(
                authService.register(body.get("stuId"), body.get("username"), body.get("password"), body.get("email")));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpServletResponse response) {
        return ResponseEntity.ok(authService.login(body.get("stuId"), body.get("password"), response));
    }

    @PostMapping("/admin-login")
    public ResponseEntity<?> adminLogin(@RequestBody Map<String, String> body, HttpServletResponse response) {
        return ResponseEntity.ok(authService.adminLogin(body.get("username"), body.get("password"), response));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        authService.logout(response);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(otpService.sendOtp(body.get("email"), body.get("purpose")));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(otpService.verifyOtp(body.get("email"), body.get("code"), body.get("purpose")));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authService.resetPassword(body.get("stuId"), body.get("newPassword")));
    }

    /** Look up the masked email for a student ID (for password recovery) */
    @PostMapping("/lookup-email")
    public ResponseEntity<?> lookupEmail(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authService.lookupEmail(body.get("stuId")));
    }
}
