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

    const sourceUser = app?.first_name ? app : user;
    let studentName = 'STUDENT NAME';
    if (sourceUser) {
        const parts = [];
        if (sourceUser.first_name) parts.push(sourceUser.first_name.toUpperCase());
        if (sourceUser.middle_name) parts.push(sourceUser.middle_name.charAt(0).toUpperCase() + '.');
        if (sourceUser.last_name) parts.push(sourceUser.last_name.toUpperCase());
        studentName = parts.join(' ') || 'STUDENT NAME';
    }

    // Determine college from course (simple mapping)
    const activeCourse = app?.course || user?.course;
    const college = app?.college || getCollegeFromCourse(activeCourse) || 'COLLEGE OF SCIENCE';

    const cardData = {
        studentName: studentName,
        studentId: app?.student_id || user?.stu_id || '000000',
        course: activeCourse || 'BSIT',
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
        const result = await apiFetch(`/id-application/${stuId}`);
        // Backend returns string "null" when no application exists
        if (result === null || result === 'null' || result === undefined) return null;
        return result;
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

    // Info values — pull from session user when no application exists
    const user = (typeof getSessionUser === 'function') ? getSessionUser() : null;
    DOM.course.textContent = user?.course || '—';
    DOM.year.textContent = user?.year_level || '—';
    DOM.section.textContent = user?.section || '—';
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
    const user = (typeof getSessionUser === 'function') ? getSessionUser() : null;
    DOM.course.textContent = app.course || user?.course || '—';
    DOM.year.textContent = app.year_level || user?.year_level || '—';
    DOM.section.textContent = app.section || user?.section || '—';
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

    // Populate student info fields from the current session user
    const user = (typeof getSessionUser === 'function') ? getSessionUser() : null;
    if (user) {
        const formFirstName = document.getElementById('id-form-first-name');
        const formMiddleName = document.getElementById('id-form-middle-name');
        const formLastName = document.getElementById('id-form-last-name');
        const formCourse = document.getElementById('id-form-course');
        const formYear = document.getElementById('id-form-year');
        const formSection = document.getElementById('id-form-section');
        if (formFirstName) formFirstName.value = user.first_name || '—';
        if (formMiddleName) formMiddleName.value = user.middle_name || '—';
        if (formLastName) formLastName.value = user.last_name || '—';
        if (formCourse) formCourse.value = user.course || '—';
        if (formYear) formYear.value = user.year_level || '—';
        if (formSection) formSection.value = user.section || '—';

        // Re-populate student ID (form.reset() wipes it back to the HTML default)
        const formStuIdEls = DOM.form.querySelectorAll('.display-stu-id');
        formStuIdEls.forEach((el) => { el.value = user.stu_id || '000000'; });
    }
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

    // Compress images to JPEG via canvas (handles PNG transparency)
    const photoBase64 = await fileToBase64(photoFile, 800);
    const corBase64 = await fileToBase64(corFile, 1200);

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
        alert('Application submitted successfully! Your ID application is now being processed.');
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

    if (!confirmed) return;

    try {
        const stuId = getCurrentStudentId();
        await apiFetch(`/id-application/${stuId}/report-lost`, { method: 'POST' });
        alert('Your ID has been reported as lost/damaged. You may now submit a new application.');
        await renderIdPage();
    } catch (err) {
        console.error('Failed to report lost ID:', err);
        alert('Failed to report lost ID: ' + err.message);
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
 * Compresses an image File to a JPEG base64 data URL via canvas.
 * Handles PNGs (including those with transparency) by drawing onto
 * a white background before exporting as JPEG.
 * @param {File} file - The image file to compress.
 * @param {number} [maxWidth=1200] - Max width to resize to.
 * @param {number} [quality=0.8] - JPEG quality (0–1).
 * @returns {Promise<string>} JPEG base64 data URL.
 */
function fileToBase64(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            let w = img.width;
            let h = img.height;

            if (w > maxWidth) {
                const ratio = maxWidth / w;
                w = maxWidth;
                h = Math.round(h * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');

            // Fill white background (handles PNG transparency)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);

            const result = canvas.toDataURL('image/jpeg', quality);
            URL.revokeObjectURL(url);
            resolve(result);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image for compression.'));
        };

        img.src = url;
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

    const sourceUser = _currentApp?.first_name ? _currentApp : user;
    let studentName = 'STUDENT NAME';
    if (sourceUser) {
        const parts = [];
        if (sourceUser.first_name) parts.push(sourceUser.first_name.toUpperCase());
        if (sourceUser.middle_name) parts.push(sourceUser.middle_name.charAt(0).toUpperCase() + '.');
        if (sourceUser.last_name) parts.push(sourceUser.last_name.toUpperCase());
        studentName = parts.join(' ') || 'STUDENT NAME';
    }

    const activeCourse = _currentApp?.course || user?.course;
    const college = _currentApp?.college || getCollegeFromCourse(activeCourse) || 'COLLEGE OF SCIENCE';

    DOM.fullscreenSvgTarget.innerHTML = generateIdCardSVG({
        studentName: studentName,
        studentId: _currentApp?.student_id || user?.stu_id || '000000',
        course: activeCourse || 'BSIT',
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
