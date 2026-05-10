package com.iuep.service;

import com.iuep.entity.OtpCode;
import com.iuep.exception.GlobalExceptionHandler.ApiException;
import com.iuep.repository.OtpCodeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;

@Service
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    private final OtpCodeRepository otpRepo;
    private final JavaMailSender mailSender;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.otp.expiration-minutes}")
    private int expirationMinutes;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    public OtpService(OtpCodeRepository otpRepo, JavaMailSender mailSender) {
        this.otpRepo = otpRepo;
        this.mailSender = mailSender;
    }

    /** Generates a 6-digit OTP and sends it via email */
    @Transactional
    public Map<String, Object> sendOtp(String email, String purpose) {
        if (email == null || email.isBlank()) {
            throw ApiException.badRequest("Email is required.");
        }
        if (purpose == null) purpose = "signup";

        String code = String.format("%06d", random.nextInt(1_000_000));

        OtpCode otp = new OtpCode();
        otp.setEmail(email);
        otp.setCode(code);
        otp.setPurpose(purpose);
        otp.setExpiresAt(LocalDateTime.now().plusMinutes(expirationMinutes));
        otpRepo.save(otp);

        // Try to send email, fall back to console logging
        try {
            if (fromEmail != null && !fromEmail.isBlank()) {
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setFrom(fromEmail);
                msg.setTo(email);
                msg.setSubject("iUEP Verification Code");
                msg.setText("Your verification code is: " + code + "\n\nThis code expires in " + expirationMinutes + " minutes.");
                mailSender.send(msg);
                log.info("[OTP] Sent verification code to {}", email);
            } else {
                log.info("[OTP] Email not configured. Code for {}: {}", email, code);
            }
        } catch (Exception e) {
            log.warn("[OTP] Failed to send email to {}. Code: {} — Error: {}", email, code, e.getMessage());
        }

        return Map.of("success", true, "message", "Verification code sent.");
    }

    /** Verifies an OTP code */
    @Transactional
    public Map<String, Object> verifyOtp(String email, String code, String purpose) {
        if (email == null || code == null) {
            throw ApiException.badRequest("Email and code are required.");
        }
        if (purpose == null) purpose = "signup";

        var otpOpt = otpRepo.findFirstByEmailAndPurposeAndVerifiedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                email, purpose, LocalDateTime.now());

        if (otpOpt.isEmpty() || !otpOpt.get().getCode().equals(code)) {
            throw ApiException.badRequest("Invalid or expired verification code.");
        }

        OtpCode otp = otpOpt.get();
        otp.setVerified(true);
        otpRepo.save(otp);

        return Map.of("success", true, "verified", true);
    }
}
