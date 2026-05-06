'use strict';

/**
 * @fileoverview Admin panel logic for ID Production queue management.
 * Fetches application data from the API, renders the queue table,
 * and provides review/advance/reject controls.
 */

/* ----------------------------------------------
 *  Constants
 * ---------------------------------------------- */

const STATUS_STEPS = ['uploaded', 'received', 'processing', 'completed'];
const STATUS_LABELS = {
    uploaded: 'Uploaded',
    received: 'Received',
    processing: 'Processing',
    completed: 'Completed',
    rejected: 'Rejected',
};

let currentFilter = 'all';
let currentReviewId = null;

/* ----------------------------------------------
 *  DOM Cache
 * ---------------------------------------------- */

let ADMIN_DOM = {};

function cacheAdminDom() {
    ADMIN_DOM = {
        tableBody: document.getElementById('admin-queue-body'),
        emptyState: document.getElementById('admin-empty-state'),
        filterPills: document.querySelectorAll('.filter-pill'),
        statPending: document.getElementById('stat-pending'),
        statProcessing: document.getElementById('stat-processing'),
        statCompleted: document.getElementById('stat-completed'),
        statRejected: document.getElementById('stat-rejected'),
        reviewPopover: document.getElementById('admin-review-popover'),
        reviewClose: document.getElementById('admin-review-close'),
        reviewPhoto: document.getElementById('admin-review-photo'),
        reviewName: document.getElementById('admin-review-name'),
        reviewStuId: document.getElementById('admin-review-stuid'),
        reviewCourse: document.getElementById('admin-review-course'),
        reviewYear: document.getElementById('admin-review-year'),
        reviewSection: document.getElementById('admin-review-section'),
        reviewLib: document.getElementById('admin-review-lib'),
        reviewDate: document.getElementById('admin-review-date'),
        reviewCor: document.getElementById('admin-review-cor'),
        reviewCorLink: document.getElementById('admin-review-cor-link'),
        reviewStatusSteps: null, // set after popover opens
        reviewConnectors: null,
        advanceBtn: document.getElementById('admin-advance-btn'),
        rejectBtn: document.getElementById('admin-reject-btn'),
        rejectSection: document.getElementById('admin-reject-section'),
        rejectReason: document.getElementById('admin-reject-reason'),
        svgTarget: document.getElementById('admin-review-svg-target'),
    };
}

/* ----------------------------------------------
 *  API Helpers
 * ---------------------------------------------- */

