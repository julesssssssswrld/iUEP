'use strict';

/**
 * @fileoverview Express server for the iUEP portal.
 * Serves static files and exposes REST API endpoints backed by SQLite.
 */

// Load .env before anything else
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { initDatabase, getDb } = require('./db');
const { scrapeIfStale, forceScrape } = require('./fb-scraper');

const app = express();
const PORT = process.env.PORT || 3000;

/** Directory for ID application images (photo + COR). */
const ID_IMG_DIR = path.join(__dirname, 'uploads', 'id-applications');

// Middleware
app.use(express.json({ limit: '10mb' })); // Large limit for base64 images
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve cached images
app.use(express.static(path.join(__dirname)));

// Prevent browser caching for all API routes
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// Ensure upload directories exist
if (!fs.existsSync(ID_IMG_DIR)) fs.mkdirSync(ID_IMG_DIR, { recursive: true });

// Initialize database
initDatabase();

/* ----------------------------------------------
 *  Auth API Routes
 * ---------------------------------------------- */

/**
 * POST /api/auth/check-student
 * Step 1: Check if a student ID exists in the system.
 * Body: { stuId }
 * Returns: { exists, maskedEmail? }
 */
app.post('/api/auth/check-student', (req, res) => {
    const db = getDb();
    const { stuId } = req.body;

    if (!stuId || !/^\d{6}$/.test(stuId)) {
        return res.status(400).json({ error: 'Student ID must be exactly 6 digits.' });
    }

    const user = db.prepare('SELECT stu_id, email, username FROM users WHERE stu_id = ?').get(stuId);

    if (!user) {
        return res.json({ exists: false });
    }

    if (user.username) {
        return res.status(409).json({ error: 'This student ID already has a registered account.' });
    }

    // Mask email: j***@gmail.com
    let maskedEmail = null;
    if (user.email) {
        const [local, domain] = user.email.split('@');
        maskedEmail = local.charAt(0) + '***@' + domain;
    }

    res.json({ exists: true, maskedEmail });
});

/**
 * POST /api/auth/verify-birthday
 * Step 2: Verify the student's birthday.
 * Body: { stuId, birthday } (birthday as YYYY-MM-DD)
 * Returns: { verified, firstName, lastName, middleName, course, yearLevel, section }
 */
