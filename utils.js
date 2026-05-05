'use strict';

/**
 * @fileoverview Shared UI utility functions for the iUEP portal.
 * Provides date formatting and theme management.
 */

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
