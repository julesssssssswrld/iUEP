'use strict';

/**
 * @fileoverview Account settings logic for the iUEP portal.
 * Handles profile image upload, username changes (persisted to DB),
 * password changes (with email verification gate), and preference persistence.
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

        // Password change
        pwEmailDisplay: document.getElementById('pw-email-display'),
        pwSendCodeBtn: document.getElementById('pw-send-code-btn'),
        pwOtpInput: document.getElementById('pw-otp-input'),
        pwVerifyOtpBtn: document.getElementById('pw-verify-otp-btn'),
        pwVerifyMessage: document.getElementById('pw-verify-message'),
        pwVerifyGate: document.getElementById('pw-verify-gate'),
        pwChangeForm: document.getElementById('pw-change-form'),
        pwCurrent: document.getElementById('pw-current'),
        pwNew: document.getElementById('pw-new'),
        pwConfirm: document.getElementById('pw-confirm'),
        pwSaveBtn: document.getElementById('pw-save-btn'),
        pwChangeMessage: document.getElementById('pw-change-message'),
    };
}

/* ──────────────────────────────────────────────
 *  Inline Message Helpers
 * ────────────────────────────────────────────── */

function showInlineMsg(el, text, type = 'error') {
    el.textContent = text;
    el.className = `settings-inline-message show ${type}`;
}

function hideInlineMsg(el) {
    el.className = 'settings-inline-message';
    el.textContent = '';
}

/* ──────────────────────────────────────────────
 *  Load Settings
 * ────────────────────────────────────────────── */

function loadSettings() {
    const currentUser = (typeof getSessionUser === 'function') ? getSessionUser() : null;
    const savedSettings = getStorage('iUEP_settings', {});

    // Populate fields
    settingsDOM.username.value = savedSettings.username || currentUser?.username || '';
    settingsDOM.stuId.value = currentUser?.stu_id || '';
    settingsDOM.firstName.value = currentUser?.first_name || '';
    settingsDOM.lastName.value = currentUser?.last_name || '';

    // Profile image
    const profilePic = savedSettings.profilePic || currentUser?.profile_pic || PLACEHOLDER_IMG;
    settingsDOM.profileImg.src = profilePic;

    // Dark mode toggle
    const theme = localStorage.getItem('theme') || 'light';
    settingsDOM.darkModeToggle.checked = theme === 'dark';

    // Email display (masked)
    if (currentUser?.stu_id) {
        loadMaskedEmail(currentUser.stu_id);
    }
}

