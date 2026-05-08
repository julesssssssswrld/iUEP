'use strict';

/**
 * @fileoverview ID Production page logic for the iUEP portal.
 * Manages the student ID application workflow:
 *   State 1: No ID → show placeholder, enable apply button
 *   State 2: Application in progress → show status bar
 *   State 3: ID ready/active → show full card, enable lost/damaged report
 *   Rejected: Show rejection banner, re-enable apply
 *
 * Now also renders the SVG ID card via id-card-svg.js and
 * enforces an auth guard for unauthenticated visitors.
 */

/* ──────────────────────────────────────────────
 *  Constants
 * ────────────────────────────────────────────── */

const STATUS_STEPS = ['uploaded', 'received', 'processing', 'completed', 'claimed'];

/**
 * Resolves the current student ID.
 * Uses session user if available, falls back to '202101' for demo.
 */
function getCurrentStudentId() {
    const user = (typeof getSessionUser === 'function') ? getSessionUser() : null;
    return user?.stu_id || '202101';
}

/* ──────────────────────────────────────────────
 *  DOM References (lazy-initialized)
 * ────────────────────────────────────────────── */

let DOM = {};

function cacheDom() {
    DOM = {
        container: document.getElementById('id-card-container'),
        svgTarget: document.getElementById('id-card-svg-target'),
        course: document.getElementById('id-course'),
        year: document.getElementById('id-year'),
        section: document.getElementById('id-section'),
        library: document.getElementById('id-library'),
        statusContainer: document.getElementById('id-status-container'),
        statusSteps: document.querySelectorAll('.id-status-step'),
        connectors: document.querySelectorAll('.step-connector'),
        rejectionBanner: document.getElementById('id-rejection-banner'),
        rejectionReason: document.getElementById('rejection-reason'),
        noRecord: document.getElementById('id-no-record'),
        readyNotice: document.getElementById('id-ready-notice'),
        applyBtn: document.getElementById('id-apply-btn'),
        lostBtn: document.getElementById('id-lost-btn'),
        claimedNotice: document.getElementById('id-claimed-notice'),
        formPopover: document.getElementById('id-application-form'),
        form: document.getElementById('id-form'),
        formClose: document.getElementById('id-form-close'),
        formCancel: document.getElementById('id-form-cancel'),
        formPhoto: document.getElementById('id-form-photo'),
        formCor: document.getElementById('id-form-cor'),
        formLib: document.getElementById('id-form-lib'),
        formPreviewImg: document.getElementById('id-form-preview-img'),
        formPhotoPreview: document.getElementById('id-form-photo-preview'),
        authGuard: document.getElementById('id-auth-guard'),
        content: document.getElementById('id-production-content'),
        fullscreenPopover: document.getElementById('id-fullscreen-popover'),
        fullscreenSvgTarget: document.getElementById('id-fullscreen-svg-target'),
        fullscreenClose: document.getElementById('id-fullscreen-close'),
    };
}

/* ──────────────────────────────────────────────
 *  Auth Guard
 * ────────────────────────────────────────────── */

/**
 * Checks if a user is logged in. If not, shows the auth guard
 * and hides the page content.
 * @returns {boolean} True if user is authenticated.
 */
function checkAuth() {
    const user = (typeof getSessionUser === 'function') ? getSessionUser() : null;

    if (!user) {
        if (DOM.authGuard) DOM.authGuard.classList.remove('hidden');
        if (DOM.content) DOM.content.classList.add('hidden');
        return false;
    }

    if (DOM.authGuard) DOM.authGuard.classList.add('hidden');
    if (DOM.content) DOM.content.classList.remove('hidden');
    return true;
}

/* ──────────────────────────────────────────────
 *  SVG ID Card Rendering
 * ────────────────────────────────────────────── */

/** Cached UEP seal logo base64 (loaded once) */
let _logoBase64Cache = null;

/**
 * Loads the UEP seal as base64 (cached after first load).
 * @returns {Promise<string>} base64 data URI of the logo.
 */
