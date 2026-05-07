'use strict';

/**
 * @fileoverview Facebook scraper module using Apify.
 * Handles smart check-before-scrape logic to conserve free credits.
 * Currently configured for The Pillar (UEP's university publication).
 */

const { ApifyClient } = require('apify-client');
const { getDb } = require('./db');

/* ──────────────────────────────────────────────
 *  Configuration
 * ────────────────────────────────────────────── */

/** How many hours before data is considered stale and a re-scrape is triggered. */
const STALE_HOURS = 6;

/** Apify actor ID for the official Facebook Posts Scraper. */
const ACTOR_ID = 'apify/facebook-posts-scraper';

/**
 * Facebook page sources to scrape.
 * Add more entries here later to expand to other departments.
 */
const FB_SOURCES = [
    {
        department: 'pillar',
        deptLabel: 'The Pillar',
        url: 'https://www.facebook.com/thepillaryueps',
        maxPosts: 5,
    },
    // Future: { department: 'usc', deptLabel: 'University Student Council', url: '...', maxPosts: 5 },
];

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
 * @param {Object} source - An entry from FB_SOURCES.
 * @returns {Promise<number>} Number of posts stored.
 */
async function runScrape(source) {
    const client = getApifyClient();
    if (!client) return 0;

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

        const insertMany = db.transaction((posts) => {
            for (const post of posts) {
                // Extract the best image: first media thumbnail, or null
                let imageUrl = null;
                if (post.media && post.media.length > 0) {
                    imageUrl = post.media[0].thumbnail || post.media[0].photo_image?.uri || null;
                }

                upsert.run(
                    post.postId,
                    source.department,
                    source.deptLabel,
                    post.pageName || source.deptLabel,
                    post.text || '',
                    post.url || post.topLevelUrl || '',
                    imageUrl,
                    post.time || null,
                    post.likes || 0,
                    post.comments || 0,
                    post.shares || 0
                );
            }
        });

        insertMany(items);

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
        const db = getDb();
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
