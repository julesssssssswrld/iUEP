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
    seedCourses();

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
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            stu_id        TEXT UNIQUE NOT NULL,
            username      TEXT,
            password_hash TEXT,
            first_name    TEXT NOT NULL,
            middle_name   TEXT,
            last_name     TEXT NOT NULL,
            course        TEXT,
            year_level    TEXT,
            section       TEXT,
            birthday      DATE,
            email         TEXT,
            profile_pic   TEXT,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
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

        -- Course-to-College mapping (single source of truth)
        CREATE TABLE IF NOT EXISTS courses (
            course_code  TEXT PRIMARY KEY,
            course_name  TEXT NOT NULL,
            college      TEXT NOT NULL
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
        INSERT INTO users (stu_id, username, first_name, middle_name, last_name, course, year_level, section, birthday, email)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAdmin = db.prepare(`
        INSERT INTO admins (username, display_name, role)
        VALUES (?, ?, ?)
    `);

    const seedUsers = db.transaction(() => {
        insertUser.run('202101', null, 'Juan',    'Dela',     'Cruz',     'BSIT',   '3', 'A', '2003-06-15', 'juandelacruz@gmail.com');
        insertUser.run('202102', null, 'Maria',   'Santos',   'Reyes',    'BSCS',   '2', 'B', '2004-01-22', 'maria.reyes@gmail.com');
        insertUser.run('202103', null, 'Antonio', null,       'Ramos',    'BSEd',   '1', 'A', '2005-03-08', 'antonio.ramos@gmail.com');
        insertUser.run('202104', null, 'Lourdes', 'Bautista', 'Gonzales', 'BSBA',   '4', 'C', '2002-11-30', 'lourdes.gonzales@gmail.com');
        insertUser.run('202105', null, 'Paolo',   'Mendoza',  'Navarro',  'BSCRIM', '2', 'A', '2004-07-19', 'paolo.navarro@gmail.com');

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

/* ----------------------------------------------
 *  Course Seed Data
 * ---------------------------------------------- */

function seedCourses() {
    const courseCount = db.prepare('SELECT COUNT(*) AS count FROM courses').get().count;
    if (courseCount > 0) return; // Already seeded

    console.log('[DB] Seeding course data...');

    const ins = db.prepare(`
        INSERT OR IGNORE INTO courses (course_code, course_name, college)
        VALUES (?, ?, ?)
    `);

    const seed = db.transaction(() => {
        // College of Science
        ins.run('BSBIO',    'BS in Biology',                         'COLLEGE OF SCIENCE');
        ins.run('BSCHEM',   'BS in Chemistry',                       'COLLEGE OF SCIENCE');
        ins.run('BSES',     'BS in Environmental Science',           'COLLEGE OF SCIENCE');
        ins.run('BSIT',     'BS in Information Technology',          'COLLEGE OF SCIENCE');
        ins.run('BSMBIO',   'BS in Marine Biology',                  'COLLEGE OF SCIENCE');
        ins.run('BSMATH',   'BS in Mathematics',                     'COLLEGE OF SCIENCE');

        // College of Engineering
        ins.run('BSABE',    'BS in Agricultural and Biosystems Engineering', 'COLLEGE OF ENGINEERING');
        ins.run('BSCE',     'BS in Civil Engineering',               'COLLEGE OF ENGINEERING');
        ins.run('BSEE',     'BS in Electrical Engineering',          'COLLEGE OF ENGINEERING');
        ins.run('BSME',     'BS in Mechanical Engineering',          'COLLEGE OF ENGINEERING');
        ins.run('BET',      'Bachelor of Engineering Technology',    'COLLEGE OF ENGINEERING');

        // College of Nursing and Allied Health Services
        ins.run('BSN',      'BS in Nursing',                         'COLLEGE OF NURSING AND ALLIED HEALTH SERVICES');
        ins.run('BSRT',     'BS in Radiologic Technology',           'COLLEGE OF NURSING AND ALLIED HEALTH SERVICES');

        // College of Criminal Justice
        ins.run('BSCRIM',   'BS in Criminology',                     'COLLEGE OF CRIMINAL JUSTICE');

        // College of Business Administration
        ins.run('BSA',      'BS in Accountancy',                     'COLLEGE OF BUSINESS ADMINISTRATION');
        ins.run('BSENTREP', 'BS in Entrepreneurship',                'COLLEGE OF BUSINESS ADMINISTRATION');
        ins.run('BSHM',     'BS in Hospitality Management',          'COLLEGE OF BUSINESS ADMINISTRATION');
        ins.run('BSBA',     'BS in Business Administration',         'COLLEGE OF BUSINESS ADMINISTRATION');

        // College of Education
        ins.run('BEED',     'Bachelor of Elementary Education',       'COLLEGE OF EDUCATION');
        ins.run('BPED',     'Bachelor of Physical Education',         'COLLEGE OF EDUCATION');
        ins.run('BSED',     'BS in Secondary Education',             'COLLEGE OF EDUCATION');
        ins.run('BTLED',    'Bachelor of Technology and Livelihood Education', 'COLLEGE OF EDUCATION');

        // College of Arts and Communication
        ins.run('BAEL',     'BA in English Language',                'COLLEGE OF ARTS AND COMMUNICATION');
        ins.run('BAL',      'BA in Literature',                      'COLLEGE OF ARTS AND COMMUNICATION');
        ins.run('BAPS',     'BA in Political Science',               'COLLEGE OF ARTS AND COMMUNICATION');
        ins.run('BAPA',     'BA in Public Administration',           'COLLEGE OF ARTS AND COMMUNICATION');
        ins.run('BAS',      'BA in Sociology',                       'COLLEGE OF ARTS AND COMMUNICATION');
        ins.run('BSCD',     'BS in Community Development',           'COLLEGE OF ARTS AND COMMUNICATION');
        ins.run('BSDC',     'BS in Development Communication',       'COLLEGE OF ARTS AND COMMUNICATION');

        // College of Veterinary Medicine
        ins.run('DVM',      'Doctor of Veterinary Medicine',         'COLLEGE OF VETERINARY MEDICINE');
        ins.run('BSMT',     'BS in Medical Technology',              'COLLEGE OF VETERINARY MEDICINE');

        // College of Agriculture, Fisheries and Natural Resources
        ins.run('BSAGRI',   'BS in Agriculture',                     'COLLEGE OF AGRICULTURE, FISHERIES AND NATURAL RESOURCES');
        ins.run('BSAGED',   'BS in Agricultural Education',          'COLLEGE OF AGRICULTURE, FISHERIES AND NATURAL RESOURCES');
        ins.run('BSAG',     'BS in Agribusiness',                    'COLLEGE OF AGRICULTURE, FISHERIES AND NATURAL RESOURCES');
        ins.run('BSF',      'BS in Fisheries',                       'COLLEGE OF AGRICULTURE, FISHERIES AND NATURAL RESOURCES');
        ins.run('BSFOR',    'BS in Forestry',                        'COLLEGE OF AGRICULTURE, FISHERIES AND NATURAL RESOURCES');
    });

    seed();
}