async function loadLogoBase64() {
    if (_logoBase64Cache) return _logoBase64Cache;

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            _logoBase64Cache = canvas.toDataURL('image/png');
            resolve(_logoBase64Cache);
        };
        img.onerror = () => resolve('');
        img.src = 'Figma/UEP Logo.png';
    });
}

/**
 * Renders the SVG ID card into the target div using current session user data
 * and (optionally) application data.
 * @param {Object|null} app - Application data (photo, course, etc.)
 */
async function renderSvgIdCard(app) {
    if (!DOM.svgTarget || typeof generateIdCardSVG !== 'function') return;

    const user = (typeof getSessionUser === 'function') ? getSessionUser() : null;
    const logoBase64 = await loadLogoBase64();

    // Build the full name in the format: FIRST MIDDLE_INITIAL. LAST
    let studentName = 'STUDENT NAME';
    if (user) {
        const parts = [];
        if (user.first_name) parts.push(user.first_name.toUpperCase());
        if (user.middle_name) parts.push(user.middle_name.charAt(0).toUpperCase() + '.');
        if (user.last_name) parts.push(user.last_name.toUpperCase());
        studentName = parts.join(' ') || 'STUDENT NAME';
    }

    // Determine college from course (simple mapping)
    const college = app?.college || getCollegeFromCourse(user?.course || app?.course) || 'COLLEGE OF SCIENCE';

    const cardData = {
        studentName: studentName,
        studentId: user?.stu_id || '000000',
        course: user?.course || app?.course || 'BSIT',
        college: college,
        photoBase64: app?.photo_url || app?.photo_base64 || '',
        logoBase64: logoBase64,
    };

    DOM.svgTarget.innerHTML = generateIdCardSVG(cardData);
}

/**
 * Shows a placeholder card in the SVG target area.
 * Same dimensions as the SVG card for visual uniformity.
 * @param {string} message - Message to display in the placeholder.
 */
function showPlaceholder(message = 'No ID on record') {
    if (!DOM.svgTarget) return;

    DOM.svgTarget.innerHTML = `
        <div class="id-card-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px" fill="var(--text-secondary)">
                <path d="M560-440h200v-80H560v80Zm0-120h200v-80H560v80ZM200-320h320v-22q0-45-44-71.5T360-440q-72 0-116 26.5T200-342v22Zm160-160q33 0 56.5-23.5T440-560q0-33-23.5-56.5T360-640q-33 0-56.5 23.5T280-560q0 33 23.5 56.5T360-480ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Z"/>
            </svg>
            <p class="sub-text">${message}</p>
        </div>
    `;
}

/**
 * Course-to-college mapping (fetched from DB, cached after first load).
 * @type {Object<string, string>}
 */
let _courseCollegeMap = {};

/**
 * Fetches all course-to-college mappings from the API and caches them.
 * Call this once during initialization.
 */
async function loadCourseMap() {
    try {
        const courses = await apiFetch('/courses');
        _courseCollegeMap = {};
        for (const c of courses) {
            _courseCollegeMap[c.course_code.toUpperCase()] = c.college;
        }
    } catch (e) {
        console.error('Failed to load course map:', e);
    }
}

/**
 * Maps a course abbreviation to its parent college name.
 * Uses the cached map from the DB.
 * @param {string} course - Course abbreviation (e.g. "BSIT").
 * @returns {string} College name.
 */
function getCollegeFromCourse(course) {
    if (!course) return 'COLLEGE OF SCIENCE';
    return _courseCollegeMap[course.toUpperCase()] || 'COLLEGE OF SCIENCE';
}

/* ──────────────────────────────────────────────
 *  State Management
 * ────────────────────────────────────────────── */

/**
 * Fetches the latest ID application from the API.
 * @returns {Promise<Object|null>} Application data or null.
 */
async function getIdApplication() {
    try {
        const stuId = getCurrentStudentId();
        return await apiFetch(`/id-application/${stuId}`);
    } catch (e) {
        console.error('Error fetching ID application:', e);
        return null;
    }
}

