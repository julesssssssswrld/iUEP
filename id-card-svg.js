'use strict';

/**
 * @fileoverview SVG-based UEP Student ID Card Generator.
 *
 * Produces a scalable, self-contained SVG replica of the physical
 * University of Eastern Philippines student ID card.
 *
 * Architecture:
 *   - Fixed viewBox (540 × 856) maps to the 54mm × 85.6mm physical card.
 *   - All coordinates are in viewBox units — the SVG scales to ANY container.
 *   - Data is injected via a plain object; the SVG rebuilds on every call.
 *   - The UEP seal is embedded as a base64 data URI for portability.
 *
 * Font size reference (mapped from CSS % → viewBox units at 300px card width):
 *   CSS 100% (16px)  → ~29 viewBox units
 *   CSS 150% (24px)  → ~43 viewBox units   (course text)
 *   CSS 120% (19.2px)→ ~35 viewBox units   (college name)
 *   CSS  70% (11.2px)→ ~20 viewBox units   (tiny header text)
 *   CSS  47.5%(7.6px)→ ~14 viewBox units   (UEP header text)
 *
 * Usage:
 *   const svg = generateIdCardSVG({
 *       studentName: 'JULES IAN C. TOMACAS',
 *       studentId:   '240475',
 *       course:      'BSIT',
 *       college:     'COLLEGE OF SCIENCE',
 *       photoBase64: 'data:image/jpeg;base64,...',   // optional
 *       logoBase64:  'data:image/png;base64,...',     // optional (UEP Seal)
 *   });
 *   container.innerHTML = svg;
 */

/* ──────────────────────────────────────────────
 *  Constants — viewBox coordinate system
 * ────────────────────────────────────────────── */

const ID_CARD = Object.freeze({
    // ViewBox dimensions (maps to 54mm × 85.6mm)
    W: 540,
    H: 856,

    // Corner radius (mimics the rounded plastic edges)
    R: 32,

    // Colors
    GREEN: '#008000',
    GREEN_DARK: '#006400',
    UEP_BLUE: '#17376E',
    WHITE: '#FFFFFF',
    BLACK: '#000000',
    YELLOW: '#FFD700',

    // Header strip
    HEADER_H: 66,       // ~7.75% of 856

    // Left sidebar
    SIDEBAR_W: 97,      // ~18% of 540

    // Font family (embedded via @import in SVG <defs>)
    FONT: "'Montserrat', Arial, Helvetica, sans-serif",
});


/* ──────────────────────────────────────────────
 *  Public API
 * ────────────────────────────────────────────── */

/**
 * Generates the full ID card SVG markup.
 *
 * @param {Object} data - Student data to inject.
 * @param {string}  data.studentName  - Full name (e.g. "JULES IAN C. TOMACAS")
 * @param {string}  data.studentId    - ID number (e.g. "240475")
 * @param {string}  data.course       - Course abbreviation (e.g. "BSIT")
 * @param {string}  data.college      - College name (e.g. "COLLEGE OF SCIENCE")
 * @param {string} [data.photoBase64] - Student photo as data URI
 * @param {string} [data.logoBase64]  - UEP seal/logo as data URI
 * @returns {string} Complete SVG markup string.
 */
