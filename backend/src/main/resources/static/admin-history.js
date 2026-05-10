'use strict';

/**
 * @fileoverview Admin Claimed ID History — View, filter, sort, and export to Excel.
 * Export includes a dialog to choose between all records, current filter, or custom date range.
 */

/* ──────────────────────────────────────────────
 *  State
 * ────────────────────────────────────────────── */

let allRecords = [];
let filteredRecords = [];

/* ──────────────────────────────────────────────
 *  DOM References
 * ────────────────────────────────────────────── */

const historyBody = document.getElementById('history-body');
const emptyState = document.getElementById('history-empty-state');
const courseFilter = document.getElementById('history-course-filter');
const sortSelect = document.getElementById('history-sort');
const searchInput = document.getElementById('history-search');
const exportBtn = document.getElementById('export-excel-btn');
const totalCountEl = document.getElementById('history-total-count');

/* ──────────────────────────────────────────────
 *  Load Data
 * ────────────────────────────────────────────── */

async function loadHistory() {
    try {
        const res = await fetch('/api/admin/claimed-history');
        allRecords = await res.json();
        populateCourseFilter();
        applyFilters();
    } catch (err) {
        console.error('Failed to load claimed history:', err);
    }
}

function populateCourseFilter() {
    const courses = [...new Set(allRecords.map(r => r.course).filter(Boolean))].sort();
    courseFilter.innerHTML = '<option value="all">All Courses</option>' +
        courses.map(c => `<option value="${c}">${c}</option>`).join('');
}

/* ──────────────────────────────────────────────
 *  Filter & Sort
 * ────────────────────────────────────────────── */

function applyFilters() {
    const courseVal = courseFilter.value;
    const searchVal = searchInput.value.trim().toLowerCase();
    const sortVal = sortSelect.value;

    // Filter
    filteredRecords = allRecords.filter(r => {
        if (courseVal !== 'all' && r.course !== courseVal) return false;
        if (searchVal) {
            const fullName = `${r.first_name} ${r.middle_name || ''} ${r.last_name}`.toLowerCase();
            if (!fullName.includes(searchVal) && !r.student_id.includes(searchVal)) return false;
        }
        return true;
    });

    // Sort
    filteredRecords.sort((a, b) => {
        switch (sortVal) {
            case 'claimed_desc':
                return (b.updated_at || '').localeCompare(a.updated_at || '');
            case 'claimed_asc':
                return (a.updated_at || '').localeCompare(b.updated_at || '');
            case 'course_asc':
                return (a.course || '').localeCompare(b.course || '');
            case 'course_desc':
                return (b.course || '').localeCompare(a.course || '');
            case 'name_asc':
                return (a.last_name || '').localeCompare(b.last_name || '');
            case 'name_desc':
                return (b.last_name || '').localeCompare(a.last_name || '');
            default:
                return 0;
        }
    });

    renderTable();
}

/* ──────────────────────────────────────────────
 *  Render Table
 * ────────────────────────────────────────────── */

function renderTable() {
    totalCountEl.textContent = `${filteredRecords.length} record${filteredRecords.length !== 1 ? 's' : ''}`;

    if (!filteredRecords.length) {
        historyBody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    historyBody.innerHTML = filteredRecords.map(r => `
        <tr>
            <td>${esc(r.student_id)}</td>
            <td>${esc(r.last_name)}, ${esc(r.first_name)} ${esc(r.middle_name || '')}</td>
            <td>${esc(r.course)}</td>
            <td>${esc(r.year_level)}</td>
            <td>${esc(r.section)}</td>
            <td>${esc(r.library_id || '—')}</td>
            <td>${fmtDate(r.submitted_at)}</td>
            <td>${fmtDate(r.updated_at)}</td>
        </tr>
    `).join('');
}

function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z'));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toISODate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z'));
    return d.toISOString().slice(0, 10);
}

/* ──────────────────────────────────────────────
 *  Export Dialog
 * ────────────────────────────────────────────── */

