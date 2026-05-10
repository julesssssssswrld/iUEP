package com.iuep.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "scrape_log")
public class ScrapeLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String department;

    @Column(name = "scraped_at")
    private LocalDateTime scrapedAt;

    @Column(name = "post_count", columnDefinition = "INTEGER DEFAULT 0")
    private Integer postCount = 0;

    @Column(columnDefinition = "TEXT DEFAULT 'success'")
    private String status = "success";

    @PrePersist
    protected void onCreate() {
        if (scrapedAt == null) scrapedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public LocalDateTime getScrapedAt() { return scrapedAt; }
    public void setScrapedAt(LocalDateTime scrapedAt) { this.scrapedAt = scrapedAt; }
    public Integer getPostCount() { return postCount; }
    public void setPostCount(Integer postCount) { this.postCount = postCount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
