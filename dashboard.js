'use strict';

/**
 * @fileoverview Dashboard logic for the iUEP home page.
 * Manages the recent updates feed and department-filtered updates.
 * All post data is defined here as a central data source.
 */

/* ──────────────────────────────────────────────
 *  Post Data
 * ────────────────────────────────────────────── */

/**
 * @typedef {Object} Post
 * @property {string} id          - Unique post identifier.
 * @property {string} title       - Headline text.
 * @property {string} excerpt     - Short description / body text.
 * @property {string} department  - Department key (matches filter pill data-dept).
 * @property {string} deptLabel   - Human-readable department name.
 * @property {string} date        - Date string (used for display and sorting).
 * @property {string} dateISO     - ISO date for sorting (YYYY-MM-DD).
 * @property {string} image       - Path to the post image.
 * @property {string} link        - External URL for the full post.
 */

/** @type {Post[]} */
const POSTS = [
    {
        id: 'usc-entrance-exam',
        title: 'ENTRANCE EXAMINATION FOR FIRST YEAR APPLICANTS RESCHEDULING UPDATE',
        excerpt: 'The Office of Student Affairs-University Testing Center (OSA-UTC) announces the rescheduling of the entrance examination for incoming first-year applicants originally set on November 10, 2025, which was postponed due to Super Typhoon Uwan.',
        department: 'usc',
        deptLabel: 'University Student Council',
        date: 'November 11, 2025',
        dateISO: '2025-11-11',
        image: 'Figma/USC-announcement-1.jpg',
        link: 'https://www.facebook.com/share/p/1Bn9bgkrpL/',
    },
    {
        id: 'cvm-lost-wallet',
        title: 'CVM: LOST and PAWND ALERT!',
        excerpt: 'A black wallet belonging to Ms. Krizzell Del Rio, a Second Year DVM Student was lost yesterday, Thursday, November 20, at around 8:15 PM while she was traveling back home to UEP zone 1 in a public tricycle.',
        department: 'cvm',
        deptLabel: 'College of Veterinary Medicine',
        date: 'November 21, 2025',
        dateISO: '2025-11-21',
        image: 'Figma/CVM-update.jpg',
        link: 'https://www.facebook.com/share/p/191rt1Waif/',
    },
    {
        id: 'cssc-lost-phone',
        title: 'CS: ITEM LOST',
        excerpt: 'A Green Infinix Phone with a pink butterfly drawing as a wallpaper, was lost at the Academic Building at 9 AM, and the owner of this Axel Rose R. Caranog.',
        department: 'cssc',
        deptLabel: 'College of Science Student Council',
        date: 'November 20, 2025',
        dateISO: '2025-11-20',
        image: 'Figma/CS-update.jpg',
        link: 'https://www.facebook.com/share/p/1BvPRtGL9P/',
    },
    {
        id: 'usc-balik-kampus',
        title: 'BALIK KAMPUS 2025!',
        excerpt: 'UEPians, this September 22 is not just another Monday... It\'s a day-long BALIK KAMPUS 2025! From the Kabataan Caravan that fuels your ideas, to the State of the Student Address that sparks vision, the Turnover & Inaugural Ceremonies that mark a new chapter, and the Program & Org Fair that connects passions. Every moment is made for YOU.',
        department: 'usc',
        deptLabel: 'University Student Council',
        date: 'September 20, 2025',
        dateISO: '2025-09-20',
        image: 'Figma/USC-balik-kampus.jpg',
        link: 'https://www.facebook.com/share/p/1BD5ZPtm8o/',
    },
    {
        id: 'cnahs-litmus',
        title: 'CNAHS: LitMus Night 2025',
        excerpt: 'CNAHSians, let us come together for a vibrant celebration at LitMus Night 2025 at the UEP Volleyball Court, carrying the illuminating theme "Mockingjay Radiance: Girl on Fire."',
        department: 'cnahs',
        deptLabel: 'CNAHS',
        date: 'November 18, 2025',
        dateISO: '2025-11-18',
        image: 'Figma/CNAHS-update.jpg',
        link: 'https://www.facebook.com/share/p/19y2hkejpa/',
    },
    {
        id: 'coesc-letter',
        title: 'COE: LETTER OF REQUEST SUBMITTED & RECEIVED',
        excerpt: 'COESC formally submitted a Letter of Request addressed to the University President requesting essential improvements for the College of Engineering Student Center.',
        department: 'coesc',
        deptLabel: 'College of Engineering',
        date: 'November 14, 2025',
        dateISO: '2025-11-14',
        image: 'Figma/COE-update.jpg',
        link: 'https://www.facebook.com/share/p/1PF95aN5sP/',
    },
];

/* ──────────────────────────────────────────────
 *  Card Template (Uniform Horizontal)
 * ────────────────────────────────────────────── */

/**
 * Renders a uniform horizontal feed card.
 * @param {Post} post
 * @returns {string} HTML string.
 */
function renderFeedCard(post) {
    return `
    <a href="${post.link}" target="_blank" rel="noopener noreferrer">
        <article class="feed-card content-box">
            <div class="feed-card-img">
                <img src="${post.image}" alt="${post.title}">
            </div>
            <div class="feed-card-body">
                <h3>${post.title}</h3>
                <p class="feed-card-excerpt">${post.excerpt}</p>
                <div class="feed-card-meta">
                    <p class="sub-text">${post.deptLabel}</p>
                    <p class="sub-text">${post.date}</p>
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
 * @param {Post[]} posts - Array of posts (already sorted).
 * @returns {string} HTML string with date-grouped cards.
 */
function renderGroupedByDate(posts) {
    if (posts.length === 0) {
        return `<p class="empty-state sub-text">No updates available for this department.</p>`;
    }

    let html = '';
    let currentDate = '';

    posts.forEach((post) => {
        if (post.date !== currentDate) {
            currentDate = post.date;
            html += `<div class="date-group-header"><span>${currentDate}</span></div>`;
        }
        html += renderFeedCard(post);
    });

    return html;
}

/* ──────────────────────────────────────────────
 *  Feed Rendering
 * ────────────────────────────────────────────── */

/**
 * Renders the feed with optional department filter.
 * @param {string} [dept='all'] - Department key or 'all'.
 */
function renderFeed(dept = 'all') {
    const container = document.getElementById('recent-updates-container');
    if (!container) return;

    const filtered = dept === 'all'
        ? [...POSTS]
        : POSTS.filter((p) => p.department === dept);

    // Sort by date descending, take top 10
    filtered.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    const top10 = filtered.slice(0, 10);

    container.innerHTML = renderGroupedByDate(top10);
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
