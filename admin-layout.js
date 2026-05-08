'use strict';

/**
 * @fileoverview Admin layout module for the iUEP portal.
 * Injects the admin-specific header (with role badge) and sidebar.
 * Reuses the shared theme system from utils.js.
 */

/* ----------------------------------------------
 *  Admin Navigation Configuration
 * ---------------------------------------------- */

const ADMIN_NAV_ITEMS = [
    {
        id: 'admin-queue',
        label: 'Application Queue',
        href: 'admin-id.html',
        icon: 'M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Zm120-40h400v-20q0-42-42.5-71T520-400q-75 0-117.5 29T360-300v20Zm200-160q33 0 56.5-23.5T640-520q0-33-23.5-56.5T560-600q-33 0-56.5 23.5T480-520q0 33 23.5 56.5T560-440Z',
    },
];

/* ----------------------------------------------
 *  SVG Icon Templates (reused from student layout)
 * ---------------------------------------------- */

const ADMIN_ICONS = {
    sun: `<svg id="sun-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000">
            <path d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z"/>
        </svg>`,
    moon: `<svg id="moon-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000" style="display: none;">
            <path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z"/>
        </svg>`,
};

const PLACEHOLDER_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/* ----------------------------------------------
 *  HTML Templates
 * ---------------------------------------------- */

function buildAdminHeaderHTML() {
    return `
    <header id="header">
        <div id="header-left">
            <a href="admin-id.html">
                <img src="Figma/iUEP Logo 2 - Transparent.png" alt="iUEP Logo" id="iUEP-logo-img">
            </a>
            <div class="header-left-text">
                <h2>UNIVERSITY OF EASTERN PHILIPPINES</h2>
                <p>University Town, Northern Samar</p>
            </div>
        </div>

        <div id="header-right">
            <button id="theme-toggle-btn" class="theme-toggle" aria-label="Toggle Dark Mode">
                ${ADMIN_ICONS.sun}
                ${ADMIN_ICONS.moon}
            </button>

            <div id="user-preview">
                <div id="user-profile-image-container">
                    <img src="${PLACEHOLDER_IMG}" alt="Admin" id="user-profile-image">
                </div>
                <div class="user-preview-text">
                    <h2>ID Office Admin</h2>
                    <span class="admin-badge">Admin</span>
                </div>
            </div>
        </div>
    </header>`;
}

function buildAdminSidebarHTML(currentPageId) {
    const navLinks = ADMIN_NAV_ITEMS.map((item) => {
        const isActive = item.id === currentPageId;
        const iconFill = isActive ? 'var(--uep-blue)' : 'var(--text-secondary)';

        return `
            <a href="${item.href}">
                <div class="nav-item">
                    <svg class="nav-icons" ${isActive ? 'id="current-page"' : ''} xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="${iconFill}">
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

/* ----------------------------------------------
 *  Theme (reuses same localStorage key as student)
 * ---------------------------------------------- */

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

/* ----------------------------------------------
 *  Admin Session Guard
 * ---------------------------------------------- */

function getAdminSession() {
    try {
        return JSON.parse(sessionStorage.getItem('iUEP_admin_session'));
    } catch {
        return null;
    }
}

function requireAdminAuth() {
    const session = getAdminSession();
    if (!session || !session.isAdmin) {
        window.location.href = 'admin-login.html';
        return null;
    }
    return session;
}

function adminLogout() {
    sessionStorage.removeItem('iUEP_admin_session');
    window.location.href = 'admin-login.html';
}

/* ----------------------------------------------
 *  Injection & Init
 * ---------------------------------------------- */

function loadAdminHeader() {
    const session = getAdminSession();

    if (!document.getElementById('header')) {
        document.body.insertAdjacentHTML('afterbegin', buildAdminHeaderHTML());

        // Update display name from session
        if (session) {
            const nameEl = document.querySelector('#user-preview .user-preview-text h2');
            if (nameEl) nameEl.textContent = session.displayName || 'Admin';
        }

        const toggleBtn = document.getElementById('theme-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }

        // Add logout on admin name click
        const userPreview = document.getElementById('user-preview');
        if (userPreview) {
            userPreview.style.cursor = 'pointer';
            userPreview.title = 'Click to logout';
            userPreview.addEventListener('click', adminLogout);
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

function loadAdminSidebar() {
    const currentPageId = document.body.dataset.page || 'admin-queue';
    const mainEl = document.querySelector('.main');
    if (mainEl) {
        mainEl.insertAdjacentHTML('afterbegin', buildAdminSidebarHTML(currentPageId));
    }
}

function initAdminLayout() {
    // Guard: redirect if not authenticated as admin
    if (!requireAdminAuth()) return;

    loadAdminHeader();
    loadAdminSidebar();
    initTheme();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminLayout);
} else {
    initAdminLayout();
}
