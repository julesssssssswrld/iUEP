'use strict';

/**
 * @fileoverview Facebook scraper module using Apify.
 * Handles smart check-before-scrape logic to conserve free credits.
 * Downloads and caches post images locally to avoid Facebook CDN expiry.
 * Enforces a 50-post-per-source retention limit.
 * Currently configured for The Pillar (UEP's university publication).
 */

const { ApifyClient } = require('apify-client');
const { getDb } = require('./db');
const https = require('https');
const http = require('http');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/* ──────────────────────────────────────────────
 *  Configuration
 * ────────────────────────────────────────────── */

/** How many hours before data is considered stale and a re-scrape is triggered. */
const STALE_HOURS = 6;

/** Maximum posts retained per department (oldest beyond this are auto-deleted). */
const MAX_POSTS_PER_DEPT = 50;

/** Apify actor ID for the official Facebook Posts Scraper. */
const ACTOR_ID = 'apify/facebook-posts-scraper';

/** Directory for cached FB post images. */
const FB_IMG_DIR = path.join(__dirname, 'uploads', 'fb-posts');

/**
 * Facebook page sources to scrape.
 * Add more entries here later to expand to other departments.
 */
const FB_SOURCES = [
    { department: 'upmao', deptLabel: 'University Publication and Media Affairs', url: 'https://www.facebook.com/upmao.uepdates', maxPosts: 5 },
    { department: 'usc', deptLabel: 'University Student Council', url: 'https://www.facebook.com/uepusc', maxPosts: 5 },
    { department: 'pillar', deptLabel: 'The Pillar', url: 'https://www.facebook.com/thepillaryueps', maxPosts: 5 },
    { department: 'cs', deptLabel: 'College of Science', url: 'https://www.facebook.com/CSSCmaincampus', maxPosts: 5 },
    { department: 'coe', deptLabel: 'College of Engineering', url: 'https://www.facebook.com/profile.php?id=61558987494744', maxPosts: 5 },
    { department: 'cnahs', deptLabel: 'CNAHS', url: 'https://www.facebook.com/UEPCNAHSSC', maxPosts: 5 },
    { department: 'coed', deptLabel: 'College of Education', url: 'https://www.facebook.com/coedscofficialpage', maxPosts: 5 },
    { department: 'cba', deptLabel: 'College of Business Administration', url: 'https://www.facebook.com/profile.php?id=61581402380824', maxPosts: 5 },
    { department: 'cvm', deptLabel: 'College of Veterinary Medicine', url: 'https://www.facebook.com/profile.php?id=100063861617609', maxPosts: 5 },
    { department: 'cac', deptLabel: 'College of Arts and Communications', url: 'https://www.facebook.com/PitadUEP', maxPosts: 5 },
    { department: 'ccj', deptLabel: 'College of Criminal Justice', url: 'https://www.facebook.com/profile.php?id=61566404038660', maxPosts: 5 },
    { department: 'col', deptLabel: 'College of Law', url: 'https://www.facebook.com/uepalas', maxPosts: 5 },
    { department: 'cafnr', deptLabel: 'CAFNR', url: 'https://www.facebook.com/profile.php?id=61579302993318', maxPosts: 5 }
];

/* ──────────────────────────────────────────────
 *  Ensure Directories Exist
 * ────────────────────────────────────────────── */

function ensureUploadDirs() {
    if (!fs.existsSync(FB_IMG_DIR)) {
        fs.mkdirSync(FB_IMG_DIR, { recursive: true });
    }
}

/* ──────────────────────────────────────────────
 *  Apify Client
 * ────────────────────────────────────────────── */

/**
 * Returns an initialized ApifyClient, or null if no token is configured.
 * @returns {ApifyClient|null}
 */
function getApifyClient() {
    const token = process.env.APIFY_TOKEN;
    if (!token) {
        console.warn('[FB-Scraper] APIFY_TOKEN not set — scraping disabled.');
        return null;
    }
    return new ApifyClient({ token });
}

/* ──────────────────────────────────────────────
 *  Image Downloading & Compression
 * ────────────────────────────────────────────── */

/**
 * Downloads an image from a URL and returns it as a Buffer.
 * Follows redirects (up to 5). Returns null on failure.
 * @param {string} url - The image URL.
 * @returns {Promise<Buffer|null>}
 */