/* ──────────────────────────────────────────────
 *  Rendering
 * ────────────────────────────────────────────── */

/**
 * Master render — reads state and updates the UI accordingly.
 */
async function renderIdPage() {
    const app = await getIdApplication();

    if (!app) {
        renderNoId();
    } else if (app.status === 'rejected') {
        renderRejected(app);
    } else if (app.status === 'claimed') {
        renderClaimed(app);
    } else if (app.status === 'completed') {
        renderCompleted(app);
    } else {
        renderInProgress(app);
    }
}

/** State 1: No ID on record */
function renderNoId() {
    // Show placeholder (no SVG card until completed)
    showPlaceholder('No University ID on record');

    // Info values
    DOM.course.textContent = '—';
    DOM.year.textContent = '—';
    DOM.section.textContent = '—';
    DOM.library.textContent = '—';

    // Status — always visible, all steps inactive
    DOM.noRecord.classList.remove('hidden');
    DOM.readyNotice.classList.add('hidden');
    DOM.claimedNotice.classList.add('hidden');
    DOM.rejectionBanner.classList.add('hidden');

    // Buttons — apply enabled, lost disabled
    DOM.applyBtn.disabled = false;
    DOM.applyBtn.classList.remove('btn-disabled');
    DOM.lostBtn.disabled = true;
    DOM.lostBtn.classList.add('btn-disabled');

    // Reset status bar (all gray)
    DOM.statusSteps.forEach((step) => {
        step.classList.remove('active', 'completed', 'rejected');
    });
    DOM.connectors.forEach((c) => c.classList.remove('active'));
}

/** State 2: Application in progress (uploaded/received/processing) */
function renderInProgress(app) {
    // Show placeholder while processing (no SVG card until completed)
    showPlaceholder('ID application in progress...');
    populateCardInfo(app);

    DOM.noRecord.classList.add('hidden');
    DOM.readyNotice.classList.add('hidden');
    DOM.claimedNotice.classList.add('hidden');
    DOM.rejectionBanner.classList.add('hidden');

    updateStatusBar(app.status);

    // Buttons — both disabled during processing
    DOM.applyBtn.disabled = true;
    DOM.applyBtn.classList.add('btn-disabled');
    DOM.lostBtn.disabled = true;
    DOM.lostBtn.classList.add('btn-disabled');
}

/** State 3: ID completed — ready for pickup or claimed */
function renderCompleted(app) {
    // Only completed status shows the real SVG ID card
    renderSvgIdCard(app);
    populateCardInfo(app);

    // Make the card clickable for fullscreen view
    _currentApp = app;
    DOM.svgTarget.classList.add('id-card-clickable');

    DOM.noRecord.classList.add('hidden');
    DOM.readyNotice.classList.remove('hidden');
    DOM.claimedNotice.classList.add('hidden');
    DOM.rejectionBanner.classList.add('hidden');

    updateStatusBar('completed');

    // Apply disabled, lost enabled
    DOM.applyBtn.disabled = true;
    DOM.applyBtn.classList.add('btn-disabled');
    DOM.lostBtn.disabled = false;
    DOM.lostBtn.classList.remove('btn-disabled');
}

/** State 4: ID claimed — student already picked it up */
function renderClaimed(app) {
    renderSvgIdCard(app);
    populateCardInfo(app);

    // Make the card clickable for fullscreen view
    _currentApp = app;
    DOM.svgTarget.classList.add('id-card-clickable');

    DOM.noRecord.classList.add('hidden');
    DOM.readyNotice.classList.add('hidden');
    DOM.claimedNotice.classList.remove('hidden');
    DOM.rejectionBanner.classList.add('hidden');

    updateStatusBar('claimed');

    // Apply disabled, lost enabled
    DOM.applyBtn.disabled = true;
    DOM.applyBtn.classList.add('btn-disabled');
    DOM.lostBtn.disabled = false;
    DOM.lostBtn.classList.remove('btn-disabled');
}

