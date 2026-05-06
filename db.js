'use strict';

/**
 * @fileoverview SQLite database initialization and helpers for the iUEP portal.
 * Uses better-sqlite3 for synchronous, file-based persistence.
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'iuep.db');

let db;

/**
 * Opens (or creates) the SQLite database and runs schema migrations.
 * @returns {import('better-sqlite3').Database}
 */
function initDatabase() {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    runMigrations();
    seedDemoData();

    console.log(`[DB] SQLite database ready at ${DB_PATH}`);
    return db;
}

/* ----------------------------------------------
 *  Schema Migrations
 * ---------------------------------------------- */

function runMigrations() {
    db.exec(`
        -- Core user accounts (students)
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            stu_id      TEXT UNIQUE NOT NULL,
            username    TEXT,
            first_name  TEXT NOT NULL,
            middle_name TEXT,
            last_name   TEXT NOT NULL,
            course      TEXT,
            section     TEXT,
            profile_pic TEXT,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Admin accounts
        CREATE TABLE IF NOT EXISTS admins (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            username     TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            role         TEXT DEFAULT 'id_production',
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- ID applications
        CREATE TABLE IF NOT EXISTS id_applications (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id       TEXT NOT NULL REFERENCES users(stu_id),
            status           TEXT NOT NULL DEFAULT 'uploaded',
            photo_base64     TEXT,
            cor_base64       TEXT,
            library_id       TEXT,
            rejection_reason TEXT,
            submitted_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_by       TEXT
        );

        -- Campus updates / announcements (placeholder for later)
        CREATE TABLE IF NOT EXISTS updates (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            title        TEXT NOT NULL,
            body         TEXT,
            department   TEXT,
            image_url    TEXT,
            author       TEXT,
            published_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

/* ----------------------------------------------
 *  Demo Seed Data
 * ---------------------------------------------- */

function seedDemoData() {
    const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
    if (userCount > 0) return; // Already seeded

    console.log('[DB] Seeding demo data...');

    const insertUser = db.prepare(`
        INSERT INTO users (stu_id, username, first_name, middle_name, last_name, course, section)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAdmin = db.prepare(`
        INSERT INTO admins (username, display_name, role)
        VALUES (?, ?, ?)
    `);

    const seedUsers = db.transaction(() => {
        insertUser.run('202100001', 'jdcruz', 'Juan', 'Dela', 'Cruz', 'BSIT', '3A');
        insertUser.run('202100002', 'mreyes', 'Maria', 'Santos', 'Reyes', 'BSCS', '2B');
        insertUser.run('202100003', 'aramos', 'Antonio', null, 'Ramos', 'BSEd', '1A');
        insertUser.run('202100004', 'lgonzales', 'Lourdes', 'Bautista', 'Gonzales', 'BSBA', '4C');
        insertUser.run('202100005', 'pnavarro', 'Paolo', 'Mendoza', 'Navarro', 'BSCRIM', '2A');

        insertAdmin.run('admin', 'ID Office Admin', 'id_production');
    });

    seedUsers();
}

/* ----------------------------------------------
 *  Query Helpers
 * ---------------------------------------------- */

/**
 * @returns {import('better-sqlite3').Database}
 */
function getDb() {
    if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
    return db;
}

module.exports = { initDatabase, getDb };
