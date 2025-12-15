'use strict';

const HEADER_HTML = `
    <div id="header">
        <div id="header-left">
            <a href="index.html">
                <img src="Figma/iUEP Logo 2 - Transparent.png" alt="" id="iUEP-logo-img">
            </a>
            <div>
                <h2>UNIVERSITY OF EASTERN PHILIPPINES</h2>
                <p>University Town, Northern Samar</p>
            </div>
        </div>

        <div id="header-right">
             <button id="theme-toggle-btn" class="theme-toggle" aria-label="Toggle Dark Mode">
                <svg id="sun-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000">
                    <path d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z"/>
                </svg>
                <svg id="moon-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000" style="display: none;">
                    <path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z"/>
                </svg>
            </button>

            <button id="user-preview-trigger" popovertarget="user-options-popup">
                <div id="user-preview">
                    <div id="user-profile-image-container">
                        <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="" id="user-profile-image">
                    </div>
                    <div>
                        <h2>Hello, <span class="display-username">User</span>!</h2>
                        <p class="sub-text display-stu-id">000000</p>
                    </div>
                    <svg id="user-preview-options" class="theme-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--text-primary)">
                        <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
                    </svg>
                </div>
            </button>
            <div class="content-box" id="user-options-popup" popover>
                <div id="popup-top-section">
                    <div id="popup-profile-img-container">
                        <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="">
                    </div>
                    <div id="popup-user-info">
                        <h3 class="display-user-name">
                            User
                        </h3>
                        <p class="sub-text display-stu-id">
                            000000
                        </p>
                    </div>
                </div>
                <div class="divider-horizontal" id="user-options-popup-divider">
                </div>
                <div id="popup-bottom-section">
                    <a href="account-settings.html">
                        <div class="popup-options">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000" class="theme-icon"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z"/></svg>
                            <p class="main-text">Account Settings</p>
                        </div>
                    </a>
                    
                    <a href="#" onclick="logoutUser()">
                        <div class="popup-options">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000" class="theme-icon"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z"/></svg>
                            <p class="main-text">Log out</p>
                        </div>
                    </a>

                </div>
            </div>
        </div>
`;

function loadHeader() {
    if (!document.getElementById('header')) {
        document.body.insertAdjacentHTML('afterbegin', HEADER_HTML);
        // Bind the toggle button click
        const toggleBtn = document.getElementById('theme-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }
    }

    // Suppress favicon
    if (!document.querySelector('link[rel="icon"]')) {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = 'data:,';
        document.head.appendChild(link);
    }
}

function updateUserInfo() {
    // Rely on utils.js helper
    if (typeof getSessionUser !== 'function') {
        console.error('utils.js not loaded. Cannot get session user.');
        return;
    }

    const currentUser = getSessionUser();
    if (!currentUser) return;

    // Format Name
    const middleInitial = currentUser.middle_name ? `${currentUser.middle_name.charAt(0)}.` : '';
    const fullName = [currentUser.first_name, middleInitial, currentUser.last_name].filter(Boolean).join(' ');

    const dataMap = [
        { selector: '.display-username', text: currentUser.username },
        { selector: '.display-user-name', text: fullName },
        { selector: '.display-stu-id', text: currentUser.stu_id }
    ];

    const placeholderImg = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const profilePicSrc = currentUser.profile_pic || placeholderImg;

    const avatarSelectors = [
        '#user-profile-image',
        '#popup-profile-img-container img',
        '#profile-image-container img'
    ];

    avatarSelectors.forEach(selector => {
        const img = document.querySelector(selector);
        if (img) {
            img.src = profilePicSrc;
            img.onerror = () => { img.src = placeholderImg; };
        }
    });

    dataMap.forEach(item => {
        const elements = document.querySelectorAll(item.selector);
        elements.forEach(el => {
            if (el.tagName === 'INPUT') {
                el.placeholder = item.text;
            } else {
                el.textContent = item.text;
            }
        });
    });
}

function displayCurrentDate() {
    const dateParagraph = document.getElementById('currentDateDisplay');
    // Check if element exists and formatDate function exists (from utils.js)
    if (dateParagraph && typeof formatDate === 'function') {
        dateParagraph.textContent = formatDate();
    }
}

function logoutUser() {
    clearSessionUser(); // from utils.js
    window.location.href = 'login.html';
}

// TOGGLE THEME FUNCTIONALITY
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Default to light if nothing saved, unless system prefers dark
    // For now, let's favor light mode as default if nothing saved, matching original design
    let theme = savedTheme ? savedTheme : (prefersDark ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcons(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcons(newTheme);
}

function updateThemeIcons(theme) {
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    if (sunIcon && moonIcon) {
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

    // Update other icons if needed
    const icons = document.querySelectorAll('.theme-icon, .nav-icons, .popup-options svg');
    icons.forEach(icon => {
        // Use CSS variable instead of manual fill if possible, but forced update here helps
        // Actually, CSS variables should handle most of this.
    });
}

// Expose logout for HTML onclicks
window.logoutUser = logoutUser;
window.toggleTheme = toggleTheme;

// Initialize
function initLayout() {
    loadHeader();
    initTheme(); // Initialize theme
    updateUserInfo();
    displayCurrentDate();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLayout);
} else {
    initLayout();
}
