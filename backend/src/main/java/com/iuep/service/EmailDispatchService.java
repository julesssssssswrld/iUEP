package com.iuep.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

/**
 * Sends emails over SMTP (Spring's JavaMailSender) on a background thread so
 * the HTTP response returns immediately after the OTP is persisted.
 *
 * Configured through the spring.mail.* / app.mail.* properties, which read the
 * SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM, SMTP_SSL and
 * SMTP_STARTTLS environment variables.
 */
@Service
public class EmailDispatchService {

    private static final Logger log = LoggerFactory.getLogger(EmailDispatchService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Value("${app.mail.from:}")
    private String fromAddress;

    @Value("${app.mail.from-name:iUEP Connect}")
    private String fromName;

    public EmailDispatchService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendOtpEmail(String fromEmail, String toEmail, String code, int expirationMinutes) {
        if (smtpUsername == null || smtpUsername.isBlank()) {
            log.warn("[OTP] SMTP is not configured (SMTP_USERNAME / SMTP_PASSWORD missing); email not sent to {}. Code: {}",
                    toEmail, code);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());

            // Most SMTP providers (Gmail included) require From to be the authenticated account or a verified alias.
            String from = (fromAddress == null || fromAddress.isBlank()) ? smtpUsername : fromAddress;
            helper.setFrom(from, fromName);
            helper.setTo(toEmail);
            helper.setSubject("iUEP Verification Code");
            helper.setText("Your verification code is: %s%n%nThis code expires in %d minutes."
                    .formatted(code, expirationMinutes), false);

            mailSender.send(message);
            log.info("[OTP] Sent verification code to {} via SMTP", toEmail);
        } catch (Exception e) {
            log.warn("[OTP] Failed to send email to {}. Code: {} — Error: {}", toEmail, code, e.getMessage());
        }
    }
}
