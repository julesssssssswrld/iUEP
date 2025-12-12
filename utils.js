'use strict';

// Shared Constants
const STORAGE_KEYS = {
    COMMENTS: 'iUEP_discussion_comments',
    POSTS: 'iUEP_discussion_posts',
    REACTIONS: 'iUEP_discussion_reactions',
    ACTIVITY: 'iUEP_user_activity',
    PROFILES: 'iUEP_profiles',
    CURRENT_USER: 'iUEP_current_user'
};

// LocalStorage Helpers
const getStorage = (key, defaultVal = {}) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultVal;
    } catch (e) {
        console.error(`Error reading ${key}`, e);
        return defaultVal;
    }
};

const setStorage = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(`Error writing ${key}`, e);
    }
};

// SessionStorage Helpers
const getSessionUser = () => {
    try {
        const item = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        return item ? JSON.parse(item) : null;
    } catch {
        return null;
    }
};

const setSessionUser = (user) => {
    try {
        sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } catch (e) {
        console.error('Error writing session', e);
    }
};

const clearSessionUser = () => {
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

// Image Logic
const getDisplayImage = (item) => {
    if (item.isAnonymous || item.displayName === "Anonymous User") {
        return "";
    }

    const profiles = getStorage(STORAGE_KEYS.PROFILES, {});
    const profileValues = Object.values(profiles);
    let foundProfile = null;

    if (item.studentId) {
        foundProfile = profileValues.find(p => p.stu_id === item.studentId);
    }

    if (!foundProfile) {
        foundProfile = profileValues.find(p => p.username === item.displayName);
    }

    if (foundProfile) {
        return foundProfile.profile_pic || "";
    }

    const currentUser = getSessionUser();
    if (currentUser && currentUser.username === item.displayName) {
        return currentUser.profile_pic || "";
    }

    if (item.displayImgSrc && item.displayImgSrc.length < 500) {
        return item.displayImgSrc;
    }

    return "";
};

// Date Logic
const formatDate = (date = new Date()) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days >= 7) {
        return formatDate(new Date(timestamp));
    } else if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
        return seconds < 30 ? 'Just now' : `${seconds} seconds ago`;
    }
};
