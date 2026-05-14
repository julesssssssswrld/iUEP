package com.iuep.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Sends emails on a background thread so the HTTP response returns immediately.
 * Must be a separate bean (not a private method in OtpService) for Spring's
 * proxy-based @Async to work correctly.
 */
@Service
public class EmailDispatchService {

    private static final Logger log = LoggerFactory.getLogger(EmailDispatchService.class);
    private final JavaMailSender mailSender;

    public EmailDispatchService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendOtpEmail(String fromEmail, String toEmail, String code, int expirationMinutes) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromEmail);
            msg.setTo(toEmail);
            msg.setSubject("iUEP Verification Code");
            msg.setText("Your verification code is: " + code + "\n\nThis code expires in " + expirationMinutes + " minutes.");
            mailSender.send(msg);
            log.info("[OTP] Sent verification code to {}", toEmail);
        } catch (Exception e) {
            log.warn("[OTP] Failed to send email to {}. Code: {} — Error: {}", toEmail, code, e.getMessage());
        }
    }
}