async function loadMaskedEmail(stuId) {
    try {
        const user = await apiFetch(`/users/${stuId}`);
        if (user?.email) {
            const [local, domain] = user.email.split('@');
            settingsDOM.pwEmailDisplay.value = local.charAt(0) + '***@' + domain;
        } else {
            settingsDOM.pwEmailDisplay.value = 'No email on file';
            settingsDOM.pwSendCodeBtn.disabled = true;
        }
    } catch {
        settingsDOM.pwEmailDisplay.value = 'Unable to load';
        settingsDOM.pwSendCodeBtn.disabled = true;
    }
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
 *  Save (Username + Profile Pic → DB + session)
 * ────────────────────────────────────────────── */

async function saveSettings() {
    const currentUser = (typeof getSessionUser === 'function') ? getSessionUser() : null;
    if (!currentUser) return;

    const newUsername = settingsDOM.username.value.trim();

    // Validate
    if (!newUsername || newUsername.length < 3) {
        alert('Username must be at least 3 characters.');
        settingsDOM.username.focus();
        return;
    }

    settingsDOM.saveBtn.disabled = true;
    settingsDOM.saveBtn.textContent = 'Saving...';

    try {
        // Update username in DB if changed
        if (newUsername !== currentUser.username) {
            await apiFetch(`/users/${currentUser.stu_id}/username`, {
                method: 'PATCH',
                body: JSON.stringify({ username: newUsername }),
            });
        }

        // Save profile pic + username locally
        const settings = {
            username: newUsername,
            profilePic: settingsDOM.profileImg.src,
        };
        setStorage('iUEP_settings', settings);

        // Update session
        currentUser.username = newUsername;
        currentUser.profile_pic = settings.profilePic;
        setSessionUser(currentUser);

        // Show toast
        settingsDOM.savePopover.showPopover();
        setTimeout(() => {
            try { settingsDOM.savePopover.hidePopover(); } catch (_) {}
        }, 2500);

        // Refresh header
        if (typeof updateUserInfo === 'function') {
            updateUserInfo();
        }

    } catch (err) {
        alert(err.message || 'Failed to save settings.');
    } finally {
        settingsDOM.saveBtn.disabled = false;
        settingsDOM.saveBtn.textContent = 'Save Changes';
    }
}

/* ──────────────────────────────────────────────
 *  Password Change — Email Verification Gate
 * ────────────────────────────────────────────── */

function handleSendCode() {
    hideInlineMsg(settingsDOM.pwVerifyMessage);

    if (settingsDOM.pwEmailDisplay.value.includes('No email') || settingsDOM.pwEmailDisplay.value.includes('Unable')) {
        showInlineMsg(settingsDOM.pwVerifyMessage, 'No email on file. Contact an administrator.');
        return;
    }

    showInlineMsg(settingsDOM.pwVerifyMessage, 'Verification code sent! (Placeholder — any 6-digit code works)', 'info');
    settingsDOM.pwOtpInput.disabled = false;
    settingsDOM.pwVerifyOtpBtn.disabled = false;
    settingsDOM.pwSendCodeBtn.textContent = 'Resend';
    settingsDOM.pwOtpInput.focus();
}

function handleVerifyOtp() {
    hideInlineMsg(settingsDOM.pwVerifyMessage);
    const code = settingsDOM.pwOtpInput.value.trim();

    if (!/^\d{6}$/.test(code)) {
        showInlineMsg(settingsDOM.pwVerifyMessage, 'Please enter a 6-digit code.');
        settingsDOM.pwOtpInput.focus();
        return;
    }

    // Placeholder — accept any 6-digit code
    settingsDOM.pwOtpInput.disabled = true;
    settingsDOM.pwVerifyOtpBtn.disabled = true;
    settingsDOM.pwSendCodeBtn.disabled = true;
    showInlineMsg(settingsDOM.pwVerifyMessage, 'Identity verified! You can now change your password.', 'success');

    // Show password form
    settingsDOM.pwVerifyGate.style.display = 'none';
    settingsDOM.pwChangeForm.style.display = '';
    settingsDOM.pwCurrent.focus();
}

async function handlePasswordSave() {
    hideInlineMsg(settingsDOM.pwChangeMessage);
    const currentUser = (typeof getSessionUser === 'function') ? getSessionUser() : null;
    if (!currentUser) return;

    const currentPw = settingsDOM.pwCurrent.value;
    const newPw = settingsDOM.pwNew.value;
    const confirmPw = settingsDOM.pwConfirm.value;

    if (!currentPw) {
        showInlineMsg(settingsDOM.pwChangeMessage, 'Please enter your current password.');
        settingsDOM.pwCurrent.focus();
        return;
    }
    if (newPw.length < 8) {
        showInlineMsg(settingsDOM.pwChangeMessage, 'New password must be at least 8 characters.');
        settingsDOM.pwNew.focus();
        return;
    }
    if (newPw !== confirmPw) {
        showInlineMsg(settingsDOM.pwChangeMessage, 'Passwords do not match.');
        settingsDOM.pwConfirm.focus();
        return;
    }

    settingsDOM.pwSaveBtn.disabled = true;
    settingsDOM.pwSaveBtn.textContent = 'Updating...';

    try {
        await apiFetch(`/users/${currentUser.stu_id}/password`, {
            method: 'PATCH',
            body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
        });

        showInlineMsg(settingsDOM.pwChangeMessage, 'Password updated successfully!', 'success');
        settingsDOM.pwCurrent.value = '';
        settingsDOM.pwNew.value = '';
        settingsDOM.pwConfirm.value = '';

    } catch (err) {
        showInlineMsg(settingsDOM.pwChangeMessage, err.message || 'Failed to update password.');
    } finally {
        settingsDOM.pwSaveBtn.disabled = false;
        settingsDOM.pwSaveBtn.textContent = 'Update Password';
    }
}

/* ──────────────────────────────────────────────
 *  Initialization
 * ────────────────────────────────────────────── */

function initSettings() {
    cacheSettingsDom();

    // Profile events
    settingsDOM.uploadBtn.addEventListener('click', handleProfileUpload);
    settingsDOM.fileInput.addEventListener('change', handleProfileFileChange);
    settingsDOM.removeBtn.addEventListener('click', handleProfileRemove);
    settingsDOM.darkModeToggle.addEventListener('change', handleDarkModeToggle);
    settingsDOM.saveBtn.addEventListener('click', saveSettings);

    // Password change events
    settingsDOM.pwSendCodeBtn.addEventListener('click', handleSendCode);
    settingsDOM.pwOtpInput.addEventListener('input', () => {
        settingsDOM.pwOtpInput.value = settingsDOM.pwOtpInput.value.replace(/\D/g, '').slice(0, 6);
    });
    settingsDOM.pwVerifyOtpBtn.addEventListener('click', handleVerifyOtp);
    settingsDOM.pwSaveBtn.addEventListener('click', handlePasswordSave);

    loadSettings();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettings);
} else {
    initSettings();
}
