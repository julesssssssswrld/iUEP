package com.iuep.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "fb_posts")
public class FbPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fb_post_id", unique = true, nullable = false)
    private String fbPostId;

    @Column(nullable = false)
    private String department;

    @Column(name = "dept_label", nullable = false)
    private String deptLabel;

    @Column(name = "page_name")
    private String pageName;

    @Column(name = "post_text", columnDefinition = "TEXT")
    private String postText;

    @Column(name = "post_url")
    private String postUrl;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "post_date")
    private String postDate;

    @Column(columnDefinition = "INTEGER DEFAULT 0")
    private Integer likes = 0;

    @Column(columnDefinition = "INTEGER DEFAULT 0")
    private Integer comments = 0;

    @Column(columnDefinition = "INTEGER DEFAULT 0")
    private Integer shares = 0;

    @Column(name = "scraped_at")
    private LocalDateTime scrapedAt;

    @PrePersist
    protected void onCreate() {
        if (scrapedAt == null) scrapedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFbPostId() { return fbPostId; }
    public void setFbPostId(String fbPostId) { this.fbPostId = fbPostId; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getDeptLabel() { return deptLabel; }
    public void setDeptLabel(String deptLabel) { this.deptLabel = deptLabel; }
    public String getPageName() { return pageName; }
    public void setPageName(String pageName) { this.pageName = pageName; }
    public String getPostText() { return postText; }
    public void setPostText(String postText) { this.postText = postText; }
    public String getPostUrl() { return postUrl; }
    public void setPostUrl(String postUrl) { this.postUrl = postUrl; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getPostDate() { return postDate; }
    public void setPostDate(String postDate) { this.postDate = postDate; }
    public Integer getLikes() { return likes; }
    public void setLikes(Integer likes) { this.likes = likes; }
    public Integer getComments() { return comments; }
    public void setComments(Integer comments) { this.comments = comments; }
    public Integer getShares() { return shares; }
    public void setShares(Integer shares) { this.shares = shares; }
    public LocalDateTime getScrapedAt() { return scrapedAt; }
    public void setScrapedAt(LocalDateTime scrapedAt) { this.scrapedAt = scrapedAt; }
}