const exportPopover = document.getElementById('export-popover');
const exportCloseBtn = document.getElementById('export-close');
const exportCancelBtn = document.getElementById('export-cancel');
const exportConfirmBtn = document.getElementById('export-confirm');
const exportModeSelect = document.getElementById('export-mode');
const exportCourseSelect = document.getElementById('export-course');
const dateRangeGroup = document.getElementById('export-date-range-group');
const courseGroup = document.getElementById('export-course-group');

// Open export dialog
exportBtn.addEventListener('click', () => {
    if (!allRecords.length) {
        alert('No records to export.');
        return;
    }

    // Populate course select in export dialog
    const courses = [...new Set(allRecords.map(r => r.course).filter(Boolean))].sort();
    exportCourseSelect.innerHTML = '<option value="all">All Courses</option>' +
        courses.map(c => `<option value="${c}">${c}</option>`).join('');

    // Sync with current page filter
    exportCourseSelect.value = courseFilter.value;

    // Reset
    exportModeSelect.value = 'current';
    updateExportFields();
    exportPopover.showPopover();
});

// Close handlers
exportCloseBtn.addEventListener('click', () => exportPopover.hidePopover());
exportCancelBtn.addEventListener('click', () => exportPopover.hidePopover());

// Toggle date range and course fields based on export mode
exportModeSelect.addEventListener('change', updateExportFields);

function updateExportFields() {
    const mode = exportModeSelect.value;
    dateRangeGroup.classList.toggle('hidden', mode !== 'date_range');
    courseGroup.classList.toggle('hidden', mode === 'current');
}

// Confirm export
exportConfirmBtn.addEventListener('click', () => {
    const mode = exportModeSelect.value;
    let records;

    if (mode === 'current') {
        // Export exactly what's currently showing in the table
        records = [...filteredRecords];
    } else if (mode === 'all') {
        // Export all, optionally filtered by course
        const exportCourse = exportCourseSelect.value;
        records = exportCourse === 'all'
            ? [...allRecords]
            : allRecords.filter(r => r.course === exportCourse);
    } else if (mode === 'date_range') {
        const from = document.getElementById('export-date-from').value;
        const to = document.getElementById('export-date-to').value;
        const exportCourse = exportCourseSelect.value;

        if (!from || !to) {
            alert('Please select both start and end dates.');
            return;
        }

        if (from > to) {
            alert('Start date must be before end date.');
            return;
        }

        records = allRecords.filter(r => {
            const claimedDate = toISODate(r.updated_at);
            if (claimedDate < from || claimedDate > to) return false;
            if (exportCourse !== 'all' && r.course !== exportCourse) return false;
            return true;
        });
    }

    if (!records || !records.length) {
        alert('No records match your export criteria.');
        return;
    }

    exportToExcel(records);
    exportPopover.hidePopover();
});

/* ──────────────────────────────────────────────
 *  Excel Export (SheetJS)
 * ────────────────────────────────────────────── */

function exportToExcel(records) {
    const rows = records.map(r => ({
        'Student ID': r.student_id,
        'Last Name': r.last_name,
        'First Name': r.first_name,
        'Middle Name': r.middle_name || '',
        'Course': r.course,
        'Year Level': r.year_level,
        'Section': r.section,
        'Library ID': r.library_id || '',
        'Submitted': fmtDate(r.submitted_at),
        'Claimed': fmtDate(r.updated_at),
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns
    const colWidths = Object.keys(rows[0]).map(key => ({
        wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length)) + 2,
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Claimed IDs');

    // Generate filename
    const dateStr = new Date().toISOString().slice(0, 10);
    const exportCourse = exportCourseSelect.value;
    const courseTag = exportCourse !== 'all' ? `_${exportCourse}` : '';
    XLSX.writeFile(wb, `iUEP_Claimed_IDs${courseTag}_${dateStr}.xlsx`);
}

/* ──────────────────────────────────────────────
 *  Event Listeners
 * ────────────────────────────────────────────── */

courseFilter.addEventListener('change', applyFilters);
sortSelect.addEventListener('change', applyFilters);

let searchDebounce;
searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(applyFilters, 250);
});

/* ──────────────────────────────────────────────
 *  Init
 * ────────────────────────────────────────────── */

loadHistory();