function downloadImage(url) {
    return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;
        const request = client.get(url, { timeout: 15000 }, (res) => {
            // Follow redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadImage(res.headers.location).then(resolve);
            }

            if (res.statusCode !== 200) {
                res.resume(); // Drain response
                return resolve(null);
            }

            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', () => resolve(null));
        });

        request.on('error', () => resolve(null));
        request.on('timeout', () => {
            request.destroy();
            resolve(null);
        });
    });
}

/**
 * Downloads a Facebook CDN image, compresses it, and saves locally.
 * @param {string} cdnUrl - The Facebook CDN image URL.
 * @param {string} postId - The Facebook post ID (used as filename).
 * @returns {Promise<string|null>} Local path (relative to project root) or null on failure.
 */
async function cacheImage(cdnUrl, postId) {
    if (!cdnUrl) return null;

    // Sanitize the post ID for use as a filename
    const safeId = postId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeId}.jpg`;
    const filePath = path.join(FB_IMG_DIR, filename);

    // Skip if already cached
    if (fs.existsSync(filePath)) {
        return `/uploads/fb-posts/${filename}`;
    }

    try {
        const buffer = await downloadImage(cdnUrl);
        if (!buffer || buffer.length === 0) return null;

        // Resize to max 600px wide and compress as JPEG quality 75
        await sharp(buffer)
            .resize({ width: 600, withoutEnlargement: true })
            .jpeg({ quality: 75 })
            .toFile(filePath);

        console.log(`[FB-Scraper] Cached image: ${filename} (${Math.round(fs.statSync(filePath).size / 1024)}KB)`);
        return `/uploads/fb-posts/${filename}`;
    } catch (err) {
        console.warn(`[FB-Scraper] Failed to cache image for post ${postId}:`, err.message);
        return null;
    }
}

/* ──────────────────────────────────────────────
 *  Post Retention (50 per department)
 * ────────────────────────────────────────────── */

/**
 * Prunes old posts beyond the retention limit for a department.
 * Deletes both DB rows and orphaned image files.
 * @param {string} department
 */
function pruneOldPosts(department) {
    const db = getDb();

    // Find posts that exceed the retention limit
    const stale = db.prepare(`
        SELECT id, fb_post_id, image_url FROM fb_posts
        WHERE department = ?
          AND id NOT IN (
              SELECT id FROM fb_posts
              WHERE department = ?
              ORDER BY post_date DESC
              LIMIT ?
          )
    `).all(department, department, MAX_POSTS_PER_DEPT);

    if (stale.length === 0) return;

    // Delete image files from disk
    for (const post of stale) {
        if (post.image_url && post.image_url.startsWith('/uploads/')) {
            const imgPath = path.join(__dirname, post.image_url);
            try {
                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            } catch (_) { /* ignore cleanup errors */ }
        }
    }

    // Delete DB rows
    const ids = stale.map((p) => p.id);
    db.prepare(`DELETE FROM fb_posts WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);

    console.log(`[FB-Scraper] Pruned ${stale.length} old posts for "${department}".`);
}

/* ──────────────────────────────────────────────
 *  Staleness Check
 * ────────────────────────────────────────────── */

/**
 * Checks whether a department's data is stale (older than STALE_HOURS).
 * @param {string} department
 * @returns {boolean} True if a scrape is needed.
 */
function isStale(department) {
    const db = getDb();
    const latest = db.prepare(`
        SELECT scraped_at FROM scrape_log
        WHERE department = ? AND status = 'success'
        ORDER BY scraped_at DESC
        LIMIT 1
    `).get(department);

    if (!latest) return true; // Never scraped

    const scrapedAt = new Date(latest.scraped_at + 'Z'); // SQLite stores UTC without Z
    const ageMs = Date.now() - scrapedAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    return ageHours >= STALE_HOURS;
}

/* ──────────────────────────────────────────────
 *  Scrape Execution
 * ────────────────────────────────────────────── */

/**
 * Runs the Apify Facebook Posts Scraper for a given source config.
 * Downloads and caches images locally, then prunes old posts.
 * @param {Object} source - An entry from FB_SOURCES.
 * @returns {Promise<number>} Number of posts stored.
 */