function generateIdCardSVG(data = {}) {
    const d = {
        studentName: data.studentName || 'STUDENT NAME',
        studentId:   data.studentId   || '000000',
        course:      data.course      || 'BSIT',
        college:     data.college     || 'COLLEGE OF SCIENCE',
        photoBase64: data.photoBase64 || '',
        logoBase64:  data.logoBase64  || '',
    };

    const C = ID_CARD;

    // ── Derived geometry ──
    const headerBottom   = C.HEADER_H;
    const bodyTop        = headerBottom;
    const bodyH          = C.H - bodyTop;
    const sidebarX       = 0;
    const mainX          = C.SIDEBAR_W;
    const mainW          = C.W - C.SIDEBAR_W;
    const mainCenterX    = mainX + mainW / 2;

    // White header stripe (at ~80% down the green header)
    const stripeY  = C.HEADER_H * 0.80;
    const stripeH  = 1.5;

    // ── Sidebar layout ──
    // Logo area: full sidebar width, square aspect ratio
    const logoSize       = C.SIDEBAR_W;
    const logoY          = bodyTop;
    const logoPad        = 5;

    // Sidebar content starts below the logo with a small margin
    const sidebarContentTop = logoY + logoSize + 8;
    const sidebarBottom     = C.H - 10;

    // ── Build sidebar line positions ──
    // Pattern from CSS: 3 tight lines, gap, BSIT, gap, 3 tight lines, gap, ID NO., gap, 1 line
    // The "tight" lines are ~10% margin-top apart (relative to sidebar width)
    const tightGap = C.SIDEBAR_W * 0.10;  // lines within a group of 3

    const sidebarLinePositions = [];
    let curY = sidebarContentTop;

    // Group 1: 3 closely-spaced lines
    for (let i = 0; i < 3; i++) {
        curY += tightGap;
        sidebarLinePositions.push(curY);
    }

    // Course text block — BSIT letters stacked vertically
    // CSS: margin: 50% 0 50% 0 (50% of sidebar width = ~48px)
    const courseMargin = C.SIDEBAR_W * 0.35;
    const courseTopY   = curY + courseMargin;
    const courseChars  = d.course.split('');
    const courseFontSz = 42;   // CSS 150% ≈ 24px → ×1.8 ≈ 43
    const courseTotalH = courseChars.length * courseFontSz;
    const courseBotY   = courseTopY + courseTotalH;
    const courseCenterY = (courseTopY + courseBotY) / 2;
    curY = courseBotY + courseMargin;

    // Group 2: 3 closely-spaced lines
    for (let i = 0; i < 3; i++) {
        curY += tightGap;
        sidebarLinePositions.push(curY);
    }

    // Student number block — rotated sideways
    // CSS: margin: 20% 0 20% 0; font-weight: 800
    // Give the rotated text enough room so it doesn't clip
    const stuNumMargin  = C.SIDEBAR_W * 0.20;
    const stuNumTopY    = curY + stuNumMargin;
    const stuNumHeight  = C.SIDEBAR_W * 2.75;  // generous height for rotated text
    const stuNumBotY    = stuNumTopY + stuNumHeight;
    const stuNumCenterY = (stuNumTopY + stuNumBotY) / 2;

    // Final line — pinned near the card bottom for a clean finish
    sidebarLinePositions.push(C.H - 80);

    // ── Main content area ──
    // Using proportional spacing that matches the CSS padding/margins
    const mainTop   = bodyTop + 14;

    // "Republic of the Philippines" — CSS: font-size 70%, font-weight 600
    const repPhilY  = mainTop + 20;

    // "UNIVERSITY OF EASTERN PHILIPPINES" — CSS: font-size 47.5%, font-weight 600
    const uepHeaderY = repPhilY + 16;

    // "University Town, Northern Samar" — CSS: font-size 70%, font-weight 600
    const uniTownY  = uepHeaderY + 20;

    // College name — CSS: font-size 120%, font-weight 800, margin-bottom 10%
    const collegeY  = uniTownY + 38;

    // Student photo — CSS: height 35% of main, aspect-ratio 1/1, border 1px solid black
    const photoSize = bodyH * 0.35;
    const photoX    = mainCenterX - photoSize / 2;
    const photoY    = collegeY + 30;

    // "THIS CERTIFIES THAT" — CSS: font-size 70%, font-weight 600
    const certifiesY   = photoY + photoSize + 24;

    // Student name — CSS: font-weight 800, color blue
    const studentNameY = certifiesY + 26;

    // "is a bonfide student..." — CSS: font-size 70%, font-weight 600
    const bonfideY     = studentNameY + 22;

    // ── Build SVG ──
    return `<svg
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    viewBox="0 0 ${C.W} ${C.H}"
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="UEP Student ID Card for ${_esc(d.studentName)}"
    style="font-family: ${C.FONT};"
>
<defs>
    <!-- Google Fonts Montserrat -->
    <style type="text/css">
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&amp;display=swap');
    </style>

    <!-- Rounded rectangle clip for the entire card -->
    <clipPath id="card-clip">
        <rect x="0" y="0" width="${C.W}" height="${C.H}" rx="${C.R}" ry="${C.R}" />
    </clipPath>

    <!-- Clip for student photo -->
    <clipPath id="photo-clip">
        <rect x="${photoX}" y="${photoY}" width="${photoSize}" height="${photoSize}" />
    </clipPath>
</defs>

<!-- ════════════════════════════════════════════
     Card body (clipped to rounded rect)
     ════════════════════════════════════════════ -->
<g clip-path="url(#card-clip)">

    <!-- Card background -->
    <rect x="0" y="0" width="${C.W}" height="${C.H}" fill="${C.WHITE}" />

    <!-- ── Header strip (green) ── -->
    <rect x="0" y="0" width="${C.W}" height="${C.HEADER_H}" fill="${C.GREEN}" />
    <line x1="0" y1="${stripeY}" x2="${C.W}" y2="${stripeY}"
          stroke="${C.WHITE}" stroke-width="${stripeH}" />

    <!-- ── Left sidebar (green) ── -->
    <rect x="0" y="${bodyTop}" width="${C.SIDEBAR_W}" height="${bodyH}" fill="${C.GREEN}" />

    <!-- UEP Seal in sidebar -->
    ${d.logoBase64 ? `
    <image
        x="${sidebarX + logoPad}" y="${logoY + logoPad}"
        width="${logoSize - logoPad * 2}" height="${logoSize - logoPad * 2}"
        href="${_esc(d.logoBase64)}"
        preserveAspectRatio="xMidYMid meet"
    />` : `
    <!-- Logo placeholder circle -->
    <circle cx="${C.SIDEBAR_W / 2}" cy="${logoY + logoSize / 2}"
            r="${logoSize * 0.35}" fill="none" stroke="${C.WHITE}"
            stroke-width="2" stroke-dasharray="4,3" opacity="0.5" />
    `}

    <!-- Sidebar decorative white lines -->
    ${sidebarLinePositions.map(y =>
        `<line x1="${sidebarX}" y1="${y}" x2="${sidebarX + C.SIDEBAR_W}" y2="${y}"
              stroke="${C.WHITE}" stroke-width="1.5" />`
    ).join('\n    ')}

    <!-- Course text (vertical, upright letters) -->
    <!-- CSS: writing-mode: vertical-rl; text-orientation: upright; font-size: 150%; font-weight: 600 -->
    ${_verticalUprightText({
        text: d.course,
        x: C.SIDEBAR_W / 2,
        y: courseCenterY,
        fontSize: courseFontSz,
        fontWeight: 600,
        fill: C.WHITE,
        font: C.FONT,
    })}

    <!-- Student ID number (sideways, bottom-to-top) -->
    <!-- CSS: writing-mode: sideways-lr; font-weight: 800; white-space: nowrap -->
    <text
        x="${C.SIDEBAR_W / 2}" y="${stuNumCenterY}"
        fill="${C.WHITE}"
        font-family="${C.FONT}"
        font-size="24"
        font-weight="800"
        text-anchor="middle"
        dominant-baseline="central"
        transform="rotate(-90, ${C.SIDEBAR_W / 2}, ${stuNumCenterY})"
        letter-spacing="1"
    >ID NO. ${_esc(d.studentId)}</text>

    <!-- ── Main content area ── -->

    <!-- "Republic of the Philippines" -->
    <!-- CSS: font-size: 70% (≈11.2px → 20vb); font-weight: 600; color: green -->
    <text x="${mainCenterX}" y="${repPhilY}"
          fill="${C.GREEN}" font-family="${C.FONT}"
          font-size="20" font-weight="600"
          text-anchor="middle" dominant-baseline="auto"
    >Republic of the Philippines</text>

    <!-- "UNIVERSITY OF EASTERN PHILIPPINES" -->
    <!-- CSS: font-size: 47.5% (≈7.6px → 14vb); font-weight: 600; color: uep-blue -->
    <text x="${mainCenterX}" y="${uepHeaderY}"
          fill="${C.UEP_BLUE}" font-family="${C.FONT}"
          font-size="14" font-weight="600"
          text-anchor="middle" dominant-baseline="auto"
          letter-spacing="0.3"
    >UNIVERSITY OF EASTERN PHILIPPINES</text>

    <!-- "University Town, Northern Samar" -->
    <!-- CSS: font-size: 70% (≈11.2px → 20vb); font-weight: 600; color: green -->
    <text x="${mainCenterX}" y="${uniTownY}"
          fill="${C.GREEN}" font-family="${C.FONT}"
          font-size="20" font-weight="600"
          text-anchor="middle" dominant-baseline="auto"
    >University Town, Northern Samar</text>

    <!-- College name -->
    <!-- CSS: font-size: 120% (≈19.2px → 35vb); font-weight: 800; color: uep-blue -->
    <text x="${mainCenterX}" y="${collegeY}"
          fill="${C.UEP_BLUE}" font-family="${C.FONT}"
          font-size="35" font-weight="800"
          text-anchor="middle" dominant-baseline="auto"
          letter-spacing="0.5"
          data-field="college"
    >${_esc(d.college)}</text>

    <!-- Student photo container -->
    <rect x="${photoX}" y="${photoY}"
          width="${photoSize}" height="${photoSize}"
          fill="${C.WHITE}" stroke="${C.BLACK}" stroke-width="1.5" />
    ${d.photoBase64 ? `
    <image
        x="${photoX}" y="${photoY}"
        width="${photoSize}" height="${photoSize}"
        href="${_esc(d.photoBase64)}"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#photo-clip)"
    />` : ''}

    <!-- "THIS CERTIFIES THAT" -->
    <!-- CSS: font-size: 70% (≈11.2px → 20vb); font-weight: 600; color: green -->
    <text x="${mainCenterX}" y="${certifiesY}"
          fill="${C.GREEN}" font-family="${C.FONT}"
          font-size="20" font-weight="600"
          text-anchor="middle" dominant-baseline="auto"
    >THIS CERTIFIES THAT</text>

    <!-- Student full name -->
    <!-- CSS: font-weight: 800; color: uep-blue (inherited 100% → 29vb) -->
    <text x="${mainCenterX}" y="${studentNameY}"
          fill="${C.UEP_BLUE}" font-family="${C.FONT}"
          font-size="29" font-weight="800"
          text-anchor="middle" dominant-baseline="auto"
          data-field="studentName"
    >${_esc(d.studentName)}</text>

    <!-- "is a bonfide student of this University" -->
    <!-- CSS: font-size: 70% (≈11.2px → 20vb); font-weight: 600; color: green -->
    <text x="${mainCenterX}" y="${bonfideY}"
          fill="${C.GREEN}" font-family="${C.FONT}"
          font-size="20" font-weight="600"
          text-anchor="middle" dominant-baseline="auto"
    >is a bonfide student of this University</text>

</g>

<!-- Card border (drawn OVER content for clean edges) -->
<rect x="0" y="0" width="${C.W}" height="${C.H}"
      rx="${C.R}" ry="${C.R}"
      fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="1" />

</svg>`;
}


