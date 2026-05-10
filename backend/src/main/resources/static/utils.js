'use strict';

/**
 * @fileoverview Shared UI utility functions for the iUEP portal.
 * Provides date formatting, theme management, localStorage helpers,
 * and API fetch utilities.
 */

/* ----------------------------------------------
 *  API Helpers
 * ---------------------------------------------- */

/**
 * Fetches data from the backend API.
 * @param {string} endpoint - API path (e.g. '/users/202100001').
 * @param {RequestInit} [options={}] - Fetch options.
 * @returns {Promise<*>} Parsed JSON response.
 */
const apiFetch = async (endpoint, options = {}) => {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `/api${endpoint}${separator}_t=${Date.now()}`;
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
    }
    return res.json();
};

/* ──────────────────────────────────────────────
 *  Storage Helpers
 * ────────────────────────────────────────────── */

/** @type {Object<string, string>} Namespaced localStorage keys */
const STORAGE_KEYS = {
    PROFILES: 'iUEP_profiles',
    CURRENT_USER: 'iUEP_current_user',
    ID_APPLICATION: 'iUEP_id_application',
};

/**
 * Reads and parses a JSON value from localStorage.
 * @param {string} key - Storage key.
 * @param {*} [defaultVal={}] - Fallback if key is missing or corrupt.
 * @returns {*} Parsed value or defaultVal.
 */
const getStorage = (key, defaultVal = {}) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultVal;
    } catch (e) {
        console.error(`Error reading ${key}`, e);
        return defaultVal;
    }
};

/**
 * Serializes and writes a value to localStorage.
 * @param {string} key - Storage key.
 * @param {*} value - Value to store (will be JSON-stringified).
 */
const setStorage = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(`Error writing ${key}`, e);
    }
};

/**
 * Reads the current user from sessionStorage.
 * @returns {Object|null} User object or null.
 */
const getSessionUser = () => {
    try {
        const item = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        return item ? JSON.parse(item) : null;
    } catch {
        return null;
    }
};

/**
 * Writes the current user to sessionStorage.
 * @param {Object} user - User object to persist for the session.
 */
const setSessionUser = (user) => {
    try {
        sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } catch (e) {
        console.error('Error writing session', e);
    }
};

/**
 * Clears the current user from sessionStorage.
 */
const clearSessionUser = () => {
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

/* ──────────────────────────────────────────────
 *  Date Utilities
 * ────────────────────────────────────────────── */

/**
 * Formats a Date object into a human-readable string.
 * @param {Date} [date=new Date()] - The date to format.
 * @returns {string} Formatted date string (e.g. "May 6, 2026").
 */
const formatDate = (date = new Date()) => {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

/**
 * Converts a timestamp into a relative time string (e.g. "3 hours ago").
 * Falls back to a full date for timestamps older than 7 days.
 * @param {string|number} timestamp - ISO string or Unix timestamp.
 * @returns {string} Relative time description, or empty string if invalid.
 */
const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';

    const diff = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days >= 7) return formatDate(new Date(timestamp));
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return seconds < 30 ? 'Just now' : `${seconds} seconds ago`;
};

/* ──────────────────────────────────────────────
 *  Theme Management
 * ────────────────────────────────────────────── */

/**
 * Reads the saved theme from localStorage and applies it to the document.
 * Defaults to 'light' if no preference is stored.
 */
const applyTheme = () => {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
};

// Apply theme immediately to prevent flash of unstyled content
applyTheme();

/* ──────────────────────────────────────────────
 *  Password Visibility Toggle
 * ────────────────────────────────────────────── */

/**
 * SVG paths for the eye icons.
 */
const EYE_ICON = 'M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Z';
const EYE_OFF_ICON = 'M792-56 624-222q-35 11-71 16.5t-73 5.5q-146 0-266-81.5T40-500q21-53 55-98.5t75-82.5L56-792l56-56 736 736-56 56ZM480-320q11 0 21-1t20-4L305-541q-3 10-4 20t-1 21q0 75 52.5 127.5T480-320Zm292 18L645-428q7-14 11-28.5t4-43.5q0-75-52.5-127.5T480-680q-29 0-43.5 4T408-665L306-767q36-15 73.5-24t100.5-9q146 0 266 81.5T920-500q-26 64-67 117t-81 81ZM480-392q-45 0-76.5-31.5T372-500l108 108q-1 0-1 0 0 0 0 0Z';

/**
 * Initializes show/hide password toggles for all password inputs on the page.
 * Automatically wraps each input in a container and appends an eye icon button.
 */
function initPasswordToggles() {
    const passwordInputs = document.querySelectorAll('input[type="password"]');

    passwordInputs.forEach(input => {
        // Skip if already wrapped
        if (input.parentElement.classList.contains('pw-toggle-wrapper')) return;

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'pw-toggle-wrapper';

        // Insert wrapper before input, then move input inside
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'pw-toggle-btn';
        toggleBtn.setAttribute('aria-label', 'Show password');
        toggleBtn.setAttribute('tabindex', '-1');
        toggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="${EYE_ICON}"/></svg>`;

        wrapper.appendChild(toggleBtn);

        // Toggle handler
        toggleBtn.addEventListener('click', () => {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
            toggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="${isPassword ? EYE_OFF_ICON : EYE_ICON}"/></svg>`;
        });
    });
}

// Auto-init password toggles when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPasswordToggles);
} else {
    initPasswordToggles();
}