async function apiFetch(endpoint, options = {}) {
    const res = await fetch(`/api${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
    }
    return res.json();
}

/* ----------------------------------------------
 *  UEP Seal Logo Loader (cached)
 * ---------------------------------------------- */

let _adminLogoCache = null;

async function loadAdminLogo() {
    if (_adminLogoCache) return _adminLogoCache;
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            c.getContext('2d').drawImage(img, 0, 0);
            _adminLogoCache = c.toDataURL('image/png');
            resolve(_adminLogoCache);
        };
        img.onerror = () => resolve('');
        img.src = 'Figma/UEP Logo.png';
    });
}

/* ----------------------------------------------
 *  Data Loading
 * ---------------------------------------------- */

async function loadStats() {
    try {
        const stats = await apiFetch('/admin/stats');
        ADMIN_DOM.statPending.textContent = stats.pending || 0;
        ADMIN_DOM.statProcessing.textContent = stats.processing || 0;
        ADMIN_DOM.statCompleted.textContent = stats.completed || 0;
        ADMIN_DOM.statRejected.textContent = stats.rejected || 0;
    } catch (e) {
        console.error('Failed to load stats:', e);
    }
}

async function loadApplications() {
    try {
        const filterParam = currentFilter === 'all' ? '' : `?status=${currentFilter}`;
        const apps = await apiFetch(`/admin/applications${filterParam}`);
        renderTable(apps);
    } catch (e) {
        console.error('Failed to load applications:', e);
        renderTable([]);
    }
}

/* ----------------------------------------------
 *  Table Rendering
 * ---------------------------------------------- */

function renderTable(applications) {
    if (!applications.length) {
        ADMIN_DOM.tableBody.innerHTML = '';
        ADMIN_DOM.emptyState.classList.remove('hidden');
        return;
    }

    ADMIN_DOM.emptyState.classList.add('hidden');

    ADMIN_DOM.tableBody.innerHTML = applications.map((app) => {
        const fullName = buildFullName(app);
        const statusClass = `status-${app.status}`;
        const submittedDate = formatShortDate(app.submitted_at);

        return `
            <tr data-id="${app.id}">
                <td class="code-column">${escapeHtml(app.student_id)}</td>
                <td>${escapeHtml(fullName)}</td>
                <td>${escapeHtml(app.course || '—')}</td>
                <td>${escapeHtml(app.year_level || '—')}</td>
                <td>${escapeHtml(app.section || '—')}</td>
                <td><span class="status-pill ${statusClass}">${STATUS_LABELS[app.status]}</span></td>
                <td class="sub-text">${submittedDate}</td>
                <td><button class="btn-secondary review-btn" data-id="${app.id}">Review</button></td>
            </tr>`;
    }).join('');

    // Attach review handlers
    ADMIN_DOM.tableBody.querySelectorAll('.review-btn').forEach((btn) => {
        btn.addEventListener('click', () => openReview(btn.dataset.id));
    });
}

/* ----------------------------------------------
 *  Review Popover
 * ---------------------------------------------- */

async function openReview(appId) {
    try {
        const app = await apiFetch(`/admin/applications/${appId}`);
        currentReviewId = app.id;

        // Populate fields
        ADMIN_DOM.reviewPhoto.src = app.photo_base64 || '';
        ADMIN_DOM.reviewName.textContent = buildFullName(app);
        ADMIN_DOM.reviewStuId.textContent = app.stu_id || app.student_id;
        ADMIN_DOM.reviewCourse.textContent = app.course || '—';
        ADMIN_DOM.reviewYear.textContent = app.year_level || '—';
        ADMIN_DOM.reviewSection.textContent = app.section || '—';
        ADMIN_DOM.reviewLib.textContent = app.library_id || '—';
        ADMIN_DOM.reviewDate.textContent = formatShortDate(app.submitted_at);

        // COR — set img src. Link click is handled via JS blob conversion.
        const corSrc = app.cor_base64 || '';
        ADMIN_DOM.reviewCor.src = corSrc;
        ADMIN_DOM.reviewCorLink.dataset.corSrc = corSrc;

        // Update status bar in popover
        updateReviewStatusBar(app.status);

        // Configure buttons based on current status
        configureActionButtons(app.status);

        // Reset reject section
        ADMIN_DOM.rejectSection.classList.add('hidden');
        ADMIN_DOM.rejectReason.value = '';

        // Render SVG ID card preview
        renderAdminSvgPreview(app);

        ADMIN_DOM.reviewPopover.showPopover();
    } catch (e) {
        console.error('Failed to open review:', e);
        alert('Failed to load application details.');
    }
}

/**
 * Renders the SVG ID card preview in the admin review popover.
 * @param {Object} app - Application data with student info.
 */
async function renderAdminSvgPreview(app) {
    if (!ADMIN_DOM.svgTarget || typeof generateIdCardSVG !== 'function') return;

    const logoBase64 = await loadAdminLogo();
    const fullName = buildFullName(app).toUpperCase();

    // Map course to college (reuse same mapping logic)
    const college = getAdminCollege(app.course);

    ADMIN_DOM.svgTarget.innerHTML = generateIdCardSVG({
        studentName: fullName,
        studentId: app.stu_id || app.student_id || '000000',
        course: app.course || 'BSIT',
        college: college,
        photoBase64: app.photo_base64 || '',
        logoBase64: logoBase64,
    });
}

/**
 * Course-to-college mapping (fetched from DB, cached after first load).
 */
let _adminCourseMap = {};

async function loadAdminCourseMap() {
    try {
        const res = await fetch('/api/courses');
        const courses = await res.json();
        _adminCourseMap = {};
        for (const c of courses) {
            _adminCourseMap[c.course_code.toUpperCase()] = c.college;
        }
    } catch (e) {
        console.error('Failed to load course map:', e);
    }
}

/**
 * Maps course abbreviation to college name using the cached DB mapping.
 */
function getAdminCollege(course) {
    if (!course) return 'COLLEGE OF SCIENCE';
    return _adminCourseMap[course.toUpperCase()] || 'COLLEGE OF SCIENCE';
}

function closeReview() {
    ADMIN_DOM.reviewPopover.hidePopover();
    currentReviewId = null;
}

function updateReviewStatusBar(currentStatus) {
    const steps = ADMIN_DOM.reviewPopover.querySelectorAll('.id-status-step');
    const connectors = ADMIN_DOM.reviewPopover.querySelectorAll('.step-connector');
    const currentIdx = STATUS_STEPS.indexOf(currentStatus);

    steps.forEach((step, i) => {
        step.classList.remove('active', 'completed', 'rejected');
        if (currentStatus === 'rejected') {
            step.classList.add('rejected');
        } else if (i < currentIdx) {
            step.classList.add('completed');
        } else if (i === currentIdx) {
            step.classList.add('active');
        }
    });

    connectors.forEach((c, i) => {
        c.classList.remove('active', 'rejected');
        if (currentStatus === 'rejected') {
            c.classList.add('rejected');
        } else if (i < currentIdx) {
            c.classList.add('active');
        }
    });
}

function configureActionButtons(status) {
    // Advance button
    if (status === 'completed' || status === 'rejected') {
        ADMIN_DOM.advanceBtn.disabled = true;
        ADMIN_DOM.advanceBtn.classList.add('btn-disabled');
    } else {
        ADMIN_DOM.advanceBtn.disabled = false;
        ADMIN_DOM.advanceBtn.classList.remove('btn-disabled');
        const nextIdx = STATUS_STEPS.indexOf(status) + 1;
        const nextLabel = STATUS_LABELS[STATUS_STEPS[nextIdx]] || 'Next';
        ADMIN_DOM.advanceBtn.textContent = `Mark as ${nextLabel}`;
    }

    // Reject button
    if (status === 'completed' || status === 'rejected') {
        ADMIN_DOM.rejectBtn.disabled = true;
        ADMIN_DOM.rejectBtn.classList.add('btn-disabled');
    } else {
        ADMIN_DOM.rejectBtn.disabled = false;
        ADMIN_DOM.rejectBtn.classList.remove('btn-disabled');
    }
}

/* ----------------------------------------------
 *  Status Actions
 * ---------------------------------------------- */

async function advanceStatus() {
    if (!currentReviewId) return;

    try {
        const app = await apiFetch(`/admin/applications/${currentReviewId}`);
        const currentIdx = STATUS_STEPS.indexOf(app.status);
        if (currentIdx < 0 || currentIdx >= STATUS_STEPS.length - 1) return;

        const nextStatus = STATUS_STEPS[currentIdx + 1];

        await apiFetch(`/admin/applications/${currentReviewId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStatus }),
        });

        closeReview();
        await refreshData();
    } catch (e) {
        console.error('Failed to advance status:', e);
        alert('Failed to update status.');
    }
}

