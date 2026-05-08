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
