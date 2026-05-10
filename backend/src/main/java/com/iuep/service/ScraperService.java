package com.iuep.service;

import com.iuep.entity.FbPost;
import com.iuep.entity.ScrapeLog;
import com.iuep.repository.FbPostRepository;
import com.iuep.repository.ScrapeLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/**
 * Facebook scraper service using Apify. Currently DISABLED to save credits.
 * The scraping logic is ported from the Node.js fb-scraper.js.
 */
@Service
public class ScraperService {

    private static final Logger log = LoggerFactory.getLogger(ScraperService.class);
    private static final int STALE_HOURS = 6;

    private final FbPostRepository postRepo;
    private final ScrapeLogRepository logRepo;

    @Value("${app.apify.token:}")
    private String apifyToken;

    public ScraperService(FbPostRepository postRepo, ScrapeLogRepository logRepo) {
        this.postRepo = postRepo;
        this.logRepo = logRepo;
    }

    public List<FbPost> getPosts(String department) {
        if (department == null || "all".equals(department)) {
            return postRepo.findAllByOrderByPostDateDesc();
        }
        return postRepo.findByDepartmentOrderByPostDateDesc(department);
    }

    public List<ScrapeLog> getScrapeStatus() {
        return logRepo.findTop10ByOrderByScrapedAtDesc();
    }

    /** Scrapes if data is stale (>6 hours old). Currently disabled. */
    public void scrapeIfStale(String department) {
        // TEMPORARILY DISABLED TO SAVE CREDITS
        log.info("[Scraper] Scraper is temporarily disabled. Skipping check.");
    }

    /** Force-triggers a scrape. Currently disabled. */
    public Map<String, Object> forceScrape(String department) {
        // TEMPORARILY DISABLED TO SAVE CREDITS
        log.info("[Scraper] Scraper is temporarily disabled. Skipping force scrape.");
        return Map.of("success", true, "postsScraped", 0);
    }

    private boolean isStale(String department) {
        var latest = logRepo.findFirstByDepartmentAndStatusOrderByScrapedAtDesc(department, "success");
        if (latest.isEmpty()) return true;
        long hours = ChronoUnit.HOURS.between(latest.get().getScrapedAt(), LocalDateTime.now());
        return hours >= STALE_HOURS;
    }
}
