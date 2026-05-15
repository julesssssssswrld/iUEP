package com.iuep.service;

import com.iuep.entity.OtpCode;
import com.iuep.exception.GlobalExceptionHandler.ApiException;
import com.iuep.repository.OtpCodeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;

@Service
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    private final OtpCodeRepository otpRepo;
    private final EmailDispatchService emailDispatch;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.otp.expiration-minutes}")
    private int expirationMinutes;


    public OtpService(OtpCodeRepository otpRepo, EmailDispatchService emailDispatch) {
        this.otpRepo = otpRepo;
        this.emailDispatch = emailDispatch;
    }

    /** Generates a 6-digit OTP and sends it via email */
    @Transactional
    public Map<String, Object> sendOtp(String email, String purpose) {
        if (email == null || email.isBlank()) {
            throw ApiException.badRequest("Email is required.");
        }
        if (purpose == null) purpose = "signup";

        // Anti-spam: reject if too many active (unverified, unexpired) OTPs exist
        long activeCount = otpRepo.countByEmailAndPurposeAndVerifiedFalseAndExpiresAtAfter(
                email, purpose, LocalDateTime.now());
        if (activeCount >= 5) {
            throw ApiException.badRequest("Too many verification attempts. Please wait before requesting a new code.");
        }

        String code = String.format("%06d", random.nextInt(1_000_000));

        // Invalidate all older unverified OTPs for this email+purpose
        otpRepo.findAllByEmailAndPurposeAndVerifiedFalse(email, purpose)
                .forEach(old -> {
                    old.setVerified(true); // mark as consumed
                    otpRepo.save(old);
                });

        OtpCode otp = new OtpCode();
        otp.setEmail(email);
        otp.setCode(code);
        otp.setPurpose(purpose);
        otp.setExpiresAt(LocalDateTime.now().plusMinutes(expirationMinutes));
        otpRepo.save(otp);

        // Fire-and-forget: email is sent on a background thread via Brevo HTTP API
        // so the HTTP response returns immediately after the OTP is persisted.
        emailDispatch.sendOtpEmail(null, email, code, expirationMinutes);

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

    /** Purge expired OTP entries daily at 4 AM */
    @Scheduled(cron = "0 0 4 * * *")
    @Transactional
    public void purgeExpiredOtps() {
        otpRepo.deleteByExpiresAtBefore(LocalDateTime.now());
        log.info("[OTP] Purged expired OTP entries");
    }
}