/** Rejected state */
function renderRejected(app) {
    // Show placeholder (rejected, no SVG card)
    showPlaceholder('Application was rejected');
    populateCardInfo(app);

    DOM.noRecord.classList.add('hidden');
    DOM.readyNotice.classList.add('hidden');
    DOM.claimedNotice.classList.add('hidden');
    DOM.rejectionBanner.classList.remove('hidden');
    DOM.rejectionReason.textContent = app.rejection_reason || 'No reason provided.';

    // Reset status bar to show rejection
    DOM.statusSteps.forEach((step) => {
        step.classList.remove('active', 'completed');
        step.classList.add('rejected');
    });
    DOM.connectors.forEach((c) => {
        c.classList.remove('active');
        c.classList.add('rejected');
    });

    // Re-enable apply, lost disabled
    DOM.applyBtn.disabled = false;
    DOM.applyBtn.classList.remove('btn-disabled');
    DOM.lostBtn.disabled = true;
    DOM.lostBtn.classList.add('btn-disabled');
}

/**
 * Fills the info panel (right side) with application data.
 * Does NOT render the SVG card — that's handled per-state.
 * @param {Object} app - Application data.
 */
function populateCardInfo(app) {
    DOM.course.textContent = app.course || '—';
    DOM.year.textContent = app.year_level || '—';
    DOM.section.textContent = app.section || '—';
    DOM.library.textContent = app.library_id || '—';
}

/**
 * Updates the step progress bar to reflect current status.
 * @param {string} currentStatus - One of: uploaded, received, processing, ready.
 */
function updateStatusBar(currentStatus) {
    const currentIdx = STATUS_STEPS.indexOf(currentStatus);

    DOM.statusSteps.forEach((stepEl, i) => {
        stepEl.classList.remove('active', 'completed', 'rejected');
        if (i < currentIdx) {
            stepEl.classList.add('completed');
        } else if (i === currentIdx) {
            stepEl.classList.add('active');
        }
    });

    DOM.connectors.forEach((connector, i) => {
        connector.classList.remove('active', 'rejected');
        if (i < currentIdx) {
            connector.classList.add('active');
        }
    });
}

/* ──────────────────────────────────────────────
 *  Application Form
 * ────────────────────────────────────────────── */

function openApplicationForm() {
    DOM.formPopover.showPopover();
    DOM.form.reset();
    DOM.formPreviewImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    DOM.formPhotoPreview.querySelector('p').textContent = 'Click to upload photo';
}

function closeApplicationForm() {
    DOM.formPopover.hidePopover();
}

/**
 * Handles form submission — reads files, saves to localStorage.
 * @param {Event} e - Submit event.
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const photoFile = DOM.formPhoto.files[0];
    const corFile = DOM.formCor.files[0];
    const libraryId = DOM.formLib.value.trim();

    if (!photoFile || !corFile || !libraryId) {
        return; // HTML5 validation will handle this
    }

    // Validate LID# format: LID#: XX-XX-XXX
    if (!/^LID#:\s?\d{2}-\d{2}-\d{3}$/.test(libraryId)) {
        alert('Library ID must be in the format: LID#: 00-00-000');
        DOM.formLib.focus();
        return;
    }

    // Read files as base64
    const photoBase64 = await fileToBase64(photoFile);
    const corBase64 = await fileToBase64(corFile);

    const studentId = getCurrentStudentId();

    try {
        await apiFetch('/id-application', {
            method: 'POST',
            body: JSON.stringify({
                studentId,
                photoBase64,
                corBase64,
                libraryId,
            }),
        });

        closeApplicationForm();
        await renderIdPage();
    } catch (err) {
        console.error('Failed to submit application:', err);
        alert('Failed to submit application. Please try again.');
    }
}

/**
 * Handles the "Report Lost / Damaged" flow.
 * For now, simply re-renders the page to allow a new application.
 * A future version could hit an API endpoint to flag the ID as lost.
 */
async function handleLostId() {
    const confirmed = confirm(
        'Report your University ID as lost or damaged?\n\n' +
        'This will allow you to submit a new application.'
    );

    if (confirmed) {
        await renderIdPage();
    }
}

