'use strict';

/**
 * @fileoverview Dashboard logic for the iUEP home page.
 * Fetches live posts from the server API (backed by Apify scraper + SQLite)
 * and manages the department-filtered updates feed.
 */

/* ──────────────────────────────────────────────
 *  Card Template (Uniform Horizontal)
 * ────────────────────────────────────────────── */

/**
 * Derives a short title from a Facebook post's text.
 * Uses the first line (up to 80 chars) as the title.
 * @param {string} text - Full post text.
 * @returns {string} Derived title.
 */
function deriveTitle(text) {
    if (!text) return 'Untitled Post';
    const firstLine = text.split('\n').find((line) => line.trim().length > 0) || text;
    return firstLine.length > 80 ? firstLine.substring(0, 77) + '...' : firstLine;
}

/**
 * Formats an ISO date string into a readable date.
 * @param {string} isoDate - ISO 8601 date string.
 * @returns {string} Formatted date string.
 */
function formatPostDate(isoDate) {
    if (!isoDate) return '';
    try {
        const date = new Date(isoDate);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        return isoDate;
    }
}

/**
 * Truncates text to a maximum length for the excerpt.
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
function truncateExcerpt(text, max = 200) {
    if (!text || text.length <= max) return text || '';
    return text.substring(0, max - 3) + '...';
}

/** Placeholder image when no post image is available */
const PLACEHOLDER_POST_IMG = 'data:image/svg+xml;base64,' + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect fill="#1a2332" width="400" height="300"/>
  <text fill="#4a5568" font-family="sans-serif" font-size="14" text-anchor="middle" x="200" y="155">No Image Available</text>
</svg>`);

/**
 * Renders a uniform horizontal feed card from API post data.
 * @param {Object} post - Post object from the API.
 * @returns {string} HTML string.
 */
function renderFeedCard(post) {
    const title = deriveTitle(post.post_text);
    const excerpt = truncateExcerpt(post.post_text);
    const date = formatPostDate(post.post_date);
    const image = post.image_url || PLACEHOLDER_POST_IMG;
    const link = post.post_url || '#';
    const deptLabel = post.dept_label || post.department || 'Unknown';

    return `
    <a href="${link}" target="_blank" rel="noopener noreferrer">
        <article class="feed-card content-box">
            <div class="feed-card-img">
                <img src="${image}" alt="${title}" onerror="this.src='${PLACEHOLDER_POST_IMG}'">
            </div>
            <div class="feed-card-body">
                <h3>${title}</h3>
                <p class="feed-card-excerpt">${excerpt}</p>
                <div class="feed-card-meta">
                    <p class="sub-text">${deptLabel}</p>
                    <p class="sub-text">${date}</p>
                </div>
            </div>
        </article>
    </a>`;
}

/* ──────────────────────────────────────────────
 *  Date Grouping
 * ────────────────────────────────────────────── */

/**
 * Groups posts by date and renders with date headers.
 * @param {Object[]} posts - Array of post objects from the API.
 * @returns {string} HTML string with date-grouped cards.
 */
function renderGroupedByDate(posts) {
    if (posts.length === 0) {
        return `<p class="empty-state sub-text">No updates available for this department.</p>`;
    }

    let html = '';
    let currentDate = '';

    posts.forEach((post) => {
        const dateStr = formatPostDate(post.post_date);
        if (dateStr !== currentDate) {
            currentDate = dateStr;
            html += `<div class="date-group-header"><span>${currentDate}</span></div>`;
        }
        html += renderFeedCard(post);
    });

    return html;
}

/* ──────────────────────────────────────────────
 *  Loading & Error States
 * ────────────────────────────────────────────── */

function renderLoadingState() {
    return `
    <div class="feed-loading" style="text-align: center; padding: 3rem 1rem;">
        <div class="loading-spinner" style="
            width: 40px; height: 40px; margin: 0 auto 1rem;
            border: 3px solid var(--border-color, #333);
            border-top-color: var(--uep-blue, #2563eb);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        "></div>
        <p class="sub-text">Loading campus updates...</p>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>`;
}

function renderErrorState(message) {
    return `
    <div class="feed-error" style="text-align: center; padding: 3rem 1rem;">
        <p class="sub-text" style="color: var(--text-secondary);">
            ⚠️ ${message || 'Unable to load updates. Please try again later.'}
        </p>
    </div>`;
}

/* ──────────────────────────────────────────────
 *  Feed Rendering (API-backed)
 * ────────────────────────────────────────────── */

/** Cached posts from the last successful fetch */
let cachedPosts = [];

/**
 * Fetches posts from the API and renders them.
 * @param {string} [dept='all'] - Department key or 'all'.
 */
async function renderFeed(dept = 'all') {
    const container = document.getElementById('recent-updates-container');
    if (!container) return;

    // Show loading only on first load (cache empty)
    if (cachedPosts.length === 0) {
        container.innerHTML = renderLoadingState();
    }

    try {
        const url = dept === 'all' ? '/api/posts' : `/api/posts?dept=${encodeURIComponent(dept)}`;
        const res = await fetch(url);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const posts = await res.json();
        cachedPosts = posts;

        container.innerHTML = renderGroupedByDate(posts);
    } catch (err) {
        console.error('[Dashboard] Failed to fetch posts:', err);

        // If we have cached data, keep showing it
        if (cachedPosts.length > 0) {
            container.innerHTML = renderGroupedByDate(
                dept === 'all' ? cachedPosts : cachedPosts.filter((p) => p.department === dept)
            );
        } else {
            container.innerHTML = renderErrorState();
        }
    }
}

/* ──────────────────────────────────────────────
 *  Department Sidebar Filter
 * ────────────────────────────────────────────── */

let activeFilter = 'all';

function initFilterBar() {
    const filterList = document.getElementById('dept-filter-list');
    if (!filterList) return;

    filterList.addEventListener('click', (e) => {
        const item = e.target.closest('.dept-filter-item');
        if (!item) return;

        filterList.querySelectorAll('.dept-filter-item').forEach((p) => p.classList.remove('active'));
        item.classList.add('active');

        activeFilter = item.dataset.dept;
        renderFeed(activeFilter);
    });
}

/* ──────────────────────────────────────────────
 *  Initialization
 * ────────────────────────────────────────────── */

function initDashboard() {
    renderFeed('all');
    initFilterBar();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}
