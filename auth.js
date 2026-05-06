'use strict';

/**
 * @fileoverview Auth page controller for login.html and signup.html.
 * Handles multi-step signup verification and placeholder login.
 */

/* ──────────────────────────────────────────────
 *  API Helper
 * ────────────────────────────────────────────── */

async function authFetch(endpoint, body) {
    const res = await fetch(`/api/auth${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || res.statusText);
    }

    return data;
}

/* ──────────────────────────────────────────────
 *  Message Display
 * ────────────────────────────────────────────── */

function showMessage(el, text, type = 'error') {
    el.textContent = text;
    el.className = `auth-message show ${type}`;
}

function hideMessage(el) {
    el.className = 'auth-message';
    el.textContent = '';
}

/* ══════════════════════════════════════════════
 *  LOGIN PAGE
 * ══════════════════════════════════════════════ */

function initLogin() {
    const form = document.getElementById('login-form');
    const stuIdInput = document.getElementById('login-stu-id');
    const passwordInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('login-submit');
    const messageEl = document.getElementById('login-message');
    const forgotLink = document.getElementById('forgot-password-link');

    if (!form) return; // Not on login page

    // Enforce digits-only on student ID
    stuIdInput.addEventListener('input', () => {
        stuIdInput.value = stuIdInput.value.replace(/\D/g, '').slice(0, 6);
    });

    // Forgot password placeholder
    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        showMessage(messageEl, 'Password recovery will be available soon.', 'info');
    });

    // Login submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessage(messageEl);

        const stuId = stuIdInput.value.trim();
        const password = passwordInput.value;

        if (!/^\d{6}$/.test(stuId)) {
            showMessage(messageEl, 'Student ID must be exactly 6 digits.');
            stuIdInput.focus();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        try {
            const result = await authFetch('/login', { stuId, password });

            if (result.success) {
                showMessage(messageEl, 'Login successful! Redirecting...', 'success');

                // Store session — must use the same key getSessionUser() reads
                const sessionUser = {
                    stu_id: result.user.stuId,
                    username: result.user.username,
                    first_name: result.user.firstName,
                    middle_name: result.user.middleName,
                    last_name: result.user.lastName,
                    course: result.user.course,
                    year_level: result.user.yearLevel,
                    section: result.user.section,
                };
                sessionStorage.setItem('iUEP_current_user', JSON.stringify(sessionUser));

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 800);
            }
        } catch (err) {
            showMessage(messageEl, err.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Log In';
        }
    });
}

/* ══════════════════════════════════════════════
 *  SIGNUP PAGE
 * ══════════════════════════════════════════════ */

let signupState = {
    currentStep: 1,
    stuId: null,
    verified: false,
    emailVerified: false,
};

function initSignup() {
    const form = document.getElementById('signup-form');
    if (!form) return; // Not on signup page

    const DOM = {
        form,
        messageEl: document.getElementById('signup-message'),

        // Step 1
        stuIdInput: document.getElementById('signup-stu-id'),
        verifyIdBtn: document.getElementById('signup-verify-id-btn'),

        // Step 2
        birthdayInput: document.getElementById('signup-birthday'),
        verifyBdayBtn: document.getElementById('signup-verify-bday-btn'),

        // Step 3
        emailInput: document.getElementById('signup-email'),
        sendCodeBtn: document.getElementById('signup-send-code-btn'),
        otpInput: document.getElementById('signup-otp'),
        verifyOtpBtn: document.getElementById('signup-verify-otp-btn'),

        // Step 4
        firstName: document.getElementById('signup-first-name'),
        middleName: document.getElementById('signup-middle-name'),
        lastName: document.getElementById('signup-last-name'),
        username: document.getElementById('signup-username'),
        password: document.getElementById('signup-password'),
        confirmPw: document.getElementById('signup-confirm-pw'),
        submitBtn: document.getElementById('signup-submit'),

        // Step dots
        stepDots: document.querySelectorAll('.auth-step-dot'),
        stepConnectors: document.querySelectorAll('.auth-step-connector'),
    };

    // ── Enforce digits-only on student ID ──
    DOM.stuIdInput.addEventListener('input', () => {
        DOM.stuIdInput.value = DOM.stuIdInput.value.replace(/\D/g, '').slice(0, 6);
    });

    // ── Step 1: Verify Student ID ──
    DOM.verifyIdBtn.addEventListener('click', async () => {
        hideMessage(DOM.messageEl);
        const stuId = DOM.stuIdInput.value.trim();

        if (!/^\d{6}$/.test(stuId)) {
            showMessage(DOM.messageEl, 'Student ID must be exactly 6 digits.');
            DOM.stuIdInput.focus();
            return;
        }

        DOM.verifyIdBtn.disabled = true;
        DOM.verifyIdBtn.textContent = 'Checking...';

        try {
            const result = await authFetch('/check-student', { stuId });

            if (!result.exists) {
                showMessage(DOM.messageEl, 'No student found with this ID. Please contact the registrar.');
                DOM.verifyIdBtn.disabled = false;
                DOM.verifyIdBtn.textContent = 'Verify';
                DOM.stuIdInput.classList.add('error');
                return;
            }

            // Success — lock step 1 and advance
            signupState.stuId = stuId;
            DOM.stuIdInput.disabled = true;
            DOM.stuIdInput.classList.remove('error');
            DOM.stuIdInput.classList.add('success');
            DOM.verifyIdBtn.textContent = '✓';
            showMessage(DOM.messageEl, 'Student ID verified. Please enter your date of birth.', 'success');

            advanceToStep(2, DOM);

        } catch (err) {
            showMessage(DOM.messageEl, err.message);
            DOM.verifyIdBtn.disabled = false;
            DOM.verifyIdBtn.textContent = 'Verify';
        }
    });

    // ── Step 2: Verify Birthday ──
    DOM.verifyBdayBtn.addEventListener('click', async () => {
        hideMessage(DOM.messageEl);
        const birthday = DOM.birthdayInput.value;

        if (!birthday) {
            showMessage(DOM.messageEl, 'Please select your date of birth.');
            DOM.birthdayInput.focus();
            return;
        }

        DOM.verifyBdayBtn.disabled = true;
        DOM.verifyBdayBtn.textContent = 'Verifying...';

        try {
            const result = await authFetch('/verify-birthday', {
                stuId: signupState.stuId,
                birthday,
            });

            if (!result.verified) {
                showMessage(DOM.messageEl, 'Date of birth does not match our records.');
                DOM.verifyBdayBtn.disabled = false;
                DOM.verifyBdayBtn.textContent = 'Verify';
                DOM.birthdayInput.classList.add('error');
                return;
            }

            // Success — fill in student info and advance
            signupState.verified = true;
            DOM.birthdayInput.disabled = true;
            DOM.birthdayInput.classList.remove('error');
            DOM.birthdayInput.classList.add('success');
            DOM.verifyBdayBtn.textContent = '✓';

            // Auto-fill student info
            DOM.firstName.value = result.firstName || '';
            DOM.middleName.value = result.middleName || '';
            DOM.lastName.value = result.lastName || '';

            showMessage(DOM.messageEl, 'Identity verified! Please verify your email.', 'success');
            advanceToStep(3, DOM);

        } catch (err) {
            showMessage(DOM.messageEl, err.message);
            DOM.verifyBdayBtn.disabled = false;
            DOM.verifyBdayBtn.textContent = 'Verify';
        }
    });

    // ── Step 3: Email Verification (Placeholder) ──
    DOM.sendCodeBtn.addEventListener('click', () => {
        hideMessage(DOM.messageEl);
        const email = DOM.emailInput.value.trim();

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMessage(DOM.messageEl, 'Please enter a valid email address.');
            DOM.emailInput.focus();
            return;
        }

        showMessage(DOM.messageEl, 'Verification code sent to your email! (Placeholder — any 6-digit code will work)', 'info');
        DOM.emailInput.disabled = true;
        DOM.sendCodeBtn.textContent = 'Resend';
        DOM.otpInput.disabled = false;
        DOM.verifyOtpBtn.disabled = false;
        DOM.otpInput.focus();
    });

    // Enforce digits-only on OTP
    DOM.otpInput.addEventListener('input', () => {
        DOM.otpInput.value = DOM.otpInput.value.replace(/\D/g, '').slice(0, 6);
    });

    DOM.verifyOtpBtn.addEventListener('click', () => {
        hideMessage(DOM.messageEl);
        const code = DOM.otpInput.value.trim();

        if (!/^\d{6}$/.test(code)) {
            showMessage(DOM.messageEl, 'Please enter a 6-digit verification code.');
            DOM.otpInput.focus();
            return;
        }

        // Placeholder — accept any 6-digit code
        signupState.emailVerified = true;
        DOM.otpInput.disabled = true;
        DOM.otpInput.classList.add('success');
        DOM.sendCodeBtn.disabled = true;
        DOM.verifyOtpBtn.textContent = '✓';
        DOM.verifyOtpBtn.disabled = true;

        showMessage(DOM.messageEl, 'Email verified! Set up your account below.', 'success');
        advanceToStep(4, DOM);
    });

    // ── Step 4: Account Setup (Submit) ──
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessage(DOM.messageEl);

        const username = DOM.username.value.trim();
        const password = DOM.password.value;
        const confirmPw = DOM.confirmPw.value;

        if (!username || username.length < 3) {
            showMessage(DOM.messageEl, 'Username must be at least 3 characters.');
            DOM.username.focus();
            return;
        }

        if (password.length < 8) {
            showMessage(DOM.messageEl, 'Password must be at least 8 characters.');
            DOM.password.focus();
            return;
        }

        if (password !== confirmPw) {
            showMessage(DOM.messageEl, 'Passwords do not match.');
            DOM.confirmPw.focus();
            DOM.confirmPw.classList.add('error');
            return;
        }

        DOM.submitBtn.disabled = true;
        DOM.submitBtn.textContent = 'Creating Account...';

        try {
            const result = await authFetch('/register', {
                stuId: signupState.stuId,
                username,
                password,
                email: DOM.emailInput.value.trim(),
            });

            if (result.success) {
                showMessage(DOM.messageEl, 'Account created! Redirecting to login...', 'success');
                DOM.username.disabled = true;
                DOM.password.disabled = true;
                DOM.confirmPw.disabled = true;

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            }
        } catch (err) {
            showMessage(DOM.messageEl, err.message);
            DOM.submitBtn.disabled = false;
            DOM.submitBtn.textContent = 'Create Account';
        }
    });
}

/* ──────────────────────────────────────────────
 *  Step Advancement
 * ────────────────────────────────────────────── */

function advanceToStep(step, DOM) {
    signupState.currentStep = step;

    // Update step dots
    DOM.stepDots.forEach((dot, i) => {
        const dotStep = i + 1;
        dot.classList.remove('active', 'completed');
        if (dotStep < step) {
            dot.classList.add('completed');
            dot.textContent = '✓';
        } else if (dotStep === step) {
            dot.classList.add('active');
        }
    });

    // Update connectors
    DOM.stepConnectors.forEach((conn, i) => {
        const connStep = i + 1;
        conn.classList.toggle('completed', connStep < step);
    });

    // Enable fields for the current step
    switch (step) {
        case 2:
            DOM.birthdayInput.disabled = false;
            DOM.verifyBdayBtn.disabled = false;
            DOM.birthdayInput.focus();
            break;
        case 3:
            DOM.emailInput.disabled = false;
            DOM.sendCodeBtn.disabled = false;
            DOM.emailInput.focus();
            break;
        case 4:
            DOM.username.disabled = false;
            DOM.password.disabled = false;
            DOM.confirmPw.disabled = false;
            DOM.submitBtn.disabled = false;
            DOM.username.focus();
            break;
    }
}

/* ──────────────────────────────────────────────
 *  Init — detect which page we're on
 * ────────────────────────────────────────────── */

function initAuth() {
    initLogin();
    initSignup();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}
