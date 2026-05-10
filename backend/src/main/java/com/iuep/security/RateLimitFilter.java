package com.iuep.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory rate limiter per client IP.
 * <p>
 * Tiers:
 * <ul>
 *   <li>OTP send: 3 requests per 5 minutes</li>
 *   <li>Auth endpoints: 10 requests per minute</li>
 *   <li>General API: 60 requests per minute</li>
 * </ul>
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    /** Token-bucket per IP+tier key */
    private final ConcurrentHashMap<String, RateBucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        // Only rate-limit API calls
        if (!path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String ip = getClientIp(request);
        Tier tier = classifyTier(path);

        String bucketKey = ip + ":" + tier.name();
        RateBucket bucket = buckets.computeIfAbsent(bucketKey, k -> new RateBucket(tier.maxTokens, tier.refillPerSecond));

        if (!bucket.tryConsume()) {
            log.warn("[RateLimit] 429 for IP={} path={} tier={}", ip, path, tier.name());
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Too many requests. Please wait a moment and try again.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private Tier classifyTier(String path) {
        if (path.contains("/auth/send-otp")) return Tier.OTP;
        if (path.startsWith("/api/auth/")) return Tier.AUTH;
        return Tier.GENERAL;
    }

    // ── Rate tiers ──

    private enum Tier {
        OTP(3, 3.0 / 300.0),        // 3 requests per 5 minutes (refill ~0.01/sec)
        AUTH(10, 10.0 / 60.0),       // 10 requests per minute
        GENERAL(60, 60.0 / 60.0);   // 60 requests per minute

        final int maxTokens;
        final double refillPerSecond;

        Tier(int maxTokens, double refillPerSecond) {
            this.maxTokens = maxTokens;
            this.refillPerSecond = refillPerSecond;
        }
    }

    // ── Token bucket implementation ──

    private static class RateBucket {
        private final int maxTokens;
        private final double refillPerSecond;
        private double tokens;
        private long lastRefillNanos;

        RateBucket(int maxTokens, double refillPerSecond) {
            this.maxTokens = maxTokens;
            this.refillPerSecond = refillPerSecond;
            this.tokens = maxTokens;
            this.lastRefillNanos = System.nanoTime();
        }

        synchronized boolean tryConsume() {
            refill();
            if (tokens >= 1) {
                tokens -= 1;
                return true;
            }
            return false;
        }

        private void refill() {
            long now = System.nanoTime();
            double elapsed = (now - lastRefillNanos) / 1_000_000_000.0;
            tokens = Math.min(maxTokens, tokens + elapsed * refillPerSecond);
            lastRefillNanos = now;
        }
    }
}