/* ──────────────────────────────────────────────
 *  Private helpers
 * ────────────────────────────────────────────── */

/**
 * Renders text with each character stacked vertically (upright),
 * matching CSS `writing-mode: vertical-rl; text-orientation: upright`.
 *
 * Each letter is placed individually so it works in all SVG renderers.
 */
function _verticalUprightText({ text, x, y, fontSize, fontWeight, fill, font }) {
    const chars = text.split('');
    const totalH = chars.length * fontSize;
    const startY = y - totalH / 2 + fontSize * 0.5;

    return chars.map((ch, i) =>
        `<text x="${x}" y="${startY + i * fontSize}"
              fill="${fill}" font-family="${font}"
              font-size="${fontSize}" font-weight="${fontWeight}"
              text-anchor="middle" dominant-baseline="central"
         >${_esc(ch)}</text>`
    ).join('\n    ');
}

/**
 * Escapes HTML/XML special characters for safe embedding.
 */
function _esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


/* ──────────────────────────────────────────────
 *  Convenience: render into a DOM element
 * ────────────────────────────────────────────── */

/**
 * Renders the SVG card into a target DOM element.
 *
 * @param {HTMLElement} container - The element to render into.
 * @param {Object} data - Student data (see generateIdCardSVG).
 */
function renderIdCard(container, data) {
    if (!container) {
        console.error('renderIdCard: container is null');
        return;
    }
    container.innerHTML = generateIdCardSVG(data);
}