/* ──────────────────────────────────────────────
 *  Photo Preview
 * ────────────────────────────────────────────── */

function handlePhotoPreview() {
    const file = DOM.formPhoto.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        DOM.formPreviewImg.src = e.target.result;
        DOM.formPhotoPreview.querySelector('p').textContent = file.name;
    };
    reader.readAsDataURL(file);
}

/* ──────────────────────────────────────────────
 *  Helpers
 * ────────────────────────────────────────────── */

/**
 * Converts a File to a base64 data URL.
 * @param {File} file
 * @returns {Promise<string>} base64 data URL.
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/* ──────────────────────────────────────────────
 *  Fullscreen ID Card Popover
 * ────────────────────────────────────────────── */

/** Holds the current completed app data for fullscreen rendering */
let _currentApp = null;

/**
 * Opens the fullscreen popover and renders the SVG card at large scale.
 */
async function openFullscreenCard() {
    if (!_currentApp || !DOM.fullscreenPopover) return;

    // Render the card into the fullscreen target
    const user = (typeof getSessionUser === 'function') ? getSessionUser() : null;
    const logoBase64 = await loadLogoBase64();

    let studentName = 'STUDENT NAME';
    if (user) {
        const parts = [];
        if (user.first_name) parts.push(user.first_name.toUpperCase());
        if (user.middle_name) parts.push(user.middle_name.charAt(0).toUpperCase() + '.');
        if (user.last_name) parts.push(user.last_name.toUpperCase());
        studentName = parts.join(' ') || 'STUDENT NAME';
    }

    const college = _currentApp?.college || getCollegeFromCourse(user?.course || _currentApp?.course) || 'COLLEGE OF SCIENCE';

    DOM.fullscreenSvgTarget.innerHTML = generateIdCardSVG({
        studentName: studentName,
        studentId: user?.stu_id || '000000',
        course: user?.course || _currentApp?.course || 'BSIT',
        college: college,
        photoBase64: _currentApp?.photo_url || _currentApp?.photo_base64 || '',
        logoBase64: logoBase64,
    });

    DOM.fullscreenPopover.showPopover();
}

function closeFullscreenCard() {
    if (DOM.fullscreenPopover) DOM.fullscreenPopover.hidePopover();
}

/* ──────────────────────────────────────────────
 *  Event Binding & Initialization
 * ────────────────────────────────────────────── */

async function initIdProduction() {
    cacheDom();

    // Auth guard — stop initialization if not logged in
    if (!checkAuth()) return;

    // Load course→college mapping from DB (cached for session)
    await loadCourseMap();

    // Buttons
    DOM.applyBtn.addEventListener('click', openApplicationForm);
    DOM.lostBtn.addEventListener('click', handleLostId);
    DOM.formClose.addEventListener('click', closeApplicationForm);
    DOM.formCancel.addEventListener('click', closeApplicationForm);
    DOM.form.addEventListener('submit', handleFormSubmit);
    DOM.formPhoto.addEventListener('change', handlePhotoPreview);

    // Click photo preview area to trigger file input
    DOM.formPhotoPreview.addEventListener('click', () => DOM.formPhoto.click());

    // Library ID input mask: auto-format to LID#: XX-XX-XXX
    DOM.formLib.addEventListener('input', (e) => {
        let raw = e.target.value.replace(/[^0-9]/g, ''); // digits only
        if (raw.length > 7) raw = raw.slice(0, 7);
        let formatted = 'LID#: ';
        if (raw.length > 0) formatted += raw.slice(0, 2);
        if (raw.length > 2) formatted += '-' + raw.slice(2, 4);
        if (raw.length > 4) formatted += '-' + raw.slice(4, 7);
        e.target.value = formatted;
    });

    // Render initial state
    renderIdPage();

    // Fullscreen card popover
    DOM.svgTarget.addEventListener('click', openFullscreenCard);
    DOM.fullscreenClose.addEventListener('click', closeFullscreenCard);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIdProduction);
} else {
    initIdProduction();
}