async function runScrape(source) {
    // ---- TEMPORARILY DISABLED TO SAVE CREDITS ----
    console.log(`[FB-Scraper] Scraper is temporarily disabled. Skipping "${source.deptLabel}".`);
    return 0;
    // ----------------------------------------------

    const client = getApifyClient();
    if (!client) return 0;

    ensureUploadDirs();

    console.log(`[FB-Scraper] Starting scrape for "${source.deptLabel}" (${source.url})...`);

    const db = getDb();

    // Optimization: Only fetch posts newer than what we already have
    const latestPost = db.prepare(`
        SELECT post_date FROM fb_posts
        WHERE department = ?
        ORDER BY post_date DESC
        LIMIT 1
    `).get(source.department);

    let minPostDate;
    if (latestPost && latestPost.post_date) {
        minPostDate = latestPost.post_date.split('T')[0];
        console.log(`[FB-Scraper] Using minPostDate: ${minPostDate} to save credits.`);
    }

    try {
        const run = await client.actor(ACTOR_ID).call({
            startUrls: [{ url: source.url }],
            resultsLimit: source.maxPosts,
            ...(minPostDate && { minPostDate }),
        });

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        console.log(`[FB-Scraper] Received ${items.length} posts from Apify.`);

        const upsert = db.prepare(`
            INSERT OR REPLACE INTO fb_posts
                (fb_post_id, department, dept_label, page_name, post_text, post_url, image_url, post_date, likes, comments, shares, scraped_at)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        // Process posts — download images in parallel then insert all
        const processedPosts = await Promise.all(items.map(async (post) => {
            // Extract the best image URL from Apify data
            let cdnUrl = null;
            if (post.media && post.media.length > 0) {
                cdnUrl = post.media[0].thumbnail || post.media[0].photo_image?.uri || null;
            }

            // Download and cache the image locally
            const localPath = await cacheImage(cdnUrl, post.postId);

            return {
                postId: post.postId,
                pageName: post.pageName || source.deptLabel,
                text: post.text || '',
                url: post.url || post.topLevelUrl || '',
                imageUrl: localPath,  // Local path instead of CDN URL
                time: post.time || null,
                likes: post.likes || 0,
                comments: post.comments || 0,
                shares: post.shares || 0,
            };
        }));

        // Insert all posts in a transaction
        const insertMany = db.transaction((posts) => {
            for (const post of posts) {
                upsert.run(
                    post.postId,
                    source.department,
                    source.deptLabel,
                    post.pageName,
                    post.text,
                    post.url,
                    post.imageUrl,
                    post.time,
                    post.likes,
                    post.comments,
                    post.shares
                );
            }
        });

        insertMany(processedPosts);

        // Prune posts beyond the 50-per-department limit
        pruneOldPosts(source.department);

        // Log successful scrape
        db.prepare(`
            INSERT INTO scrape_log (department, post_count, status)
            VALUES (?, ?, 'success')
        `).run(source.department, items.length);

        console.log(`[FB-Scraper] Stored ${items.length} posts for "${source.deptLabel}".`);
        return items.length;

    } catch (err) {
        console.error(`[FB-Scraper] Scrape failed for "${source.deptLabel}":`, err.message);

        // Log failed scrape
        db.prepare(`
            INSERT INTO scrape_log (department, post_count, status)
            VALUES (?, 0, 'error')
        `).run(source.department);

        return 0;
    }
}

/* ──────────────────────────────────────────────
 *  Public API
 * ────────────────────────────────────────────── */

/**
 * Scrapes a department only if its data is stale (>STALE_HOURS old) or missing.
 * @param {string} [department] - Department key, or undefined to check all sources.
 * @returns {Promise<number>} Total posts scraped (0 if data was fresh).
 */
async function scrapeIfStale(department) {
    const sources = department
        ? FB_SOURCES.filter((s) => s.department === department)
        : FB_SOURCES;

    let total = 0;
    for (const source of sources) {
        if (isStale(source.department)) {
            total += await runScrape(source);
        } else {
            console.log(`[FB-Scraper] "${source.deptLabel}" data is fresh — skipping scrape.`);
        }
    }
    return total;
}

/**
 * Forces a scrape regardless of staleness.
 * @param {string} [department] - Department key, or undefined to scrape all.
 * @returns {Promise<number>} Total posts scraped.
 */
async function forceScrape(department) {
    const sources = department
        ? FB_SOURCES.filter((s) => s.department === department)
        : FB_SOURCES;

    let total = 0;
    for (const source of sources) {
        total += await runScrape(source);
    }
    return total;
}

/**
 * Returns the configured source list (for API introspection).
 * @returns {Object[]}
 */
function getSources() {
    return FB_SOURCES.map(({ department, deptLabel, url }) => ({ department, deptLabel, url }));
}

module.exports = { scrapeIfStale, forceScrape, getSources, FB_SOURCES };
