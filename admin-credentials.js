'use strict';

/**
 * @fileoverview Admin Account Settings — Change username and password
 * for the currently logged-in admin account.
 * 
 * NOTE: Avoids defining getAdminSession() since admin-layout.js 
 * already defines it in global scope. Reads session directly instead.
 */

/* ──────────────────────────────────────────────
 *  Helpers (scoped to avoid conflicts)
 * ────────────────────────────────────────────── */

const AdminSettings = (() => {

    function readSession() {
        try {
            return JSON.parse(sessionStorage.getItem('iUEP_admin_session'));
        } catch {
            return null;
        }
    }

    function saveSession(updates) {
        const session = readSession();
        if (!session) return;
        Object.assign(session, updates);
        sessionStorage.setItem('iUEP_admin_session', JSON.stringify(session));
    }

    async function api(url, opts = {}) {
        const res = await fetch(url, {
            method: opts.method || 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: opts.body ? JSON.stringify(opts.body) : undefined,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || res.statusText);
        return data;
    }

    function showMsg(el, text, type) {
        el.textContent = text;
        el.className = `admin-inline-message show ${type}`;
    }

    function clearMsg(el) {
        el.className = 'admin-inline-message';
        el.textContent = '';
    }

    return { readSession, saveSession, api, showMsg, clearMsg };
})();

/* ──────────────────────────────────────────────
 *  Init — runs after DOM is ready
 * ────────────────────────────────────────────── */

function initAdminSettings() {
    const session = AdminSettings.readSession();

    // Populate current username
    const currentUsernameInput = document.getElementById('current-username');
    if (currentUsernameInput && session) {
        currentUsernameInput.value = session.username || '';
    }

    // ── Change Username Form ──
    const usernameForm = document.getElementById('change-username-form');
    const usernameMsg = document.getElementById('username-message');

    if (usernameForm) {
        usernameForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            AdminSettings.clearMsg(usernameMsg);

            const currentSession = AdminSettings.readSession();
            const newUsername = document.getElementById('new-username').value.trim();

            if (!newUsername) {
                AdminSettings.showMsg(usernameMsg, 'Please enter a new username.', 'error');
                return;
            }

            if (newUsername.length < 3) {
                AdminSettings.showMsg(usernameMsg, 'Username must be at least 3 characters.', 'error');
                return;
            }

            if (newUsername === currentSession.username) {
                AdminSettings.showMsg(usernameMsg, 'New username is the same as the current one.', 'error');
                return;
            }

            try {
                await AdminSettings.api(`/api/admin/admins/${currentSession.id}/username`, {
                    method: 'PATCH',
                    body: { username: newUsername },
                });

                AdminSettings.saveSession({ username: newUsername });
                currentUsernameInput.value = newUsername;
                document.getElementById('new-username').value = '';
                AdminSettings.showMsg(usernameMsg, 'Username updated successfully.', 'success');
            } catch (err) {
                AdminSettings.showMsg(usernameMsg, err.message, 'error');
            }
        });
    }

    // ── Change Password Form ──
    const passwordForm = document.getElementById('change-password-form');
    const passwordMsg = document.getElementById('password-message');

    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            AdminSettings.clearMsg(passwordMsg);

            const currentSession = AdminSettings.readSession();
            const currentPw = document.getElementById('current-password').value;
            const newPw = document.getElementById('new-password').value;
            const confirmPw = document.getElementById('confirm-password').value;

            if (!currentPw) {
                AdminSettings.showMsg(passwordMsg, 'Please enter your current password.', 'error');
                return;
            }

            if (!newPw || newPw.length < 6) {
                AdminSettings.showMsg(passwordMsg, 'New password must be at least 6 characters.', 'error');
                return;
            }

            if (newPw !== confirmPw) {
                AdminSettings.showMsg(passwordMsg, 'New passwords do not match.', 'error');
                return;
            }

            try {
                await AdminSettings.api(`/api/admin/admins/${currentSession.id}/password`, {
                    method: 'PATCH',
                    body: { currentPassword: currentPw, password: newPw },
                });

                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
                AdminSettings.showMsg(passwordMsg, 'Password updated successfully.', 'success');
            } catch (err) {
                AdminSettings.showMsg(passwordMsg, err.message, 'error');
            }
        });
    }
}

// Run after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminSettings);
} else {
    initAdminSettings();
}
