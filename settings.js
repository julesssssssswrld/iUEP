'use strict';

/**
 * @fileoverview Account settings logic for the iUEP portal.
 * Handles profile image upload, username changes, and preference persistence.
 */

/* ──────────────────────────────────────────────
 *  DOM References
 * ────────────────────────────────────────────── */

let settingsDOM = {};

function cacheSettingsDom() {
    settingsDOM = {
        profileImg: document.querySelector('#profile-image-container img'),
        uploadBtn: document.getElementById('upload-photo-btn'),
        removeBtn: document.getElementById('remove-photo-btn'),
        fileInput: document.getElementById('profile-photo-input'),
        username: document.getElementById('settings-username'),
        stuId: document.getElementById('settings-stu-id'),
        firstName: document.getElementById('settings-first-name'),
        lastName: document.getElementById('settings-last-name'),
        darkModeToggle: document.getElementById('dark-mode-toggle'),
        saveBtn: document.getElementById('save-settings-btn'),
        savePopover: document.getElementById('save-confirmation'),
    };
}

/* ──────────────────────────────────────────────
 *  Load Settings
 * ────────────────────────────────────────────── */

function loadSettings() {
    const currentUser = (typeof getSessionUser === 'function') ? getSessionUser() : null;
    const savedSettings = getStorage('iUEP_settings', {});

    // Populate fields
    settingsDOM.username.value = savedSettings.username || currentUser?.username || '';
    settingsDOM.stuId.value = currentUser?.stu_id || '000000';
    settingsDOM.firstName.value = currentUser?.first_name || 'Student';
    settingsDOM.lastName.value = currentUser?.last_name || '';

    // Profile image
    const profilePic = savedSettings.profilePic || currentUser?.profile_pic || PLACEHOLDER_IMG;
    settingsDOM.profileImg.src = profilePic;

    // Dark mode toggle
    const theme = localStorage.getItem('theme') || 'light';
    settingsDOM.darkModeToggle.checked = theme === 'dark';
}

/* ──────────────────────────────────────────────
 *  Profile Image
 * ────────────────────────────────────────────── */

function handleProfileUpload() {
    settingsDOM.fileInput.click();
}

function handleProfileFileChange() {
    const file = settingsDOM.fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        settingsDOM.profileImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleProfileRemove() {
    settingsDOM.profileImg.src = PLACEHOLDER_IMG;
    settingsDOM.fileInput.value = '';
}

/* ──────────────────────────────────────────────
 *  Dark Mode Toggle
 * ────────────────────────────────────────────── */

function handleDarkModeToggle() {
    const isDark = settingsDOM.darkModeToggle.checked;
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    if (typeof updateThemeIcons === 'function') {
        updateThemeIcons(theme);
    }
}

/* ──────────────────────────────────────────────
 *  Save
 * ────────────────────────────────────────────── */

function saveSettings() {
    const settings = {
        username: settingsDOM.username.value.trim(),
        profilePic: settingsDOM.profileImg.src,
    };

    setStorage('iUEP_settings', settings);

    // Update session if exists
    const currentUser = (typeof getSessionUser === 'function') ? getSessionUser() : null;
    if (currentUser) {
        currentUser.username = settings.username;
        currentUser.profile_pic = settings.profilePic;
        setSessionUser(currentUser);
    }

    // Show confirmation
    settingsDOM.savePopover.showPopover();

    // Refresh displayed user info in header
    if (typeof updateUserInfo === 'function') {
        updateUserInfo();
    }
}

/* ──────────────────────────────────────────────
 *  Initialization
 * ────────────────────────────────────────────── */

function initSettings() {
    cacheSettingsDom();

    // Event listeners
    settingsDOM.uploadBtn.addEventListener('click', handleProfileUpload);
    settingsDOM.fileInput.addEventListener('change', handleProfileFileChange);
    settingsDOM.removeBtn.addEventListener('click', handleProfileRemove);
    settingsDOM.darkModeToggle.addEventListener('change', handleDarkModeToggle);
    settingsDOM.saveBtn.addEventListener('click', saveSettings);

    loadSettings();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettings);
} else {
    initSettings();
}
