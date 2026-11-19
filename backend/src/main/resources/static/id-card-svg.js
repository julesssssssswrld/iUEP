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

    // QR code (derived from the student ID) — fills the blank space under the text.
    const qrTop  = bonfideY + 26;
    const qrSize = Math.min(220, C.H - qrTop - 44);
    const qrSvg  = _qrBlock(d.studentId, mainCenterX, qrTop, qrSize);

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

    <!-- QR code (encodes the student ID) -->
    ${qrSvg}

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
 *  Minimal QR Code encoder (self-contained, no external requests)
 * ────────────────────────────────────────────── */

/**
 * Tiny QR Code generator: byte mode, error-correction level M, versions 1–10
 * (up to 213 bytes). Follows ISO/IEC 18004; the mask is chosen with a reduced
 * penalty score (any of the 8 masks is a valid code).
 *
 * `_QR.encode(text)` returns { size, modules } where modules[y][x] is true for dark.
 * `_QR.toSvgPath(text)` returns { size, path } with the dark modules as one SVG path.
 */
const _QR = (() => {
    const ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26]; // level M
    const NUM_BLOCKS    = [0,  1,  1,  1,  2,  2,  4,  4,  4,  5,  5]; // level M
    const MAX_VERSION   = 10;

    // GF(256) tables for Reed–Solomon (primitive polynomial 0x11D)
    const EXP = new Uint8Array(512);
    const LOG = new Uint8Array(256);
    for (let i = 0, x = 1; i < 255; i++) {
        EXP[i] = x;
        LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
    const gfMul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

    function rsDivisor(degree) {
        const result = new Array(degree).fill(0);
        result[degree - 1] = 1;
        let root = 1;
        for (let i = 0; i < degree; i++) {
            for (let j = 0; j < degree; j++) {
                result[j] = gfMul(result[j], root);
                if (j + 1 < degree) result[j] ^= result[j + 1];
            }
            root = gfMul(root, 2);
        }
        return result;
    }

    function rsRemainder(data, divisor) {
        const result = new Array(divisor.length).fill(0);
        for (const b of data) {
            const factor = b ^ result.shift();
            result.push(0);
            divisor.forEach((coef, i) => { result[i] ^= gfMul(coef, factor); });
        }
        return result;
    }

    function rawDataModules(ver) {
        let result = (16 * ver + 128) * ver + 64;
        if (ver >= 2) {
            const numAlign = Math.floor(ver / 7) + 2;
            result -= (25 * numAlign - 10) * numAlign - 55;
            if (ver >= 7) result -= 36;
        }
        return result;
    }

    const dataCodewords = (ver) =>
        Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[ver] * NUM_BLOCKS[ver];

    function toUtf8Bytes(text) {
        return Array.from(new TextEncoder().encode(text));
    }

    function buildDataCodewords(bytes, ver) {
        const bits = [];
        const push = (value, len) => { for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
        push(0x4, 4);                              // byte mode
        push(bytes.length, ver <= 9 ? 8 : 16);     // character count
        bytes.forEach((b) => push(b, 8));
        const capBits = dataCodewords(ver) * 8;
        push(0, Math.min(4, capBits - bits.length)); // terminator
        push(0, (8 - (bits.length % 8)) % 8);        // byte align
        const out = [];
        for (let i = 0; i < bits.length; i += 8) {
            out.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
        }
        for (let pad = 0xec; out.length < dataCodewords(ver); pad ^= 0xec ^ 0x11) out.push(pad);
        return out;
    }

    function addEccAndInterleave(data, ver) {
        const numBlocks = NUM_BLOCKS[ver];
        const eccLen = ECC_PER_BLOCK[ver];
        const rawCodewords = Math.floor(rawDataModules(ver) / 8);
        const numShort = numBlocks - (rawCodewords % numBlocks);
        const shortLen = Math.floor(rawCodewords / numBlocks);
        const divisor = rsDivisor(eccLen);

        const blocks = [];
        for (let i = 0, k = 0; i < numBlocks; i++) {
            const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1));
            k += dat.length;
            const ecc = rsRemainder(dat, divisor);
            if (i < numShort) dat.push(0); // placeholder, skipped when interleaving
            blocks.push(dat.concat(ecc));
        }
        const result = [];
        for (let i = 0; i < blocks[0].length; i++) {
            blocks.forEach((block, j) => {
                if (i !== shortLen - eccLen || j >= numShort) result.push(block[i]);
            });
        }
        return result;
    }

    function alignmentPositions(ver) {
        if (ver === 1) return [];
        const numAlign = Math.floor(ver / 7) + 2;
        const size = ver * 4 + 17;
        const step = Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
        const result = [6];
        for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
        return result;
    }

    const MASKS = [
        (x, y) => (x + y) % 2 === 0,
        (x, y) => y % 2 === 0,
        (x, y) => x % 3 === 0,
        (x, y) => (x + y) % 3 === 0,
        (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
        (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
        (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
        (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
    ];

    function penalty(m, size) {
        let score = 0;
        for (let pass = 0; pass < 2; pass++) { // rows, then columns
            for (let a = 0; a < size; a++) {
                let run = 1;
                for (let b = 1; b < size; b++) {
                    const cur = pass ? m[b][a] : m[a][b];
                    const prev = pass ? m[b - 1][a] : m[a][b - 1];
                    if (cur === prev) {
                        run++;
                        if (run === 5) score += 3;
                        else if (run > 5) score += 1;
                    } else run = 1;
                }
            }
        }
        for (let y = 0; y < size - 1; y++) {
            for (let x = 0; x < size - 1; x++) {
                const c = m[y][x];
                if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
            }
        }
        const dark = m.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
        score += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
        return score;
    }

    function encode(text) {
        const bytes = toUtf8Bytes(String(text));
        let ver = 1;
        while (ver <= MAX_VERSION) {
            const needBits = 4 + (ver <= 9 ? 8 : 16) + bytes.length * 8;
            if (needBits <= dataCodewords(ver) * 8) break;
            ver++;
        }
        if (ver > MAX_VERSION) throw new RangeError('QR: text too long');

        const size = ver * 4 + 17;
        const modules = Array.from({ length: size }, () => new Array(size).fill(false));
        const isFn = Array.from({ length: size }, () => new Array(size).fill(false));
        const setFn = (x, y, dark) => {
            if (x < 0 || y < 0 || x >= size || y >= size) return;
            modules[y][x] = dark;
            isFn[y][x] = true;
        };
        const bit = (value, i) => ((value >>> i) & 1) !== 0;

        // Timing patterns
        for (let i = 0; i < size; i++) {
            setFn(6, i, i % 2 === 0);
            setFn(i, 6, i % 2 === 0);
        }
        // Finder patterns (with separators)
        [[3, 3], [size - 4, 3], [3, size - 4]].forEach(([cx, cy]) => {
            for (let dy = -4; dy <= 4; dy++) {
                for (let dx = -4; dx <= 4; dx++) {
                    const dist = Math.max(Math.abs(dx), Math.abs(dy));
                    setFn(cx + dx, cy + dy, dist !== 2 && dist !== 4);
                }
            }
        });
        // Alignment patterns
        const align = alignmentPositions(ver);
        align.forEach((cy, i) => {
            align.forEach((cx, j) => {
                if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) return;
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        setFn(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
                    }
                }
            });
        });

        const drawFormat = (mask) => {
            const data = mask; // level M = 0b00
            let rem = data;
            for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
            const bits = ((data << 10) | rem) ^ 0x5412;
            for (let i = 0; i <= 5; i++) setFn(8, i, bit(bits, i));
            setFn(8, 7, bit(bits, 6));
            setFn(8, 8, bit(bits, 7));
            setFn(7, 8, bit(bits, 8));
            for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(bits, i));
            for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(bits, i));
            for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(bits, i));
            setFn(8, size - 8, true); // always-dark module
        };
        drawFormat(0); // reserve the format area

        if (ver >= 7) {
            let rem = ver;
            for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
            const bits = (ver << 12) | rem;
            for (let i = 0; i < 18; i++) {
                const a = size - 11 + (i % 3);
                const b = Math.floor(i / 3);
                setFn(a, b, bit(bits, i));
                setFn(b, a, bit(bits, i));
            }
        }

        // Zig-zag placement of data + ECC codewords
        const codewords = addEccAndInterleave(buildDataCodewords(bytes, ver), ver);
        let bitIdx = 0;
        for (let right = size - 1; right >= 1; right -= 2) {
            if (right === 6) right = 5;
            for (let vert = 0; vert < size; vert++) {
                for (let j = 0; j < 2; j++) {
                    const x = right - j;
                    const upward = ((right + 1) & 2) === 0;
                    const y = upward ? size - 1 - vert : vert;
                    if (!isFn[y][x] && bitIdx < codewords.length * 8) {
                        modules[y][x] = bit(codewords[bitIdx >>> 3], 7 - (bitIdx & 7));
                        bitIdx++;
                    }
                }
            }
        }

        const applyMask = (mask) => {
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    if (!isFn[y][x] && MASKS[mask](x, y)) modules[y][x] = !modules[y][x];
                }
            }
        };

        let bestMask = 0;
        let bestScore = Infinity;
        for (let mask = 0; mask < 8; mask++) {
            applyMask(mask);
            drawFormat(mask);
            const score = penalty(modules, size);
            if (score < bestScore) { bestScore = score; bestMask = mask; }
            applyMask(mask); // undo (XOR)
        }
        applyMask(bestMask);
        drawFormat(bestMask);

        return { size, modules };
    }

    /** Dark modules as one SVG path (horizontal runs merged), in module units. */
    function toSvgPath(text) {
        const { size, modules } = encode(text);
        let path = '';
        for (let y = 0; y < size; y++) {
            let x = 0;
            while (x < size) {
                if (!modules[y][x]) { x++; continue; }
                const start = x;
                while (x < size && modules[y][x]) x++;
                path += `M${start} ${y}h${x - start}v1h-${x - start}z`;
            }
        }
        return { size, path };
    }

    return { encode, toSvgPath };
})();

/**
 * Builds the QR block for the card: white plate + dark modules, centred on `cx`
 * with its top edge at `top`. The code encodes the student ID.
 * Returns '' if the ID cannot be encoded so the card still renders.
 */
function _qrBlock(studentId, cx, top, boxSize) {
    let qr;
    try {
        qr = _QR.toSvgPath(studentId);
    } catch (e) {
        console.warn('[ID card] QR code skipped:', e);
        return '';
    }
    const QUIET = 3;                                   // quiet-zone modules around the code
    const unit  = boxSize / (qr.size + QUIET * 2);     // viewBox units per module
    const x = cx - boxSize / 2;
    return `
    <g data-field="qr" transform="translate(${x} ${top})">
        <title>QR code for student ID ${_esc(studentId)}</title>
        <rect width="${boxSize}" height="${boxSize}" fill="${ID_CARD.WHITE}" />
        <path transform="translate(${QUIET * unit} ${QUIET * unit}) scale(${unit})"
              d="${qr.path}" fill="${ID_CARD.BLACK}" shape-rendering="crispEdges" />
    </g>`;
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
