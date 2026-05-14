package com.iuep.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

/**
 * Sends emails via Brevo's HTTP API on a background thread.
 * Uses java.net.http.HttpClient (built into Java 11+) — no external dependencies.
 */
@Service
public class EmailDispatchService {

    private static final Logger log = LoggerFactory.getLogger(EmailDispatchService.class);
    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${app.brevo.api-key}")
    private String apiKey;

    @Value("${app.brevo.sender-email}")
    private String senderEmail;

    @Value("${app.brevo.sender-name:iUEP Connect}")
    private String senderName;

    @Async
    public void sendOtpEmail(String fromEmail, String toEmail, String code, int expirationMinutes) {
        try {
            String json = """
                {
                  "sender": {"name": "%s", "email": "%s"},
                  "to": [{"email": "%s"}],
                  "subject": "iUEP Verification Code",
                  "textContent": "Your verification code is: %s\\n\\nThis code expires in %d minutes."
                }
                """.formatted(senderName, senderEmail, toEmail, code, expirationMinutes);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BREVO_API_URL))
                    .header("api-key", apiKey)
                    .header("Content-Type", "application/json")
                    .header("accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("[OTP] Sent verification code to {} via Brevo", toEmail);
            } else {
                log.warn("[OTP] Brevo returned status {}: {}", response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("[OTP] Failed to send email to {}. Code: {} — Error: {}", toEmail, code, e.getMessage());
        }
    }
}
