package com.iuep.config;

import com.iuep.security.JwtAuthFilter;
import com.iuep.security.RateLimitFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final RateLimitFilter rateLimitFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, RateLimitFilter rateLimitFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.rateLimitFilter = rateLimitFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // ── Security Headers ──
            .headers(headers -> headers
                .contentTypeOptions(cto -> {})                      // X-Content-Type-Options: nosniff
                .frameOptions(fo -> fo.deny())                      // X-Frame-Options: DENY
                .referrerPolicy(rp -> rp.policy(
                        ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                .permissionsPolicy(pp -> pp.policy(
                        "camera=(), microphone=(), geolocation=()"))
            )

            .authorizeHttpRequests(auth -> auth
                // Static resources
                .requestMatchers("/", "/*.html", "/*.css", "/*.js",
                        "/Figma/**", "/uploads/**", "/ws/**").permitAll()
                // Auth endpoints (public)
                .requestMatchers("/api/auth/**").permitAll()
                // Public data
                .requestMatchers(HttpMethod.GET, "/api/posts/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/courses/**").permitAll()
                // User data requires authentication
                .requestMatchers(HttpMethod.GET, "/api/users/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/id-application/**").authenticated()
                // Grades require authentication
                .requestMatchers(HttpMethod.GET, "/api/grades/**").authenticated()
                // Admin endpoints require ADMIN role
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                // Protected write operations
                .requestMatchers(HttpMethod.PATCH, "/api/users/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/id-application").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/id-application/*/report-lost").authenticated()
                // Default: deny unauthenticated access to anything else
                .anyRequest().authenticated()
            )
            // Rate limiter runs first, then JWT auth
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