app.post('/api/auth/verify-birthday', (req, res) => {
    const db = getDb();
    const { stuId, birthday } = req.body;

    if (!stuId || !birthday) {
        return res.status(400).json({ error: 'Student ID and birthday are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE stu_id = ?').get(stuId);
    if (!user) {
        return res.status(404).json({ error: 'Student not found.' });
    }

    if (user.birthday !== birthday) {
        return res.json({ verified: false });
    }

    res.json({
        verified: true,
        firstName: user.first_name,
        middleName: user.middle_name,
        lastName: user.last_name,
        course: user.course,
        yearLevel: user.year_level,
        section: user.section,
    });
});

/**
 * POST /api/auth/register
 * Step 4: Create account (placeholder â€” no hashing yet).
 * Body: { stuId, username, password }
 */
app.post('/api/auth/register', (req, res) => {
    const db = getDb();
    const { stuId, username, password, email } = req.body;

    if (!stuId || !username || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE stu_id = ?').get(stuId);
    if (!user) {
        return res.status(404).json({ error: 'Student not found.' });
    }

    if (user.username) {
        return res.status(409).json({ error: 'This student already has an account.' });
    }

    // Check username uniqueness
    const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUsername) {
        return res.status(409).json({ error: 'Username already taken.' });
    }

    // Placeholder: store password as-is (NO hashing â€” will be replaced with bcrypt later)
    db.prepare('UPDATE users SET username = ?, password_hash = ?, email = ? WHERE stu_id = ?')
        .run(username, password, email || null, stuId);

    res.status(201).json({ success: true, message: 'Account created successfully.' });
});

/**
 * POST /api/auth/login
 * Placeholder login â€” validates credentials against DB.
 * Body: { stuId, password }
 */
app.post('/api/auth/login', (req, res) => {
    const db = getDb();
    const { stuId, password } = req.body;

    if (!stuId || !password) {
        return res.status(400).json({ error: 'Student ID and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE stu_id = ?').get(stuId);
    if (!user || !user.username) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Placeholder: plain-text comparison (will be replaced with bcrypt.compare later)
    if (user.password_hash !== password) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Return user profile (no session/JWT yet)
    res.json({
        success: true,
        user: {
            stuId: user.stu_id,
            username: user.username,
            firstName: user.first_name,
            middleName: user.middle_name,
            lastName: user.last_name,
            course: user.course,
            yearLevel: user.year_level,
            section: user.section,
            profilePic: user.profile_pic || null,
        },
    });
});

/* ----------------------------------------------
 *  Admin Auth API Routes
 * ---------------------------------------------- */

/**
 * POST /api/auth/admin-login
 * Admin login â€” validates credentials against the admins table.
 * Body: { username, password }
 */
app.post('/api/auth/admin-login', (req, res) => {
    const db = getDb();
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin || !admin.password_hash) {
        return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    // Placeholder: plain-text comparison (will be replaced with bcrypt.compare later)
    if (admin.password_hash !== password) {
        return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    res.json({
        success: true,
        admin: {
            id: admin.id,
            username: admin.username,
            displayName: admin.display_name,
            role: admin.role,
        },
    });
});

/* ----------------------------------------------
 *  Student API Routes
 * ---------------------------------------------- */

/**
 * GET /api/users/:stuId
 * Returns student profile by student ID.
 */
app.get('/api/users/:stuId', (req, res) => {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE stu_id = ?').get(req.params.stuId);

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

/**
 * GET /api/courses
 * Returns all course-to-college mappings.
 */
app.get('/api/courses', (req, res) => {
    const db = getDb();
    const courses = db.prepare('SELECT course_code, course_name, college FROM courses ORDER BY college, course_code').all();
    res.json(courses);
});

/**
 * GET /api/courses/:code
 * Returns a single course by its code.
 */
app.get('/api/courses/:code', (req, res) => {
    const db = getDb();
    const course = db.prepare('SELECT course_code, course_name, college FROM courses WHERE course_code = ?').get(req.params.code.toUpperCase());

    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
});

/**
 * GET /api/id-application/:stuId
 * Returns the latest ID application for a student.
 */
app.get('/api/id-application/:stuId', (req, res) => {
    const db = getDb();
    const app_ = db.prepare(`
        SELECT a.*, u.first_name, u.middle_name, u.last_name, u.course, u.year_level, u.section
        FROM id_applications a
        JOIN users u ON a.student_id = u.stu_id
        WHERE a.student_id = ?
        ORDER BY a.submitted_at DESC
        LIMIT 1
    `).get(req.params.stuId);

    if (!app_) return res.json(null);

    // Add photo_url / cor_url for the frontend (prefer file path, fallback to base64)
    app_.photo_url = app_.photo_path || app_.photo_base64 || null;
    app_.cor_url = app_.cor_path || app_.cor_base64 || null;

    res.json(app_);
});

/**
 * POST /api/id-application
 * Submit a new ID application.
 * Receives base64 images, compresses them with sharp, and saves to disk.
 * Body: { studentId, photoBase64, corBase64, libraryId }
 */
app.post('/api/id-application', async (req, res) => {
    const db = getDb();
    const { studentId, photoBase64, corBase64, libraryId } = req.body;

    if (!studentId || !photoBase64 || !corBase64 || !libraryId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate that both uploads are images (JPG/PNG only, no PDFs)
    if (!photoBase64.match(/^data:image\/(jpeg|png|jpg)/)) {
        return res.status(400).json({ error: 'ID Photo must be a JPG or PNG image.' });
    }
    if (!corBase64.match(/^data:image\/(jpeg|png|jpg)/)) {
        return res.status(400).json({ error: 'COR must be a JPG or PNG image.' });
    }

    // Check if student exists
    const user = db.prepare('SELECT * FROM users WHERE stu_id = ?').get(studentId);
    if (!user) {
        return res.status(404).json({ error: 'Student not found' });
    }

    try {
        // Decode base64 â†’ compress â†’ save to disk
        const timestamp = Date.now();
        const photoFilename = `${studentId}_photo_${timestamp}.jpg`;
        const corFilename = `${studentId}_cor_${timestamp}.jpg`;

        // Photo: resize to max 800px wide, JPEG q80
        const photoBuffer = Buffer.from(photoBase64.replace(/^data:.*?;base64,/, ''), 'base64');
        await sharp(photoBuffer)
            .resize({ width: 800, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(path.join(ID_IMG_DIR, photoFilename));

        // COR: resize to max 1200px wide, JPEG q80
        const corBuffer = Buffer.from(corBase64.replace(/^data:.*?;base64,/, ''), 'base64');
        await sharp(corBuffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(path.join(ID_IMG_DIR, corFilename));

        const photoPath = `/uploads/id-applications/${photoFilename}`;
        const corPath = `/uploads/id-applications/${corFilename}`;

        // Insert with file paths (no base64 blobs stored)
        const result = db.prepare(`
            INSERT INTO id_applications (student_id, status, photo_path, cor_path, library_id)
            VALUES (?, 'uploaded', ?, ?, ?)
        `).run(studentId, photoPath, corPath, libraryId);

        const newApp = db.prepare('SELECT * FROM id_applications WHERE id = ?').get(result.lastInsertRowid);
        newApp.photo_url = newApp.photo_path;
        newApp.cor_url = newApp.cor_path;
        res.status(201).json(newApp);

    } catch (err) {
        console.error('[Server] Image processing failed:', err.message);
        res.status(500).json({ error: 'Failed to process uploaded images.' });
    }
});

/* ----------------------------------------------
 *  Admin API Routes
 * ---------------------------------------------- */

/**
 * GET /api/admin/applications
 * List all applications. Optional query: ?status=uploaded
 */
app.get('/api/admin/applications', (req, res) => {
    const db = getDb();
    const { status } = req.query;

    let query = `
        SELECT a.*, u.first_name, u.middle_name, u.last_name, u.course, u.year_level, u.section
        FROM id_applications a
        JOIN users u ON a.student_id = u.stu_id
    `;
    const params = [];

    if (status && status !== 'all') {
        query += ' WHERE a.status = ?';
        params.push(status);
    }

    query += ' ORDER BY a.submitted_at DESC';

    const applications = db.prepare(query).all(...params);
    res.json(applications);
});

/**
 * GET /api/admin/applications/:id
 * Get a single application with full details.
 */
app.get('/api/admin/applications/:id', (req, res) => {
    const db = getDb();
    const app_ = db.prepare(`
        SELECT a.*, u.first_name, u.middle_name, u.last_name, u.course, u.year_level, u.section, u.stu_id
        FROM id_applications a
        JOIN users u ON a.student_id = u.stu_id
        WHERE a.id = ?
    `).get(req.params.id);

    if (!app_) return res.status(404).json({ error: 'Application not found' });

    // Add photo_url / cor_url for the frontend (prefer file path, fallback to base64)
    app_.photo_url = app_.photo_path || app_.photo_base64 || null;
    app_.cor_url = app_.cor_path || app_.cor_base64 || null;

    res.json(app_);
});

/**
 * PATCH /api/admin/applications/:id/status
 * Update application status.
 * Body: { status, rejectionReason? }
 */
app.patch('/api/admin/applications/:id/status', (req, res) => {
    const db = getDb();
    const { status, rejectionReason } = req.body;
    const validStatuses = ['uploaded', 'received', 'processing', 'completed', 'claimed', 'rejected'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const existing = db.prepare('SELECT * FROM id_applications WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Application not found' });

    db.prepare(`
        UPDATE id_applications
        SET status = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP, updated_by = 'admin'
        WHERE id = ?
    `).run(status, rejectionReason || null, req.params.id);

    const updated = db.prepare(`
        SELECT a.*, u.first_name, u.middle_name, u.last_name, u.course, u.year_level, u.section
        FROM id_applications a
        JOIN users u ON a.student_id = u.stu_id
        WHERE a.id = ?
    `).get(req.params.id);

    res.json(updated);
});

/**
 * GET /api/admin/stats
 * Returns counts by status for the stats bar.
 */
app.get('/api/admin/stats', (req, res) => {
    const db = getDb();
    const stats = db.prepare(`
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status IN ('uploaded', 'received') THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) AS claimed,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
        FROM id_applications
    `).get();

    res.json(stats);
});

/* ----------------------------------------------
 *  Admin Credential Management API Routes
 * ---------------------------------------------- */

/**
 * GET /api/admin/admins
 * List all admin accounts.
 */
app.get('/api/admin/admins', (req, res) => {
    const db = getDb();
    const admins = db.prepare('SELECT id, username, display_name, role, created_at FROM admins ORDER BY id').all();
    res.json(admins);
});

/**
 * POST /api/admin/admins
 * Create a new admin account.
 * Body: { username, displayName, password, role }
 */
app.post('/api/admin/admins', (req, res) => {
    const db = getDb();
    const { username, displayName, password, role } = req.body;

    if (!username || !displayName || !password) {
        return res.status(400).json({ error: 'Username, display name, and password are required.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
    if (existing) {
        return res.status(409).json({ error: 'Username already taken.' });
    }

    const result = db.prepare(
        'INSERT INTO admins (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
    ).run(username, password, displayName, role || 'id_production');

    res.status(201).json({ success: true, id: result.lastInsertRowid });
});

/**
 * PATCH /api/admin/admins/:id/password
 * Update an admin's password (requires current password).
 * Body: { currentPassword, password }
 */
app.patch('/api/admin/admins/:id/password', (req, res) => {
    const db = getDb();
    const { currentPassword, password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found.' });

    // Verify current password
    if (currentPassword && admin.password_hash !== currentPassword) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(password, req.params.id);
    res.json({ success: true });
});

/**
 * PATCH /api/admin/admins/:id/username
 * Update an admin's username.
 * Body: { username }
 */
app.patch('/api/admin/admins/:id/username', (req, res) => {
    const db = getDb();
    const { username } = req.body;

    if (!username || username.trim().length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }

    const admin = db.prepare('SELECT id FROM admins WHERE id = ?').get(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found.' });

    const existing = db.prepare('SELECT id FROM admins WHERE username = ? AND id != ?').get(username.trim(), Number(req.params.id));
    if (existing) {
        return res.status(409).json({ error: 'Username already taken.' });
    }

    db.prepare('UPDATE admins SET username = ? WHERE id = ?').run(username.trim(), req.params.id);
    res.json({ success: true });
});

/**
 * DELETE /api/admin/admins/:id
 * Delete an admin account.
 */
app.delete('/api/admin/admins/:id', (req, res) => {
    const db = getDb();
    const adminCount = db.prepare('SELECT COUNT(*) AS count FROM admins').get().count;

    if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin account.' });
    }

    const admin = db.prepare('SELECT id FROM admins WHERE id = ?').get(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found.' });

    db.prepare('DELETE FROM admins WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

/**
 * GET /api/admin/claimed-history
 * Returns all claimed ID applications with student info.
 */
app.get('/api/admin/claimed-history', (req, res) => {
    const db = getDb();
    const records = db.prepare(`
        SELECT a.id, a.student_id, a.status, a.library_id, a.submitted_at, a.updated_at,
               u.first_name, u.middle_name, u.last_name, u.course, u.year_level, u.section
        FROM id_applications a
        JOIN users u ON a.student_id = u.stu_id
        WHERE a.status = 'claimed'
        ORDER BY a.updated_at DESC
    `).all();
    res.json(records);
});

/* ----------------------------------------------
 *  Facebook Posts API Routes
 * ---------------------------------------------- */

/**
 * GET /api/posts
 * Returns scraped FB posts from the database.
 * Optional query: ?dept=pillar (default: all)
 * Also triggers a background freshness check â€” no credits wasted if data is fresh.
 */
app.get('/api/posts', (req, res) => {
    const db = getDb();
    const { dept } = req.query;

    let query = 'SELECT * FROM fb_posts';
    const params = [];

    if (dept && dept !== 'all') {
        query += ' WHERE department = ?';
        params.push(dept);
    }

    query += ' ORDER BY post_date DESC';

    const posts = db.prepare(query).all(...params);
    res.json(posts);

    // Background freshness check â€” fire-and-forget (response already sent)
    scrapeIfStale(dept && dept !== 'all' ? dept : undefined).catch((err) => {
        console.error('[Server] Background scrape check failed:', err.message);
    });
});

/**
 * GET /api/posts/status
 * Returns scrape freshness info for the frontend (optional).
 */
app.get('/api/posts/status', (req, res) => {
    const db = getDb();
    const logs = db.prepare(`
        SELECT department, scraped_at, post_count, status
        FROM scrape_log
        ORDER BY scraped_at DESC
        LIMIT 10
    `).all();
    res.json(logs);
});

/**
 * POST /api/admin/scrape
 * Force-triggers a scrape regardless of freshness.
 * Body (optional): { department: 'pillar' }
 */
app.post('/api/admin/scrape', async (req, res) => {
    const { department } = req.body || {};

    try {
        const count = await forceScrape(department || undefined);
        res.json({ success: true, postsScraped: count });
    } catch (err) {
        console.error('[Server] Force scrape failed:', err.message);
        res.status(500).json({ error: 'Scrape failed', message: err.message });
    }
});

/* ----------------------------------------------
 *  Student Account Settings API Routes
 * ---------------------------------------------- */

/**
 * PATCH /api/users/:stuId/profile-pic
 * Update a student's profile picture (stored as compressed base64 in DB).
 * Body: { profilePic } (data:image/jpeg;base64,...)
 */
app.patch('/api/users/:stuId/profile-pic', (req, res) => {
    const db = getDb();
    const { profilePic } = req.body;
    const { stuId } = req.params;

    const user = db.prepare('SELECT stu_id FROM users WHERE stu_id = ?').get(stuId);
    if (!user) return res.status(404).json({ error: 'Student not found.' });

    // Allow null/empty to remove the profile pic
    db.prepare('UPDATE users SET profile_pic = ? WHERE stu_id = ?').run(profilePic || null, stuId);
    res.json({ success: true });
});

/**
 * PATCH /api/users/:stuId/username
 * Update a student's username.
 * Body: { username }
 */
app.patch('/api/users/:stuId/username', (req, res) => {
    const db = getDb();
    const { username } = req.body;
    const { stuId } = req.params;

    if (!username || username.trim().length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE stu_id = ?').get(stuId);
    if (!user) return res.status(404).json({ error: 'Student not found.' });

    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND stu_id != ?').get(username.trim(), stuId);
    if (existing) {
        return res.status(409).json({ error: 'Username already taken.' });
    }

    db.prepare('UPDATE users SET username = ? WHERE stu_id = ?').run(username.trim(), stuId);
    res.json({ success: true });
});

/**
 * PATCH /api/users/:stuId/password
 * Update a student's password (requires current password).
 * Body: { currentPassword, newPassword }
 */
app.patch('/api/users/:stuId/password', (req, res) => {
    const db = getDb();
    const { currentPassword, newPassword } = req.body;
    const { stuId } = req.params;

    if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required.' });
    }
    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE stu_id = ?').get(stuId);
    if (!user) return res.status(404).json({ error: 'Student not found.' });

    // Placeholder: plain-text comparison (will be replaced with bcrypt later)
    if (user.password_hash !== currentPassword) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    db.prepare('UPDATE users SET password_hash = ? WHERE stu_id = ?').run(newPassword, stuId);
    res.json({ success: true });
});

/* ----------------------------------------------
 *  SPA Fallback (serve index.html for unknown routes)
 * ---------------------------------------------- */

app.get('*', (req, res) => {
    // Only fallback for non-API, non-file routes
    if (!req.path.startsWith('/api') && !path.extname(req.path)) {
        return res.sendFile(path.join(__dirname, 'index.html'));
    }
    res.status(404).json({ error: 'Not found' });
});

/* ----------------------------------------------
 *  Start Server
 * ---------------------------------------------- */

app.listen(PORT, () => {
    console.log(`\n  iUEP Portal running at http://localhost:${PORT}\n`);
});
