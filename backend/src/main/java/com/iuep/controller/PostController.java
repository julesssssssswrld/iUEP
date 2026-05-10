package com.iuep.controller;

import com.iuep.service.ScraperService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class PostController {

    private final ScraperService scraperService;

    public PostController(ScraperService scraperService) {
        this.scraperService = scraperService;
    }

    @GetMapping("/api/posts")
    public ResponseEntity<?> getPosts(@RequestParam(required = false) String dept) {
        var posts = scraperService.getPosts(dept);
        // Fire-and-forget background scrape check
        scraperService.scrapeIfStale(dept != null && !"all".equals(dept) ? dept : null);
        return ResponseEntity.ok(posts);
    }

    @GetMapping("/api/posts/status")
    public ResponseEntity<?> scrapeStatus() {
        return ResponseEntity.ok(scraperService.getScrapeStatus());
    }

    @PostMapping("/api/admin/scrape")
    public ResponseEntity<?> forceScrape(@RequestBody(required = false) Map<String, String> body) {
        String dept = body != null ? body.get("department") : null;
        return ResponseEntity.ok(scraperService.forceScrape(dept));
    }
}
