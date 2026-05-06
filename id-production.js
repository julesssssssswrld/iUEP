'use strict';

/**
 * @fileoverview ID Production page logic for the iUEP portal.
 * Manages the student ID application workflow:
 *   State 1: No ID → show placeholder, enable apply button
 *   State 2: Application in progress → show status bar
 *   State 3: ID ready/active → show full card, enable lost/damaged report
 *   Rejected: Show rejection banner, re-enable apply
 */

/* ──────────────────────────────────────────────
 *  Constants
 * ────────────────────────────────────────────── */

const STATUS_STEPS = ['uploaded', 'received', 'processing', 'completed'];

/**
 * Resolves the current student ID.
 * Uses session user if available, falls back to '202100001' for demo.
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
        photoImg: document.getElementById('id-photo-img'),
        photoPlaceholder: document.getElementById('id-photo-placeholder'),
        course: document.getElementById('id-course'),
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
        formPopover: document.getElementById('id-application-form'),
        form: document.getElementById('id-form'),
        formClose: document.getElementById('id-form-close'),
        formCancel: document.getElementById('id-form-cancel'),
        formPhoto: document.getElementById('id-form-photo'),
        formCor: document.getElementById('id-form-cor'),
        formLib: document.getElementById('id-form-lib'),
        formPreviewImg: document.getElementById('id-form-preview-img'),
        formPhotoPreview: document.getElementById('id-form-photo-preview'),
    };
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
    } else if (app.status === 'completed') {
        renderCompleted(app);
    } else {
        renderInProgress(app);
    }
}

/** State 1: No ID on record */
function renderNoId() {
    // Photo area
    DOM.photoImg.style.display = 'none';
    DOM.photoPlaceholder.style.display = 'flex';

    // Info values
    DOM.course.textContent = '—';
    DOM.section.textContent = '—';
    DOM.library.textContent = '—';

    // Status — always visible, all steps inactive
    DOM.noRecord.classList.remove('hidden');
    DOM.readyNotice.classList.add('hidden');
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
    populateCardInfo(app);

    DOM.noRecord.classList.add('hidden');
    DOM.readyNotice.classList.add('hidden');
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
    populateCardInfo(app);

    DOM.noRecord.classList.add('hidden');
    DOM.readyNotice.classList.remove('hidden');
    DOM.rejectionBanner.classList.add('hidden');

    updateStatusBar('completed');

    // Apply disabled, lost enabled
    DOM.applyBtn.disabled = true;
    DOM.applyBtn.classList.add('btn-disabled');
    DOM.lostBtn.disabled = false;
    DOM.lostBtn.classList.remove('btn-disabled');
}

/** Rejected state */
function renderRejected(app) {
    populateCardInfo(app);

    DOM.noRecord.classList.add('hidden');
    DOM.readyNotice.classList.add('hidden');
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
 * Fills the ID card display with application data.
 * @param {Object} app - Application data.
 */
function populateCardInfo(app) {
    if (app.photo_base64) {
        DOM.photoImg.src = app.photo_base64;
        DOM.photoImg.style.display = 'block';
        DOM.photoPlaceholder.style.display = 'none';
    } else {
        DOM.photoImg.style.display = 'none';
        DOM.photoPlaceholder.style.display = 'flex';
    }

    DOM.course.textContent = app.course || '—';
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
 *  Event Binding & Initialization
 * ────────────────────────────────────────────── */

function initIdProduction() {
    cacheDom();

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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIdProduction);
} else {
    initIdProduction();
}
