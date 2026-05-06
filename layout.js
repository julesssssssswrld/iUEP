'use strict';

/**
 * @fileoverview Shared layout module for the iUEP portal.
 * Dynamically injects the header, sidebar navigation, and manages
 * theme toggling across all pages.
 */

/* ──────────────────────────────────────────────
 *  Navigation Configuration
 * ────────────────────────────────────────────── */

/**
 * @typedef {Object} NavItem
 * @property {string} id    - Unique identifier matching the page's data-page attribute.
 * @property {string} label - Display text for the nav link.
 * @property {string} href  - URL the link navigates to.
 * @property {string} icon  - SVG path data for the Material icon.
 */

/** @type {NavItem[]} */
const NAV_ITEMS = [
    {
        id: 'home',
        label: 'Home',
        href: 'index.html',
        icon: 'M480-427ZM240-120q-50 0-85-35t-35-85v-240q0-24 9-46t26-39l240-240q17-18 39.5-26.5T480-840q23 0 45 8.5t40 26.5l240 240q17 17 26 39t9 46v240q0 50-35 85t-85 35H240Zm0-80h480q17 0 28.5-11.5T760-240v-240q0-8-3-15t-9-13L595-662l-59 58 144 144v180H280v-180l258-258-30-30q-8-8-15.5-10t-12.5-2q-5 0-12.5 2T452-748L212-508q-6 6-9 13t-3 15v240q0 17 11.5 28.5T240-200Zm120-160h240v-67L480-547 360-427v67Z',
    },
    {
        id: 'grades',
        label: 'Grades',
        href: 'grades.html',
        icon: 'M160-200h160v-320H160v320Zm240 0h160v-560H400v560Zm240 0h160v-240H640v240ZM80-120v-480h240v-240h320v320h240v400H80Z',
    },
    {
        id: 'id-production',
        label: 'ID Production',
        href: 'id-production.html',
        // badge/card icon
        icon: 'M560-440h200v-80H560v80Zm0-120h200v-80H560v80ZM200-320h320v-22q0-45-44-71.5T360-440q-72 0-116 26.5T200-342v22Zm160-160q33 0 56.5-23.5T440-560q0-33-23.5-56.5T360-640q-33 0-56.5 23.5T280-560q0 33 23.5 56.5T360-480ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Z',
    },
    {
        id: 'about',
        label: 'About',
        href: 'about.html',
        icon: 'M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z',
    },
];

/* ──────────────────────────────────────────────
 *  SVG Icon Templates
 * ────────────────────────────────────────────── */

