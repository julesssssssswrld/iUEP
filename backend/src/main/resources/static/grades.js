'use strict';

/**
 * @fileoverview Grades page — fetches student grades from the API
 * and renders them with a semester filter dropdown.
 */

/* ──────────────────────────────────────────────
 *  Auth Check
 * ────────────────────────────────────────────── */

/**
 * Checks if user is logged in. If not, shows auth guard.
 * @returns {Object|null} User object or null.
 */
function checkGradesAuth() {
    const user = (typeof getSessionUser === 'function') ? getSessionUser() : null;
    const guard = document.getElementById('grades-auth-guard');
    const content = document.getElementById('grades-content');

    if (!user) {
        if (guard) guard.classList.remove('hidden');
        if (content) content.classList.add('hidden');
        return null;
    }

    if (guard) guard.classList.add('hidden');
    if (content) content.classList.remove('hidden');
    return user;
}

/* ──────────────────────────────────────────────
 *  Fetch & Render
 * ────────────────────────────────────────────── */

/**
 * Fetches grades from the backend and renders the table + semester dropdown.
 * @param {string} stuId - Student ID
 * @param {string} [semester] - Optional semester filter
 * @param {string} [academicYear] - Optional AY filter
 */
async function loadGrades(stuId, semester, academicYear) {
    const tbody = document.getElementById('grades-tbody');
    const select = document.getElementById('semester-select');
    if (!tbody) return;

    // Show loading state
    tbody.innerHTML = `
        <tr>
            <td colspan="3" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                Loading grades...
            </td>
        </tr>`;

    try {
        let endpoint = `/grades/${stuId}`;
        const params = [];
        if (semester) params.push(`semester=${encodeURIComponent(semester)}`);
        if (academicYear) params.push(`academicYear=${encodeURIComponent(academicYear)}`);
        if (params.length) endpoint += '?' + params.join('&');

        const data = await apiFetch(endpoint);

        // Populate semester dropdown (only on first load or if empty)
        if (select && select.options.length <= 1 && data.semesters && data.semesters.length) {
            // Clear existing options except the first "All Semesters"
            select.innerHTML = '<option value="">All Semesters</option>';
            data.semesters.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                select.appendChild(opt);
            });
        }

        renderGradesTable(data.grades || []);
    } catch (err) {
        console.error('[Grades] Failed to load:', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 2rem; color: var(--accent-red);">
                    Failed to load grades. Please try again later.
                </td>
            </tr>`;
    }
}

/**
 * Renders the grades table body from fetched data.
 * @param {Array<{subjectCode: string, description: string, grade: string}>} grades
 */
function renderGradesTable(grades) {
    const tbody = document.getElementById('grades-tbody');
    if (!tbody) return;

    if (grades.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    No grades available for this semester.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = grades.map((entry) => `
        <tr>
            <td class="code-column" data-label="Subject Code"><b>${entry.subjectCode}</b></td>
            <td data-label="Description">${entry.description}</td>
            <td class="grade-column" data-label="Grade">${entry.grade}</td>
        </tr>
    `).join('');
}

/* ──────────────────────────────────────────────
 *  Semester Filter Handler
 * ────────────────────────────────────────────── */

function initSemesterFilter(stuId) {
    const select = document.getElementById('semester-select');
    if (!select) return;

    select.addEventListener('change', () => {
        const val = select.value;
        if (!val) {
            // "All Semesters" selected
            loadGrades(stuId);
        } else {
            // Value format: "1st Semester | 2025-2026"
            const parts = val.split(' | ');
            loadGrades(stuId, parts[0], parts[1]);
        }
    });
}

/* ──────────────────────────────────────────────
 *  Init
 * ────────────────────────────────────────────── */

function initGradesPage() {
    const user = checkGradesAuth();
    if (!user) return;

    const stuId = user.stuId || user.stu_id;
    if (!stuId) return;

    // Set the date display
    const dateEl = document.getElementById('currentDateDisplay');
    if (dateEl && typeof formatDate === 'function') {
        dateEl.textContent = formatDate();
    }

    initSemesterFilter(stuId);
    loadGrades(stuId);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGradesPage);
} else {
    initGradesPage();
}
