'use strict';

/**
 * @fileoverview Injectable grades table for the iUEP portal.
 * Renders the grades table from a data array, making it easy to
 * adjust based on a student's course load.
 */

/* ──────────────────────────────────────────────
 *  Grade Data
 * ────────────────────────────────────────────── */

/**
 * @typedef {Object} GradeEntry
 * @property {string} code        - Subject code (e.g. "CC104").
 * @property {string} description - Subject description.
 * @property {string} grade       - Grade value (e.g. "1.0", "INC", "DRP").
 */

/** @type {GradeEntry[]} */
const STUDENT_GRADES = [
    { code: 'CC104', description: 'Data Structures and Algorithms', grade: 'INC' },
    { code: 'GE 5', description: 'Contemporary World', grade: 'INC' },
    { code: 'HCI102', description: 'Human Computer Interaction 2', grade: 'INC' },
    { code: 'ITP102', description: 'IT Professional Ethics', grade: 'INC' },
    { code: 'MS102', description: 'Quantitative Methods', grade: 'INC' },
    { code: 'PE3', description: 'PATHFit 3', grade: 'INC' },
    { code: 'PF101', description: 'Object Oriented Programming', grade: 'INC' },
    { code: 'PT101', description: 'Platform Technologies', grade: 'INC' },
];

/* ──────────────────────────────────────────────
 *  Render
 * ────────────────────────────────────────────── */

/**
 * Renders the grades table body from the STUDENT_GRADES data array.
 * Targets the <tbody id="grades-tbody"> element.
 */
function renderGradesTable() {
    const tbody = document.getElementById('grades-tbody');
    if (!tbody) return;

    if (STUDENT_GRADES.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    No grades available for this semester.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = STUDENT_GRADES.map((entry) => `
        <tr>
            <td class="code-column"><b>${entry.code}</b></td>
            <td>${entry.description}</td>
            <td class="grade-column">${entry.grade}</td>
        </tr>
    `).join('');
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderGradesTable);
} else {
    renderGradesTable();
}
