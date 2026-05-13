package com.iuep.service;

import com.iuep.entity.FbPost;
import com.iuep.entity.ScrapeLog;
import com.iuep.repository.FbPostRepository;
import com.iuep.repository.ScrapeLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Facebook scraper service using the Apify Facebook Posts Scraper actor.
 * Scrapes public FB pages for campus department updates and persists them.
 *
 * Toggle {@link #SCRAPER_ENABLED} to turn scraping on/off.
 */
@Service
public class ScraperService {

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  SCRAPER MASTER SWITCH                                       ║
    // ║  Set to true  → live Apify scraping is active                ║
    // ║  Set to false → all scraping is disabled (saves credits)     ║
    // ╚══════════════════════════════════════════════════════════════╝
    private static final boolean SCRAPER_ENABLED = false;

    private static final Logger log = LoggerFactory.getLogger(ScraperService.class);
    private static final int STALE_HOURS = 6;
    private static final int RESULTS_PER_PAGE = 10;

    private final FbPostRepository postRepo;
    private final ScrapeLogRepository logRepo;
    private final RestTemplate restTemplate;

    /** Guard to prevent overlapping scrape runs */
    private final AtomicBoolean scrapeInProgress = new AtomicBoolean(false);

    @Value("${app.apify.token:}")
    private String apifyToken;

    @Value("${app.apify.actor-id:apify~facebook-posts-scraper}")
    private String actorId;

    public ScraperService(FbPostRepository postRepo, ScrapeLogRepository logRepo) {
        this.postRepo = postRepo;
        this.logRepo = logRepo;
        this.restTemplate = new RestTemplate();
    }

    // ──────────────────────────────────────────────
    //  Department → Facebook Page Configuration
    // ──────────────────────────────────────────────

    private record DeptConfig(String url, String label) {}

    private static final Map<String, DeptConfig> DEPARTMENTS = Map.ofEntries(
        Map.entry("upmao",  new DeptConfig("https://www.facebook.com/upmao.uepdates",               "University Publication & Media Affairs")),
        Map.entry("usc",    new DeptConfig("https://www.facebook.com/uepusc",                        "University Student Council")),
        Map.entry("cs",     new DeptConfig("https://www.facebook.com/CSSCmaincampus",                "College of Science")),
        Map.entry("coe",    new DeptConfig("https://www.facebook.com/profile.php?id=61558987494744", "College of Engineering")),
        Map.entry("cnahs",  new DeptConfig("https://www.facebook.com/UEPCNAHSSC",                   "CNAHS")),
        Map.entry("coed",   new DeptConfig("https://www.facebook.com/coedscofficialpage",            "College of Education")),
        Map.entry("cba",    new DeptConfig("https://www.facebook.com/profile.php?id=61581402380824", "College of Business Admin")),
        Map.entry("cvm",    new DeptConfig("https://www.facebook.com/profile.php?id=100063861617609","College of Vet Medicine")),
        Map.entry("cac",    new DeptConfig("https://www.facebook.com/PitadUEP",                      "College of Arts & Comm")),
        Map.entry("ccj",    new DeptConfig("https://www.facebook.com/profile.php?id=61566404038660", "College of Criminal Justice")),
        Map.entry("col",    new DeptConfig("https://www.facebook.com/uepalas",                       "College of Law")),
        Map.entry("cafnr",  new DeptConfig("https://www.facebook.com/profile.php?id=61579302993318", "CAFNR")),
        Map.entry("pillar", new DeptConfig("https://www.facebook.com/thepillaryueps", "The Pillar"))
    );

    // ──────────────────────────────────────────────
    //  Public API
    // ──────────────────────────────────────────────

    /** Returns whether the scraper toggle is currently enabled. */
    public boolean isScraperEnabled() {
        return SCRAPER_ENABLED;
    }

    /** Returns all known department keys. */
    public Set<String> getDepartmentKeys() {
        return DEPARTMENTS.keySet();
    }

    /** Fetch persisted posts, optionally filtered by department. */
    public List<FbPost> getPosts(String department) {
        if (department == null || "all".equals(department)) {
            return postRepo.findAllByOrderByPostDateDesc();
        }
        return postRepo.findByDepartmentOrderByPostDateDesc(department);
    }

    /** Returns recent scrape log entries. */
    public List<ScrapeLog> getScrapeStatus() {
        return logRepo.findTop10ByOrderByScrapedAtDesc();
    }

    /**
     * Background check: scrapes a department if its data is stale (>6h old).
     * Fire-and-forget — runs asynchronously so the API response isn't delayed.
     */
    public void scrapeIfStale(String department) {
        if (!SCRAPER_ENABLED) {
            log.debug("[Scraper] Scraper is disabled. Skipping staleness check.");
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                if (department != null) {
                    if (isStale(department)) {
                        executeScrape(department);
                    }
                } else {
                    // Check all departments
                    for (String dept : DEPARTMENTS.keySet()) {
                        if (isStale(dept)) {
                            executeScrape(dept);
                        }
                    }
                }
            } catch (Exception e) {
                log.error("[Scraper] Background scrape failed: {}", e.getMessage(), e);
            }
        });
    }

    /**
     * Force-triggers an immediate scrape for a specific department or all departments.
     * Returns a summary of results.
     */
    public Map<String, Object> forceScrape(String department) {
        if (!SCRAPER_ENABLED) {
            log.info("[Scraper] Scraper is disabled. Skipping force scrape.");
            return Map.of("success", false, "scraperEnabled", false,
                          "message", "Scraper is currently disabled. Set SCRAPER_ENABLED = true in ScraperService.java to enable.");
        }

        if (apifyToken == null || apifyToken.isBlank()) {
            return Map.of("success", false, "message", "Apify token is not configured.");
        }

        int totalScraped = 0;
        List<String> depts = (department != null && DEPARTMENTS.containsKey(department))
                ? List.of(department)
                : new ArrayList<>(DEPARTMENTS.keySet());

        for (String dept : depts) {
            totalScraped += executeScrape(dept);
        }

        return Map.of("success", true, "postsScraped", totalScraped,
                       "departments", depts.size());
    }

    // ──────────────────────────────────────────────
    //  Scheduled Auto-Refresh
    // ──────────────────────────────────────────────

    /**
     * Runs every 6 hours. Scrapes all departments whose data is stale.
     * Guarded by an AtomicBoolean to prevent overlapping runs.
     */
    @Scheduled(fixedRate = 6 * 60 * 60 * 1000, initialDelay = 60_000)
    public void scheduledScrape() {
        if (!SCRAPER_ENABLED) return;

        if (!scrapeInProgress.compareAndSet(false, true)) {
            log.info("[Scraper] Scheduled scrape skipped — another scrape is already running.");
            return;
        }

        try {
            log.info("[Scraper] Scheduled scrape starting for all departments...");
            int total = 0;
            for (String dept : DEPARTMENTS.keySet()) {
                if (isStale(dept)) {
                    total += executeScrape(dept);
                }
            }
            log.info("[Scraper] Scheduled scrape complete. Total posts upserted: {}", total);
        } catch (Exception e) {
            log.error("[Scraper] Scheduled scrape failed: {}", e.getMessage(), e);
        } finally {
            scrapeInProgress.set(false);
        }
    }

    // ──────────────────────────────────────────────
    //  Core Scrape Execution
    // ──────────────────────────────────────────────

    /**
     * Calls the Apify Facebook Posts Scraper for a single department,
     * parses the results, and upserts them into the database.
     *
     * @param department The department key (e.g. "upmao", "cs")
     * @return Number of posts upserted
     */
    @Transactional
    private int executeScrape(String department) {
        DeptConfig config = DEPARTMENTS.get(department);
        if (config == null) {
            log.warn("[Scraper] Unknown department: {}", department);
            return 0;
        }

        log.info("[Scraper] Scraping {} ({})...", department, config.label());

        try {
            // Build Apify request
            String url = String.format(
                "https://api.apify.com/v2/acts/%s/run-sync-get-dataset-items?token=%s",
                actorId, apifyToken
            );

            Map<String, Object> input = Map.of(
                "startUrls", List.of(Map.of("url", config.url())),
                "resultsLimit", RESULTS_PER_PAGE
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(input, headers);

            // Call Apify (synchronous, waits up to 300s for actor to finish)
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                url, HttpMethod.POST, entity,
                new ParameterizedTypeReference<>() {}
            );

            List<Map<String, Object>> items = response.getBody();
            if (items == null || items.isEmpty()) {
                log.info("[Scraper] No posts returned for {}", department);
                logScrape(department, 0, "success");
                return 0;
            }

            int upserted = 0;
            for (Map<String, Object> item : items) {
                if (upsertPost(item, department, config)) {
                    upserted++;
                }
            }

            logScrape(department, upserted, "success");
            log.info("[Scraper] {} — upserted {} posts", department, upserted);
            return upserted;

        } catch (Exception e) {
            log.error("[Scraper] Failed to scrape {}: {}", department, e.getMessage());
            logScrape(department, 0, "error: " + e.getMessage());
            return 0;
        }
    }

    /**
     * Maps an Apify response item to an FbPost entity and upserts it.
     * Returns true if a new or updated post was saved.
     */
    @SuppressWarnings("unchecked")
    private boolean upsertPost(Map<String, Object> item, String department, DeptConfig config) {
        // Extract the post ID — Apify may use "postId", "post_id", or "facebookId"
        String fbPostId = extractString(item, "postId", "post_id", "facebookId");
        if (fbPostId == null || fbPostId.isBlank()) {
            // Generate a fallback ID from the URL
            String postUrl = extractString(item, "url", "post_url", "postUrl");
            if (postUrl != null) {
                fbPostId = String.valueOf(postUrl.hashCode());
            } else {
                return false; // Can't identify this post
            }
        }

        // Find existing or create new
        FbPost post = postRepo.findByFbPostId(fbPostId).orElseGet(FbPost::new);
        post.setFbPostId(fbPostId);
        post.setDepartment(department);
        post.setDeptLabel(config.label());
        post.setPageName(extractString(item, "pageName", "author", "page_name"));
        post.setPostText(extractString(item, "text", "message", "postText", "post_text"));
        post.setPostUrl(extractString(item, "url", "post_url", "postUrl"));

        // ── Image extraction ──
        // Apify returns "media" as a List of Maps with nested structure:
        //   media[0].image.uri  or  media[0].thumbnail
        post.setImageUrl(extractImageUrl(item));

        // ── Date extraction ──
        // Apify returns "time" as a Unix timestamp in SECONDS (e.g. 1777967772)
        post.setPostDate(extractPostDate(item));

        post.setLikes(extractInt(item, "likes", "reactions_count"));
        post.setComments(extractInt(item, "comments_count", "comments"));
        post.setShares(extractInt(item, "reshare_count", "shares"));
        post.setScrapedAt(LocalDateTime.now());

        postRepo.save(post);
        return true;
    }

    // ──────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────

    private boolean isStale(String department) {
        var latest = logRepo.findFirstByDepartmentAndStatusOrderByScrapedAtDesc(department, "success");
        if (latest.isEmpty()) return true;
        long hours = ChronoUnit.HOURS.between(latest.get().getScrapedAt(), LocalDateTime.now());
        return hours >= STALE_HOURS;
    }

    private void logScrape(String department, int postCount, String status) {
        ScrapeLog entry = new ScrapeLog();
        entry.setDepartment(department);
        entry.setPostCount(postCount);
        entry.setStatus(status.length() > 255 ? status.substring(0, 255) : status);
        logRepo.save(entry);
    }

    /**
     * Extracts a string value from a map, trying multiple possible keys.
     * Returns null if none found.
     */
    private String extractString(Map<String, Object> map, String... keys) {
        for (String key : keys) {
            Object val = map.get(key);
            if (val != null && val instanceof String s && !s.isBlank()) {
                return s;
            }
        }
        return null;
    }

    /**
     * Extracts an integer value from a map, trying multiple possible keys.
     * Returns 0 if none found.
     */
    private int extractInt(Map<String, Object> map, String... keys) {
        for (String key : keys) {
            Object val = map.get(key);
            if (val instanceof Number n) return n.intValue();
            if (val instanceof String s) {
                try { return Integer.parseInt(s); } catch (NumberFormatException ignored) {}
            }
        }
        return 0;
    }

    /**
     * Extracts the post date from Apify response.
     * Apify returns "time" as a Unix timestamp in seconds.
     * Converts it to an ISO 8601 date string that the frontend can parse.
     */
    private String extractPostDate(Map<String, Object> item) {
        // Try "time" first (Unix seconds), then "timestamp", "date"
        for (String key : new String[]{"time", "timestamp", "date"}) {
            Object val = item.get(key);
            if (val instanceof Number n) {
                long epochSeconds = n.longValue();
                // Sanity: if it looks like milliseconds (> year 2100 in seconds), divide
                if (epochSeconds > 4_000_000_000L) {
                    epochSeconds = epochSeconds / 1000;
                }
                return java.time.Instant.ofEpochSecond(epochSeconds)
                        .atZone(java.time.ZoneOffset.UTC)
                        .toLocalDateTime()
                        .toString();
            }
            if (val instanceof String s && !s.isBlank()) {
                // Try parsing as a number (Unix timestamp as string)
                try {
                    long epochSeconds = Long.parseLong(s);
                    if (epochSeconds > 4_000_000_000L) epochSeconds = epochSeconds / 1000;
                    return java.time.Instant.ofEpochSecond(epochSeconds)
                            .atZone(java.time.ZoneOffset.UTC)
                            .toLocalDateTime()
                            .toString();
                } catch (NumberFormatException ignored) {
                    // Already an ISO string or similar — use as-is
                    return s;
                }
            }
        }
        return null;
    }

    /**
     * Extracts the first image URL from the Apify response.
     * Apify stores images in a "media" field as a List of Maps:
     *   media[0].image.uri  — full resolution
     *   media[0].thumbnail  — smaller version
     * Falls back to direct "image", "imageUrl", "image_url" keys.
     */
    @SuppressWarnings("unchecked")
    private String extractImageUrl(Map<String, Object> item) {
        // Try the nested "media" structure first
        Object media = item.get("media");
        if (media instanceof List<?> mediaList && !mediaList.isEmpty()) {
            Object first = mediaList.get(0);
            if (first instanceof Map<?, ?> mediaItem) {
                // Try media[0].image.uri
                Object imageObj = mediaItem.get("image");
                if (imageObj instanceof Map<?, ?> imageMap) {
                    Object uri = imageMap.get("uri");
                    if (uri instanceof String s && !s.isBlank()) return s;
                }
                // Fallback: media[0].thumbnail
                Object thumb = mediaItem.get("thumbnail");
                if (thumb instanceof String s && !s.isBlank()) return s;
            }
        }

        // Fallback to flat keys
        return extractString(item, "image", "imageUrl", "image_url");
    }
}

