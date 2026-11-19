package com.iuep.service;

import com.iuep.entity.FbPost;
import com.iuep.entity.ScrapeLog;
import com.iuep.repository.FbPostRepository;
import com.iuep.repository.ScrapeLogRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Facebook scraper service using the Apify Facebook Posts Scraper actor.
 * Scrapes public FB pages for campus department updates and persists them.
 *
 * Toggle {@link #SCRAPER_ENABLED} to turn scraping on/off.
 *
 * Safety rails (the actor is billed per post, so mistakes cost real money):
 *  - Only ONE scrape sweep can run at a time, no matter what triggered it.
 *  - Nothing runs without an APIFY_TOKEN.
 *  - The token is sent in an Authorization header, never in the URL, and any
 *    error text that is logged or stored is redacted and kept short.
 *  - A department is only scraped when its data is stale; after a failure it
 *    is retried no sooner than {@link #RETRY_AFTER_FAILURE_MINUTES} minutes later.
 *  - After the first scrape of a department (latest {@link #INITIAL_RESULTS} posts), later runs
 *    ask Apify only for posts newer than the newest one already stored.
 *  - Auth/credit errors (401/402/403) and rate limits (429) pause ALL scraping,
 *    and so do repeated consecutive failures, instead of hammering Apify.
 *  - Page-load triggered checks are throttled and run on a dedicated worker
 *    thread, never on a request thread or the shared scheduler thread.
 *  - Every run has a network timeout and a per-run spending cap.
 */
@Service
public class ScraperService {

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  SCRAPER MASTER SWITCH                                       ║
    // ║  Set to true  → live Apify scraping is active                ║
    // ║  Set to false → all scraping is disabled (saves credits)     ║
    // ╚══════════════════════════════════════════════════════════════╝
    private static final boolean SCRAPER_ENABLED = true;

    private static final Logger log = LoggerFactory.getLogger(ScraperService.class);

    // ── Tunables ──
    /**
     * A department is re-checked once its last successful check is this old. Checks after the
     * first one are incremental (only posts newer than what we already hold), so they cost
     * about $0.001 per department plus $0.005 per genuinely new post.
     */
    private static final int STALE_HOURS = 24;
    /** After a failed run, wait this long before retrying that department. */
    private static final int RETRY_AFTER_FAILURE_MINUTES = 15;
    /** This many errors in a row inside one sweep aborts the sweep and pauses scraping. */
    private static final int MAX_CONSECUTIVE_ERRORS = 3;
    private static final Duration HALT_ON_ACCOUNT_ERROR = Duration.ofHours(6);   // 401 / 402 / 403
    private static final Duration HALT_ON_RATE_LIMIT = Duration.ofHours(1);      // 429
    private static final Duration HALT_ON_REPEATED_FAILURES = Duration.ofHours(1);
    /** Minimum gap between page-load triggered checks for the same department (or "all"). */
    private static final Duration MIN_TRIGGER_INTERVAL = Duration.ofMinutes(5);
    /** First-ever scrape of a department: just seed the feed with the latest few posts. */
    private static final int INITIAL_RESULTS = 5;
    /** Incremental scrape: safety cap on new posts per run (normally far fewer). */
    private static final int INCREMENTAL_MAX_RESULTS = 50;
    /** Apify-side cap for one actor run. */
    private static final int ACTOR_TIMEOUT_SECONDS = 240;
    /** Client-side read timeout: slightly above the actor cap so Apify answers first. */
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(ACTOR_TIMEOUT_SECONDS + 60);
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(10);
    /** Hard spending caps per actor run (pay-per-event pricing, ~$0.005 per post + $0.001 per run). */
    private static final String MAX_CHARGE_INITIAL_USD = "0.10";
    private static final String MAX_CHARGE_INCREMENTAL_USD = "0.30";

    /** Keys the actor may use for the post caption. */
    private static final String[] TEXT_KEYS = {"text", "message", "postText", "post_text"};

    private static final String STATUS_SUCCESS = "success";
    private static final String STATUS_EMPTY = "empty";

    private final FbPostRepository postRepo;
    private final ScrapeLogRepository logRepo;
    private final RestTemplate restTemplate;

    /** True while any sweep (scheduled, page-triggered or admin) is running. */
    private final AtomicBoolean scrapeInProgress = new AtomicBoolean(false);
    /** Last time a page-load check was accepted, per department key ("*" = all). */
    private final Map<String, Instant> lastTrigger = new ConcurrentHashMap<>();
    /** Background worker so scraping never blocks request threads or the scheduler. */
    private final ExecutorService worker = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "scraper-worker");
        t.setDaemon(true);
        return t;
    });
    /** Scraping is paused until this instant (circuit breaker). */
    private volatile Instant haltedUntil = Instant.EPOCH;

    @Value("${app.apify.token:}")
    private String apifyToken;

    @Value("${app.apify.actor-id:apify~facebook-posts-scraper}")
    private String actorId;

    @Value("${app.apify.base-url:https://api.apify.com}")
    private String baseUrl;

    public ScraperService(FbPostRepository postRepo, ScrapeLogRepository logRepo) {
        this.postRepo = postRepo;
        this.logRepo = logRepo;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT);
        factory.setReadTimeout(READ_TIMEOUT);
        this.restTemplate = new RestTemplate(factory);
    }

    @PreDestroy
    void shutdown() {
        worker.shutdownNow();
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

    /** True while the circuit breaker has scraping paused (bad token, no credits, rate limit, repeated failures). */
    public boolean isPaused() {
        return Instant.now().isBefore(haltedUntil);
    }

    /** True while a scrape sweep is running. */
    public boolean isRunning() {
        return scrapeInProgress.get();
    }

    /** Returns all known department keys. */
    public Set<String> getDepartmentKeys() {
        return DEPARTMENTS.keySet();
    }

    /** Fetch persisted posts, optionally filtered by department. */
    public List<FbPost> getPosts(String department) {
        List<FbPost> posts = (department == null || "all".equals(department))
                ? postRepo.findAllByOrderByPostDateDesc()
                : postRepo.findByDepartmentOrderByPostDateDesc(department);
        // Hide posts without a caption (e.g. rows stored before captionless posts were filtered out).
        return posts.stream()
                .filter(p -> p.getPostText() != null && !p.getPostText().isBlank())
                .toList();
    }

    /** Returns recent scrape log entries. */
    public List<ScrapeLog> getScrapeStatus() {
        return logRepo.findTop10ByOrderByScrapedAtDesc();
    }

    /**
     * Cheap, non-blocking check called on page loads: if the department's data is stale,
     * start a background sweep. Safe to call from every request — it is throttled, refuses
     * to start while another sweep is running or scraping is paused, and ignores unknown input.
     */
    public void scrapeIfStale(String department) {
        if (!canScrape()) return;
        if (department != null && !DEPARTMENTS.containsKey(department)) return;

        String key = department == null ? "*" : department;
        Instant now = Instant.now();
        Instant last = lastTrigger.get(key);
        if (last != null && Duration.between(last, now).compareTo(MIN_TRIGGER_INTERVAL) < 0) return;

        List<String> depts = department == null ? sortedDepartments() : List.of(department);
        if (startSweepAsync(depts)) {
            lastTrigger.put(key, now);
        }
    }

    /**
     * Force-triggers an immediate scrape for a specific department or all departments
     * (admin action). Ignores staleness and any pause, but still refuses to overlap
     * with a running sweep. Blocks until done and returns a summary.
     */
    public Map<String, Object> forceScrape(String department) {
        if (!SCRAPER_ENABLED) {
            log.info("[Scraper] Scraper is disabled. Skipping force scrape.");
            return Map.of("success", false, "scraperEnabled", false,
                          "message", "Scraper is currently disabled. Set SCRAPER_ENABLED = true in ScraperService.java to enable.");
        }

        if (!isConfigured()) {
            return Map.of("success", false, "message", "Apify token is not configured.");
        }

        List<String> depts;
        if (department == null || department.isBlank() || "all".equals(department)) {
            depts = sortedDepartments();
        } else if (DEPARTMENTS.containsKey(department)) {
            depts = List.of(department);
        } else {
            return Map.of("success", false, "message", "Unknown department.");
        }

        if (!scrapeInProgress.compareAndSet(false, true)) {
            return Map.of("success", false, "message", "A scrape is already running. Please try again shortly.");
        }
        try {
            haltedUntil = Instant.EPOCH; // an admin retry overrides the circuit breaker
            SweepResult r = runSweep(depts, true);
            return Map.of(
                    "success", r.attempted() > 0 && r.failed() < r.attempted(),
                    "postsScraped", r.posts(),
                    "departments", r.attempted(),
                    "failed", r.failed(),
                    "paused", r.halted());
        } finally {
            scrapeInProgress.set(false);
        }
    }

    // ──────────────────────────────────────────────
    //  Scheduled Auto-Refresh
    // ──────────────────────────────────────────────

    /**
     * Checks every 6 hours and scrapes only what is due: departments whose data is a week old,
     * or whose last attempt failed and has cooled down. Because staleness gates every run,
     * this costs the same as a weekly job but recovers from failures within hours.
     * The work itself runs on the scraper worker so the shared scheduler thread stays free
     * for the other scheduled jobs (OTP purge, upload cleanup).
     */
    @Scheduled(fixedDelay = 6 * 60 * 60 * 1000L, initialDelay = 60_000)
    public void scheduledScrape() {
        if (!canScrape()) return;
        if (!startSweepAsync(sortedDepartments())) {
            log.info("[Scraper] Scheduled scrape skipped — another scrape is already running.");
        }
    }

    // ──────────────────────────────────────────────
    //  Sweep Orchestration
    // ──────────────────────────────────────────────

    private record SweepResult(int posts, int attempted, int failed, boolean halted) {}

    private enum Result { SUCCESS, EMPTY, ERROR, FATAL }

    private record Outcome(Result result, int upserted) {}

    private boolean isConfigured() {
        return apifyToken != null && !apifyToken.isBlank();
    }

    private boolean canScrape() {
        return SCRAPER_ENABLED && isConfigured() && !isPaused();
    }

    private List<String> sortedDepartments() {
        return DEPARTMENTS.keySet().stream().sorted().toList();
    }

    private void halt(Duration duration, String reason) {
        haltedUntil = Instant.now().plus(duration);
        log.error("[Scraper] Pausing ALL scraping for {} — {}", duration, reason);
    }

    /**
     * Claims the single-sweep slot and runs a (staleness-gated) sweep on the worker thread.
     * Returns false if a sweep is already running or the worker is gone.
     */
    private boolean startSweepAsync(List<String> depts) {
        if (!scrapeInProgress.compareAndSet(false, true)) return false;
        try {
            worker.execute(() -> {
                try {
                    SweepResult r = runSweep(depts, false);
                    if (r.attempted() > 0) {
                        log.info("[Scraper] Sweep complete. attempted={}, failed={}, postsUpserted={}, paused={}",
                                r.attempted(), r.failed(), r.posts(), r.halted());
                    }
                } catch (Exception e) {
                    log.error("[Scraper] Sweep crashed: {}", redact(e.toString()));
                } finally {
                    scrapeInProgress.set(false);
                }
            });
            return true;
        } catch (RejectedExecutionException e) {
            scrapeInProgress.set(false);
            return false;
        }
    }

    /**
     * Scrapes the given departments one after another. Caller must hold the
     * {@code scrapeInProgress} slot. With {@code force=false} only due departments are scraped.
     */
    private SweepResult runSweep(List<String> depts, boolean force) {
        int posts = 0, attempted = 0, failed = 0, consecutiveErrors = 0;
        boolean halted = false;

        for (String dept : depts) {
            if (!force && !isDue(dept)) continue;
            if (isPaused()) { halted = true; break; }

            attempted++;
            Outcome outcome = executeScrape(dept);
            posts += outcome.upserted();

            switch (outcome.result()) {
                case SUCCESS -> consecutiveErrors = 0;
                case EMPTY -> { failed++; consecutiveErrors = 0; }
                case ERROR -> {
                    failed++;
                    if (++consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                        halt(HALT_ON_REPEATED_FAILURES, consecutiveErrors + " scrape errors in a row");
                        halted = true;
                    }
                }
                case FATAL -> { failed++; halted = true; }
            }
            if (halted) break;
        }
        return new SweepResult(posts, attempted, failed, halted);
    }

    // ──────────────────────────────────────────────
    //  Core Scrape Execution
    // ──────────────────────────────────────────────

    /**
     * Calls the Apify Facebook Posts Scraper for a single department,
     * parses the results, and upserts them into the database.
     * Never throws; every outcome is logged to scrape_log with a short, token-free status.
     */
    private Outcome executeScrape(String department) {
        DeptConfig config = DEPARTMENTS.get(department);
        if (config == null) {
            log.warn("[Scraper] Unknown department: {}", department);
            return new Outcome(Result.ERROR, 0);
        }

        String baseline = latestPostDate(department);
        log.info("[Scraper] Scraping {} ({}) {}...", department, config.label(),
                baseline == null ? "— first run, latest " + INITIAL_RESULTS + " posts" : "— posts newer than " + baseline);

        List<Map<String, Object>> items;
        try {
            // The token goes in a header (never the URL) so it cannot leak through error messages.
            String url = String.format("%s/v2/acts/%s/run-sync-get-dataset-items?timeout=%d&maxTotalChargeUsd=%s",
                    baseUrl, actorId, ACTOR_TIMEOUT_SECONDS,
                    baseline == null ? MAX_CHARGE_INITIAL_USD : MAX_CHARGE_INCREMENTAL_USD);

            // First run: newest few posts. Afterwards: everything newer than the newest stored
            // post (UTC ISO timestamp, as the actor expects), capped for safety.
            Map<String, Object> input = new HashMap<>();
            input.put("startUrls", List.of(Map.of("url", config.url())));
            if (baseline == null) {
                input.put("resultsLimit", INITIAL_RESULTS);
            } else {
                input.put("onlyPostsNewerThan", baseline);
                input.put("resultsLimit", INCREMENTAL_MAX_RESULTS);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apifyToken);

            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                url, HttpMethod.POST, new HttpEntity<>(input, headers),
                new ParameterizedTypeReference<>() {}
            );
            items = response.getBody();

        } catch (HttpStatusCodeException e) {
            int code = e.getStatusCode().value();
            log.warn("[Scraper] {} — Apify returned HTTP {}: {}", department, code, redact(e.getResponseBodyAsString()));
            logScrape(department, 0, "error: HTTP " + code);
            if (code == 401 || code == 402 || code == 403) {
                halt(HALT_ON_ACCOUNT_ERROR, "Apify rejected the request with HTTP " + code
                        + " (check APIFY_TOKEN and remaining credits)");
                return new Outcome(Result.FATAL, 0);
            }
            if (code == 429) {
                halt(HALT_ON_RATE_LIMIT, "Apify rate limit (HTTP 429)");
                return new Outcome(Result.FATAL, 0);
            }
            return new Outcome(Result.ERROR, 0);
        } catch (ResourceAccessException e) {
            log.warn("[Scraper] {} — network error or timeout: {}", department, redact(e.getMessage()));
            logScrape(department, 0, "error: network or timeout");
            return new Outcome(Result.ERROR, 0);
        } catch (Exception e) {
            log.error("[Scraper] {} — unexpected error: {}", department, redact(e.toString()));
            logScrape(department, 0, "error: " + e.getClass().getSimpleName());
            return new Outcome(Result.ERROR, 0);
        }

        if (items == null || items.isEmpty()) {
            if (baseline != null) {
                // Incremental run and nothing newer exists: that is a normal, successful check.
                log.info("[Scraper] {} — no new posts since {}", department, baseline);
                logScrape(department, 0, STATUS_SUCCESS);
                return new Outcome(Result.SUCCESS, 0);
            }
            log.info("[Scraper] No posts returned for {}", department);
            logScrape(department, 0, STATUS_EMPTY);
            return new Outcome(Result.EMPTY, 0);
        }

        int upserted = 0;
        int skipped = 0;
        int blank = 0;
        for (Map<String, Object> item : items) {
            try {
                // Posts with no caption would show up as "Untitled Post" — don't store them.
                if (extractString(item, TEXT_KEYS) == null) { blank++; continue; }
                if (upsertPost(item, department, config)) upserted++; else skipped++;
            } catch (Exception e) {
                // One malformed post must not discard the rest of the batch.
                skipped++;
                log.warn("[Scraper] {} — skipped a post: {}", department, redact(e.toString()));
            }
        }

        if (upserted == 0 && blank > 0 && skipped == 0) {
            // The page only returned caption-less posts: a valid answer, not a failure.
            log.info("[Scraper] {} — {} posts returned, all without a caption (ignored)", department, blank);
            logScrape(department, 0, STATUS_SUCCESS);
            return new Outcome(Result.SUCCESS, 0);
        }

        if (upserted == 0) {
            log.warn("[Scraper] {} — response had {} items but none were usable", department, items.size());
            logScrape(department, 0, "error: no usable posts in response");
            return new Outcome(Result.ERROR, 0);
        }

        logScrape(department, upserted, STATUS_SUCCESS);
        log.info("[Scraper] {} — upserted {} posts ({} skipped, {} without caption)", department, upserted, skipped, blank);
        return new Outcome(Result.SUCCESS, upserted);
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
        post.setPostText(extractString(item, TEXT_KEYS));
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

    /**
     * A department is due when its last successful check is at least {@link #STALE_HOURS} old (or
     * never happened) AND, if the most recent attempt failed, that attempt is old enough to retry.
     */
    private boolean isDue(String department) {
        LocalDateTime now = LocalDateTime.now();

        var lastSuccess = logRepo.findFirstByDepartmentAndStatusOrderByScrapedAtDesc(department, STATUS_SUCCESS);
        if (lastSuccess.isPresent()
                && ChronoUnit.HOURS.between(lastSuccess.get().getScrapedAt(), now) < STALE_HOURS) {
            return false;
        }

        var lastAttempt = logRepo.findFirstByDepartmentOrderByScrapedAtDesc(department);
        if (lastAttempt.isPresent() && !STATUS_SUCCESS.equals(lastAttempt.get().getStatus())
                && ChronoUnit.MINUTES.between(lastAttempt.get().getScrapedAt(), now) < RETRY_AFTER_FAILURE_MINUTES) {
            return false;
        }
        return true;
    }

    /**
     * Newest post date already stored for a department as a UTC ISO timestamp, or null if there
     * are no usable posts yet (which means: do the first-run seed scrape).
     */
    private String latestPostDate(String department) {
        LocalDateTime newest = null;
        for (FbPost p : postRepo.findByDepartmentOrderByPostDateDesc(department)) {
            String raw = p.getPostDate();
            if (raw == null) continue;
            try {
                LocalDateTime d = LocalDateTime.parse(raw);
                if (newest == null || d.isAfter(newest)) newest = d;
            } catch (Exception ignored) {
                // unparseable date string — ignore this post
            }
        }
        return newest == null ? null : newest.toString();
    }

    private void logScrape(String department, int postCount, String status) {
        try {
            ScrapeLog entry = new ScrapeLog();
            entry.setDepartment(department);
            entry.setPostCount(postCount);
            entry.setStatus(status.length() > 255 ? status.substring(0, 255) : status);
            logRepo.save(entry);
        } catch (Exception e) {
            log.error("[Scraper] Could not write scrape_log entry for {}: {}", department, redact(e.toString()));
        }
    }

    /** Strips the Apify token (and any token=... query value) from text and caps its length. */
    private String redact(String text) {
        if (text == null) return "";
        String s = text;
        if (apifyToken != null && !apifyToken.isBlank()) {
            s = s.replace(apifyToken, "***");
        }
        s = s.replaceAll("(?i)(token=)[^&\\s\"']+", "$1***");
        return s.length() > 300 ? s.substring(0, 300) + "…" : s;
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
