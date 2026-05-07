'use strict';

/**
 * @fileoverview Express server for the iUEP portal.
 * Serves static files and exposes REST API endpoints backed by SQLite.
 */

// Load .env before anything else
require('dotenv').config();

const express = require('express');
const path = require('path');
const { initDatabase, getDb } = require('./db');
const { scrapeIfStale, forceScrape } = require('./fb-scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' })); // Large limit for base64 images
app.use(express.static(path.join(__dirname)));

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
 * Step 4: Create account (placeholder — no hashing yet).
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

    // Placeholder: store password as-is (NO hashing — will be replaced with bcrypt later)
    db.prepare('UPDATE users SET username = ?, password_hash = ?, email = ? WHERE stu_id = ?')
        .run(username, password, email || null, stuId);

    res.status(201).json({ success: true, message: 'Account created successfully.' });
});

/**
 * POST /api/auth/login
 * Placeholder login — validates credentials against DB.
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
        SELECT * FROM id_applications
        WHERE student_id = ?
        ORDER BY submitted_at DESC
        LIMIT 1
    `).get(req.params.stuId);

    if (!app_) return res.json(null);
    res.json(app_);
});

/**
 * POST /api/id-application
 * Submit a new ID application.
 * Body: { studentId, photoBase64, corBase64, libraryId }
 */
app.post('/api/id-application', (req, res) => {
    const db = getDb();
    const { studentId, photoBase64, corBase64, libraryId } = req.body;

    if (!studentId || !photoBase64 || !corBase64 || !libraryId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if student exists
    const user = db.prepare('SELECT * FROM users WHERE stu_id = ?').get(studentId);
    if (!user) {
        return res.status(404).json({ error: 'Student not found' });
    }

    const result = db.prepare(`
        INSERT INTO id_applications (student_id, status, photo_base64, cor_base64, library_id)
        VALUES (?, 'uploaded', ?, ?, ?)
    `).run(studentId, photoBase64, corBase64, libraryId);

    const newApp = db.prepare('SELECT * FROM id_applications WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newApp);
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
    const validStatuses = ['uploaded', 'received', 'processing', 'completed', 'rejected'];

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
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
        FROM id_applications
    `).get();

    res.json(stats);
});

/* ----------------------------------------------
 *  Facebook Posts API Routes
 * ---------------------------------------------- */

/**
 * GET /api/posts
 * Returns scraped FB posts from the database.
 * Optional query: ?dept=pillar (default: all)
 * Also triggers a background freshness check — no credits wasted if data is fresh.
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

    query += ' ORDER BY post_date DESC LIMIT 10';

    const posts = db.prepare(query).all(...params);
    res.json(posts);

    // Background freshness check — fire-and-forget (response already sent)
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