const ICONS = {
    sun: `<svg id="sun-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000">
            <path d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z"/>
        </svg>`,
    moon: `<svg id="moon-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000" style="display: none;">
            <path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z"/>
        </svg>`,
    chevron: `<svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--text-primary)">
            <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
        </svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000" class="theme-icon"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z"/></svg>`,
    logout: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000" class="theme-icon"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z"/></svg>`,
};

/** Transparent 1×1 GIF used as a placeholder when no profile image is set. */
const PLACEHOLDER_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/* ──────────────────────────────────────────────
 *  HTML Templates
 * ────────────────────────────────────────────── */

/**
 * Generates the full header HTML string.
 * @returns {string} Header HTML markup.
 */
function buildHeaderHTML() {
    return `
    <header id="header">
        <div id="header-left">
            <a href="index.html">
                <img src="Figma/iUEP Logo 2 - Transparent.png" alt="iUEP Logo" id="iUEP-logo-img">
            </a>
            <div class="header-left-text">
                <h2>UNIVERSITY OF EASTERN PHILIPPINES</h2>
                <p>University Town, Northern Samar</p>
            </div>
        </div>

        <div id="header-right">
            <button id="theme-toggle-btn" class="theme-toggle" aria-label="Toggle Dark Mode">
                ${ICONS.sun}
                ${ICONS.moon}
            </button>

            <button id="user-preview-trigger" popovertarget="user-options-popup">
                <div id="user-preview">
                    <div id="user-profile-image-container">
                        <img src="${PLACEHOLDER_IMG}" alt="Profile" id="user-profile-image">
                    </div>
                    <div class="user-preview-text">
                        <h2>Hello, <span class="display-username">Student</span>!</h2>
                        <p class="sub-text display-stu-id">000000</p>
                    </div>
                    ${ICONS.chevron}
                </div>
            </button>

            <div class="content-box" id="user-options-popup" popover>
                <div id="popup-top-section">
                    <div id="popup-profile-img-container">
                        <img src="${PLACEHOLDER_IMG}" alt="Profile">
                    </div>
                    <div id="popup-user-info">
                        <h3 class="display-user-name">Student</h3>
                        <p class="sub-text display-stu-id">000000</p>
                    </div>
                </div>
                <div class="divider-horizontal" id="user-options-popup-divider"></div>
                <div id="popup-bottom-section">
                    <a href="account-settings.html">
                        <div class="popup-options">
                            ${ICONS.settings}
                            <p class="main-text">Account Settings</p>
                        </div>
                    </a>
                    <a href="#" id="logout-link" onclick="logoutUser()">
                        <div class="popup-options">
                            ${ICONS.logout}
                            <p class="main-text">Log Out</p>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    </header>`;
}

/**
 * Generates the sidebar navigation HTML based on the current page.
 * @param {string} currentPageId - The id of the active page.
 * @returns {string} Sidebar navigation HTML markup.
 */
function buildSidebarHTML(currentPageId) {
    const navLinks = NAV_ITEMS.map((item) => {
        const isActive = item.id === currentPageId;
        const activeAttr = isActive ? 'id="current-page"' : '';
        const iconFill = isActive ? 'var(--uep-blue)' : 'var(--text-secondary)';

        return `
            <a href="${item.href}">
                <div class="nav-item">
                    <svg class="nav-icons" ${activeAttr} xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="${iconFill}">
                        <path d="${item.icon}"/>
                    </svg>
                    <h2 ${isActive ? 'id="current-page"' : ''}>${item.label}</h2>
                </div>
            </a>`;
    }).join('');

    return `
    <nav id="left-nav">
        <div id="nav-button-container">
            ${navLinks}
        </div>
    </nav>`;
}

/* ──────────────────────────────────────────────
 *  Header & Navigation Injection
 * ────────────────────────────────────────────── */

/**
 * Injects the header at the top of the document body if it doesn't already exist.
 */
function loadHeader() {
    if (!document.getElementById('header')) {
        document.body.insertAdjacentHTML('afterbegin', buildHeaderHTML());

        const toggleBtn = document.getElementById('theme-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }
    }

    // Suppress favicon 404
    if (!document.querySelector('link[rel="icon"]')) {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = 'data:,';
        document.head.appendChild(link);
    }
}

/**
 * Injects the sidebar navigation based on the current page's data attribute.
 */
function loadSidebar() {
    const currentPageId = document.body.dataset.page || 'home';
    const mainEl = document.querySelector('.main');

    if (mainEl) {
        mainEl.insertAdjacentHTML('afterbegin', buildSidebarHTML(currentPageId));
    }
}

/* ──────────────────────────────────────────────
 *  User Info (Static Placeholder)
 * ────────────────────────────────────────────── */

/**
 * Populates user display fields with session data or static defaults.
 * Placeholder for future session/auth integration.
 */
function updateUserInfo() {
    const currentUser = (typeof getSessionUser === 'function') ? getSessionUser() : null;

    const defaults = {
        username: currentUser?.username || 'Student',
        fullName: currentUser
            ? [currentUser.first_name, currentUser.middle_name ? `${currentUser.middle_name.charAt(0)}.` : '', currentUser.last_name].filter(Boolean).join(' ')
            : 'Student',
        stuId: currentUser?.stu_id || '000000',
        profilePic: currentUser?.profile_pic || PLACEHOLDER_IMG,
    };

    const textMappings = [
        { selector: '.display-username', text: defaults.username },
        { selector: '.display-user-name', text: defaults.fullName },
        { selector: '.display-stu-id', text: defaults.stuId },
    ];

    textMappings.forEach(({ selector, text }) => {
        document.querySelectorAll(selector).forEach((el) => {
            if (el.tagName === 'INPUT') {
                el.placeholder = text;
            } else {
                el.textContent = text;
            }
        });
    });

    const avatarSelectors = [
        '#user-profile-image',
        '#popup-profile-img-container img',
        '#profile-image-container img',
    ];

    avatarSelectors.forEach((selector) => {
        const img = document.querySelector(selector);
        if (img) {
            img.src = defaults.profilePic;
            img.onerror = () => { img.src = PLACEHOLDER_IMG; };
        }
    });
}

/* ──────────────────────────────────────────────
 *  Date Display
 * ────────────────────────────────────────────── */

/**
 * Sets the current date into the designated display element (if it exists).
 */
function displayCurrentDate() {
    const dateEl = document.getElementById('currentDateDisplay');
    if (dateEl && typeof formatDate === 'function') {
        dateEl.textContent = formatDate();
    }
}

/* ──────────────────────────────────────────────
 *  Auth / Logout
 * ────────────────────────────────────────────── */

/**
 * Logs the user out by clearing session and redirecting.
 * Placeholder — will be wired when auth is implemented.
 */
function logoutUser() {
    if (typeof clearSessionUser === 'function') {
        clearSessionUser();
    }
    window.location.href = 'index.html';
}

// Expose for inline onclick handlers
window.logoutUser = logoutUser;

/* ──────────────────────────────────────────────
 *  Theme Toggle
 * ────────────────────────────────────────────── */

function initTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcons(theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcons(next);
}

/**
 * Shows/hides the sun and moon icons based on the active theme.
 * @param {string} theme - Either 'light' or 'dark'.
 */
function updateThemeIcons(theme) {
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    if (!sunIcon || !moonIcon) return;

    if (theme === 'dark') {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
        sunIcon.style.fill = 'var(--text-primary)';
    } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
        moonIcon.style.fill = 'var(--text-primary)';
    }
}

window.toggleTheme = toggleTheme;

/* ──────────────────────────────────────────────
 *  Initialization
 * ────────────────────────────────────────────── */

function initLayout() {
    loadHeader();
    loadSidebar();
    initTheme();
    updateUserInfo();
    displayCurrentDate();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLayout);
} else {
    initLayout();
}
