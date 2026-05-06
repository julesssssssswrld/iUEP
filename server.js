'use strict';

/**
 * @fileoverview Express server for the iUEP portal.
 * Serves static files and exposes REST API endpoints backed by SQLite.
 */

const express = require('express');
const path = require('path');
const { initDatabase, getDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' })); // Large limit for base64 images
app.use(express.static(path.join(__dirname)));

// Initialize database
initDatabase();

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
        SELECT a.*, u.first_name, u.middle_name, u.last_name, u.course, u.section
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
        SELECT a.*, u.first_name, u.middle_name, u.last_name, u.course, u.section, u.stu_id
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
        SELECT a.*, u.first_name, u.middle_name, u.last_name, u.course, u.section
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
