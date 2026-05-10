package com.iuep.service;

import com.iuep.repository.IdApplicationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Scheduled service that scans the uploads directory and removes files
 * that are not referenced by any ID application record in the database.
 */
@Service
public class UploadCleanupService {

    private static final Logger log = LoggerFactory.getLogger(UploadCleanupService.class);

    private final IdApplicationRepository appRepo;

    @Value("${app.upload-dir}")
    private String uploadDir;

    public UploadCleanupService(IdApplicationRepository appRepo) {
        this.appRepo = appRepo;
    }

    /** Run once on startup after a 30-second delay */
    @PostConstruct
    public void scheduleStartupCleanup() {
        Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "upload-cleanup-startup");
            t.setDaemon(true);
            return t;
        }).schedule(this::cleanup, 30, TimeUnit.SECONDS);
    }

    /** Run daily at 3 AM */
    @Scheduled(cron = "0 0 3 * * *")
    public void scheduledCleanup() {
        cleanup();
    }

    public void cleanup() {
        log.info("[UploadCleanup] Starting orphan file scan...");
        int deleted = 0;
        int scanned = 0;

        Path idAppDir = Paths.get(uploadDir, "id-applications").toAbsolutePath().normalize();
        File dir = idAppDir.toFile();

        if (!dir.exists() || !dir.isDirectory()) {
            log.info("[UploadCleanup] Upload directory does not exist, skipping: {}", idAppDir);
            return;
        }

        File[] files = dir.listFiles();
        if (files == null) return;

        for (File file : files) {
            if (file.isDirectory()) continue;
            scanned++;

            // The DB stores paths like: /uploads/id-applications/filename.jpg
            String dbPath = "/uploads/id-applications/" + file.getName();

            boolean referenced = appRepo.existsByPhotoPathOrCorPath(dbPath, dbPath);
            if (!referenced) {
                if (file.delete()) {
                    deleted++;
                    log.info("[UploadCleanup] Deleted orphan: {}", file.getName());
                } else {
                    log.warn("[UploadCleanup] Failed to delete: {}", file.getName());
                }
            }
        }

        log.info("[UploadCleanup] Done. Scanned={}, Deleted={}", scanned, deleted);
    }
}
