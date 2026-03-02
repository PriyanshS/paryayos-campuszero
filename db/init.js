// ═══════════════════════════════════════════════════════
//  CampusZero — Database Schema Initialization
// ═══════════════════════════════════════════════════════

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'campuszero.db');

function initDB() {
    const db = new Database(DB_PATH);

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // ── Admins ──
    db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      institution_name TEXT NOT NULL,
      campus_lat REAL,
      campus_lng REAL,
      address TEXT DEFAULT '',
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      avatar_url TEXT,
      registered_at INTEGER NOT NULL,
      last_login INTEGER NOT NULL
    )
  `);

    // ── Campuses ──
    db.exec(`
    CREATE TABLE IF NOT EXISTS campuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      lat REAL,
      lng REAL,
      address TEXT DEFAULT '',
      bbox TEXT,
      sensor_count INTEGER DEFAULT 0,
      mode TEXT DEFAULT NULL,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
    )
  `);

    // ── Sensor Readings (time-series) ──
    db.exec(`
    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campus_id INTEGER NOT NULL,
      pillar TEXT NOT NULL CHECK(pillar IN ('power', 'water', 'waste')),
      timestamp INTEGER NOT NULL,
      data TEXT NOT NULL,
      FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE
    )
  `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_readings_campus_pillar ON readings(campus_id, pillar, timestamp)`);

    // ── Game State ──
    db.exec(`
    CREATE TABLE IF NOT EXISTS game_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campus_id INTEGER NOT NULL UNIQUE,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      total_days INTEGER DEFAULT 0,
      consumed REAL DEFAULT 0,
      generated REAL DEFAULT 0,
      history TEXT DEFAULT '[]',
      last_played_date TEXT DEFAULT NULL,
      FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE
    )
  `);

    // ── Roadmap Items ──
    db.exec(`
    CREATE TABLE IF NOT EXISTS roadmap_items (
      id TEXT PRIMARY KEY,
      campus_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      solutions TEXT DEFAULT '[]',
      total_capex REAL DEFAULT 0,
      annual_saving REAL DEFAULT 0,
      carbon_offset REAL DEFAULT 0,
      payback TEXT DEFAULT NULL,
      status TEXT DEFAULT 'planned',
      progress REAL DEFAULT 0,
      added_at INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE
    )
  `);

    // ── Alerts ──
    db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      campus_id INTEGER NOT NULL,
      key TEXT,
      title TEXT NOT NULL,
      msg TEXT,
      type TEXT DEFAULT 'info',
      icon TEXT DEFAULT '🔔',
      time INTEGER NOT NULL,
      read INTEGER DEFAULT 0,
      FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE
    )
  `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_alerts_campus ON alerts(campus_id, time DESC)`);

    // ── Twin Config ──
    db.exec(`
    CREATE TABLE IF NOT EXISTS twin_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campus_id INTEGER NOT NULL UNIQUE,
      config TEXT DEFAULT '{}',
      FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE
    )
  `);

    return db;
}

module.exports = { initDB, DB_PATH };