let rejectMode = false;

async function handleReject() {
    if (!currentReviewId) return;

    // First click: show reason input
    if (!rejectMode) {
        rejectMode = true;
        ADMIN_DOM.rejectSection.classList.remove('hidden');
        ADMIN_DOM.rejectReason.focus();
        ADMIN_DOM.rejectBtn.textContent = 'Confirm Reject';
        return;
    }

    // Second click: submit rejection
    const reason = ADMIN_DOM.rejectReason.value.trim();
    if (!reason) {
        ADMIN_DOM.rejectReason.focus();
        return;
    }

    try {
        await apiFetch(`/admin/applications/${currentReviewId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'rejected', rejectionReason: reason }),
        });

        rejectMode = false;
        ADMIN_DOM.rejectBtn.textContent = 'Reject';
        closeReview();
        await refreshData();
    } catch (e) {
        console.error('Failed to reject application:', e);
        alert('Failed to reject application.');
    }
}

/* ----------------------------------------------
 *  Filter Pills
 * ---------------------------------------------- */

function handleFilterClick(e) {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;

    currentFilter = pill.dataset.filter;

    ADMIN_DOM.filterPills.forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');

    loadApplications();
}

/* ----------------------------------------------
 *  Helpers
 * ---------------------------------------------- */

function buildFullName(app) {
    const parts = [app.first_name];
    if (app.middle_name) parts.push(`${app.middle_name.charAt(0)}.`);
    parts.push(app.last_name);
    return parts.filter(Boolean).join(' ');
}

function formatShortDate(isoString) {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function refreshData() {
    await Promise.all([loadStats(), loadApplications()]);
}

function dataURItoBlob(dataURI) {
    const split = dataURI.split(',');
    const byteString = atob(split[1]);
    const mimeString = split[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

function openDocumentInNewTab(dataUrl) {
    if (!dataUrl || !dataUrl.startsWith('data:')) return;
    try {
        const blob = dataURItoBlob(dataUrl);
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
    } catch (e) {
        console.error('Failed to open document:', e);
        alert('Could not open document preview.');
    }
}

/* ----------------------------------------------
 *  Initialization
 * ---------------------------------------------- */

async function initAdminId() {
    cacheAdminDom();

    // Load course→college mapping from DB
    await loadAdminCourseMap();

    // Filter pills
    document.getElementById('admin-filter-bar').addEventListener('click', handleFilterClick);

    // Review popover controls
    ADMIN_DOM.reviewClose.addEventListener('click', closeReview);
    ADMIN_DOM.advanceBtn.addEventListener('click', advanceStatus);
    ADMIN_DOM.rejectBtn.addEventListener('click', handleReject);

    // Reset reject mode when popover closes
    ADMIN_DOM.reviewPopover.addEventListener('toggle', (e) => {
        if (e.newState === 'closed') {
            rejectMode = false;
            ADMIN_DOM.rejectBtn.textContent = 'Reject';
        }
    });

    // COR click handler (opens Blob URL to avoid about:blank#blocked on data URIs)
    ADMIN_DOM.reviewCorLink.addEventListener('click', (e) => {
        e.preventDefault();
        openDocumentInNewTab(ADMIN_DOM.reviewCorLink.dataset.corSrc);
    });

    // Initial data load
    refreshData();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminId);
} else {
    initAdminId();
}
