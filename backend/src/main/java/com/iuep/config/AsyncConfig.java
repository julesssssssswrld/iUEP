package com.iuep.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Enables Spring's @Async support so email dispatch runs on a background thread.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}
