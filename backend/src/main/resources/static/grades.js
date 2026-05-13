'use strict';

/**
 * @fileoverview Grades page — fetches student grades from the API
 * and renders them with Year Level + Semester filter dropdowns.
 * Grays out year levels / semesters the student hasn't reached yet.
 */

/* ──────────────────────────────────────────────
 *  Constants
 * ────────────────────────────────────────────── */

const YEAR_LABELS = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year', 5: '5th Year' };

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
 *  DOM References
 * ────────────────────────────────────────────── */

let yearSelect, semesterSelect;

/* ──────────────────────────────────────────────
 *  Dropdown State
 * ────────────────────────────────────────────── */

/** Student's current year level (integer) — drives graying logic */
let studentMaxYear = 1;

/** Years that have grade data in the DB */
let availableYears = [];

/** Semesters with data for the currently selected year */
let availableSemesters = [];

/* ──────────────────────────────────────────────
 *  Fetch & Render
 * ────────────────────────────────────────────── */

/**
 * Fetches grades from the backend and renders the table.
 * Also updates dropdown availability metadata.
 * @param {string} stuId - Student ID
 * @param {number} [yearLevel] - Year level filter
 * @param {string} [semester] - Semester filter
 */
async function loadGrades(stuId, yearLevel, semester) {
    const tbody = document.getElementById('grades-tbody');
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
        if (yearLevel != null) params.push(`yearLevel=${yearLevel}`);
        if (semester) params.push(`semester=${encodeURIComponent(semester)}`);
        if (params.length) endpoint += '?' + params.join('&');

        const data = await apiFetch(endpoint);

        // Update state from API response
        if (data.studentYearLevel != null) studentMaxYear = data.studentYearLevel;
        if (data.availableYears) availableYears = data.availableYears;
        if (data.availableSemesters) availableSemesters = data.availableSemesters;

        // Update dropdown graying
        updateYearDropdown();
        updateSemesterDropdown();

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
                    No grades available for this period.
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
 *  Dropdown Logic
 * ────────────────────────────────────────────── */

/**
 * Updates the Year dropdown — grays out years beyond the student's enrollment.
 */
function updateYearDropdown() {
    if (!yearSelect) return;

    Array.from(yearSelect.options).forEach((opt) => {
        const val = parseInt(opt.value, 10);
        const isFuture = val > studentMaxYear;
        opt.disabled = isFuture;
        opt.classList.toggle('grade-option-disabled', isFuture);
    });
}

/**
 * Updates the Semester dropdown — grays out semesters without data
 * for the currently selected year level.
 */
function updateSemesterDropdown() {
    if (!semesterSelect) return;

    Array.from(semesterSelect.options).forEach((opt) => {
        const selectedYear = parseInt(yearSelect.value, 10);
        const isFutureYear = selectedYear > studentMaxYear;

        // If it's a future year, disable all semesters
        if (isFutureYear) {
            opt.disabled = true;
            opt.classList.add('grade-option-disabled');
            return;
        }

        // For current/past years, check if this semester has data
        const hasData = availableSemesters.includes(opt.value);

        // For the student's current year, disable semesters they haven't reached
        // For past years, all semesters should be available if they have data
        opt.disabled = !hasData;
        opt.classList.toggle('grade-option-disabled', !hasData);
    });
}

/**
 * Finds the latest enabled semester option.
 * @returns {HTMLOptionElement|undefined}
 */
function getLatestEnabledSemester() {
    return Array.from(semesterSelect.options).reverse().find(opt => !opt.disabled);
}



/* ──────────────────────────────────────────────
 *  Filter Handlers
 * ────────────────────────────────────────────── */

function initFilterHandlers(stuId) {
    yearSelect = document.getElementById('grade-year-select');
    semesterSelect = document.getElementById('grade-semester-select');
    if (!yearSelect || !semesterSelect) return;

    yearSelect.addEventListener('change', () => {
        const selectedYear = parseInt(yearSelect.value, 10);

        // If user selects a disabled (future) year, revert
        if (selectedYear > studentMaxYear) {
            yearSelect.value = studentMaxYear;
            return;
        }

        // Reload grades for the new year (and refresh semester availability)
        // First load without semester filter to get available semesters for this year
        loadGrades(stuId, selectedYear, null).then(() => {
            // After loading, auto-select the latest available semester
            const latestAvailable = getLatestEnabledSemester();
            if (latestAvailable) {
                semesterSelect.value = latestAvailable.value;
                loadGrades(stuId, selectedYear, latestAvailable.value);
            }
        });
    });

    semesterSelect.addEventListener('change', () => {
        const selectedYear = parseInt(yearSelect.value, 10);
        const selectedSemester = semesterSelect.value;

        // If user selects a disabled semester, revert to latest available
        const selectedOpt = semesterSelect.options[semesterSelect.selectedIndex];
        if (selectedOpt.disabled) {
            const latestAvailable = getLatestEnabledSemester();
            if (latestAvailable) semesterSelect.value = latestAvailable.value;
            return;
        }

        loadGrades(stuId, selectedYear, selectedSemester);
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

    yearSelect = document.getElementById('grade-year-select');
    semesterSelect = document.getElementById('grade-semester-select');

    // Parse user's year level to set defaults
    const userYearStr = user.year_level || user.yearLevel || '1st Year';
    studentMaxYear = parseUserYearLevel(userYearStr);
    
    // Set default year and initialize handlers before loading
    if (yearSelect) yearSelect.value = studentMaxYear;
    initFilterHandlers(stuId);

    // Initial load with defaults: fetch year data, then auto-select the latest available semester
    loadGrades(stuId, studentMaxYear, null).then(() => {
        if (semesterSelect) {
            const latestAvailable = getLatestEnabledSemester();
            if (latestAvailable) {
                semesterSelect.value = latestAvailable.value;
                loadGrades(stuId, studentMaxYear, latestAvailable.value);
            }
        }
    });
}

/**
 * Parses "1st Year", "2nd Year", etc. to an integer.
 * @param {string} str
 * @returns {number}
 */
function parseUserYearLevel(str) {
    if (!str) return 1;
    const match = String(str).trim().match(/\d/);
    return match ? parseInt(match[0], 10) : 1;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGradesPage);
} else {
    initGradesPage();
}
