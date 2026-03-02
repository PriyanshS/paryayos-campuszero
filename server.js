// ═══════════════════════════════════════════════════════
//  CampusZero — Express + SQLite3 Backend Server
// ═══════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use('/app', express.static(path.join(__dirname, 'app')));

// ── Initialize Database ──
const db = initDB();
console.log('✓ SQLite database initialized');

// Simple session: store current admin_id in memory (per-server instance)
// In production, use JWT or session cookies
let currentSession = { adminId: null, campusId: null };

// ── Helper: get campus ID for current session ──
function getCampusId() {
    if (!currentSession.adminId) return null;
    const row = db.prepare('SELECT id FROM campuses WHERE admin_id = ?').get(currentSession.adminId);
    return row ? row.id : null;
}

// ═══════════════════════════════════════════════════════
//  AUTH ENDPOINTS
// ═══════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
    const { institutionName, campusLat, campusLng, campusAddress, adminName, adminEmail, avatarUrl, bbox } = req.body;

    if (!institutionName || !adminName || !adminEmail) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const adminId = 'CZ-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const now = Date.now();

    try {
        // Check if email already exists
        const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(adminEmail);
        if (existing) {
            // Login existing user
            db.prepare('UPDATE admins SET last_login = ? WHERE id = ?').run(now, existing.id);
            currentSession.adminId = existing.id;
            currentSession.campusId = getCampusId();
            const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(existing.id);
            return res.json({ admin, existing: true });
        }

        // Insert admin
        db.prepare(`
      INSERT INTO admins (id, institution_name, campus_lat, campus_lng, address, name, email, avatar_url, registered_at, last_login)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(adminId, institutionName, campusLat || 0, campusLng || 0, campusAddress || '', adminName, adminEmail, avatarUrl || null, now, now);

        // Insert campus
        const campusResult = db.prepare(`
      INSERT INTO campuses (admin_id, name, lat, lng, address, bbox, sensor_count, mode)
      VALUES (?, ?, ?, ?, ?, ?, 0, NULL)
    `).run(adminId, institutionName, campusLat || 0, campusLng || 0, campusAddress || '', bbox ? JSON.stringify(bbox) : null);

        const campusId = campusResult.lastInsertRowid;

        // Initialize game state
        db.prepare(`
      INSERT INTO game_state (campus_id, xp, level, streak, best_streak, total_days, consumed, generated, history, last_played_date)
      VALUES (?, 0, 1, 0, 0, 0, 0, 0, '[]', NULL)
    `).run(campusId);

        currentSession.adminId = adminId;
        currentSession.campusId = campusId;

        const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
        res.json({ admin, campusId, existing: false });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
    const { email } = req.body;
    const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    db.prepare('UPDATE admins SET last_login = ? WHERE id = ?').run(Date.now(), admin.id);
    currentSession.adminId = admin.id;
    currentSession.campusId = getCampusId();
    res.json({ admin });
});

// GET /api/auth/me
app.get('/api/auth/me', (req, res) => {
    if (!currentSession.adminId) return res.json({ admin: null });
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(currentSession.adminId);
    res.json({ admin });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
    currentSession = { adminId: null, campusId: null };
    res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════
//  CAMPUS ENDPOINTS
// ═══════════════════════════════════════════════════════

// GET /api/campus
app.get('/api/campus', (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.json({ campus: null });
    const campus = db.prepare('SELECT * FROM campuses WHERE id = ?').get(campusId);
    if (campus && campus.bbox) {
        try { campus.bbox = JSON.parse(campus.bbox); } catch { }
    }
    res.json({ campus });
});

// PUT /api/campus/mode
app.put('/api/campus/mode', (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.status(401).json({ error: 'Not authenticated' });
    const { mode } = req.body;
    db.prepare('UPDATE campuses SET mode = ? WHERE id = ?').run(mode, campusId);
    res.json({ ok: true, mode });
});

// GET /api/campus/mode
app.get('/api/campus/mode', (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.json({ mode: null });
    const row = db.prepare('SELECT mode FROM campuses WHERE id = ?').get(campusId);
    res.json({ mode: row ? row.mode : null });
});

// ═══════════════════════════════════════════════════════
//  READINGS ENDPOINTS
// ═══════════════════════════════════════════════════════

// GET /api/readings (all pillars) — MUST be before /:pillar
app.get('/api/readings', (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.json({ power: [], water: [], waste: [] });

    const result = { power: [], water: [], waste: [] };
    ['power', 'water', 'waste'].forEach(pillar => {
        const rows = db.prepare(
            'SELECT data FROM readings WHERE campus_id = ? AND pillar = ? ORDER BY timestamp ASC'
        ).all(campusId, pillar);
        result[pillar] = rows.map(r => {
            try { return JSON.parse(r.data); } catch { return null; }
        }).filter(Boolean);
    });
    res.json(result);
});

// POST /api/readings/sample — generate 90-day sample data (MUST be before /:pillar)
app.post('/api/readings/sample', (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.status(401).json({ error: 'Not authenticated' });

    // Clear existing readings
    db.prepare('DELETE FROM readings WHERE campus_id = ?').run(campusId);

    const insert = db.prepare('INSERT INTO readings (campus_id, pillar, timestamp, data) VALUES (?, ?, ?, ?)');
    const now = Date.now();
    const DAY = 86400000;

    const generateAll = db.transaction(() => {
        for (let i = 89; i >= 0; i--) {
            const ts = now - i * DAY;
            const season = Math.sin((i / 90) * Math.PI * 2);

            const power = {
                timestamp: ts,
                consumption_kwh: Math.round(1200 + season * 300 + (Math.random() - 0.5) * 200),
                generation_kwh: Math.round(600 + season * 150 + Math.random() * 100),
                peak_kw: Math.round(400 + Math.random() * 100),
                grid_import_kwh: Math.round(500 + (Math.random() - 0.5) * 150),
            };
            insert.run(campusId, 'power', ts, JSON.stringify(power));

            const water = {
                timestamp: ts,
                consumption_liters: Math.round(45000 + season * 8000 + (Math.random() - 0.5) * 5000),
                recycled_liters: Math.round(15000 + Math.random() * 5000),
                harvested_liters: Math.round(season > 0 ? season * 10000 + Math.random() * 3000 : Math.random() * 2000),
            };
            insert.run(campusId, 'water', ts, JSON.stringify(water));

            const waste = {
                timestamp: ts,
                total_kg: Math.round(800 + (Math.random() - 0.5) * 200),
                recycled_kg: Math.round(400 + Math.random() * 150),
                composted_kg: Math.round(200 + Math.random() * 100),
                landfill_kg: Math.round(100 + Math.random() * 80),
            };
            insert.run(campusId, 'waste', ts, JSON.stringify(waste));
        }
    });

    try {
        generateAll();
        res.json({ ok: true, message: '90 days of sample data generated (270 rows)' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/readings/:pillar
app.get('/api/readings/:pillar', (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.json({ readings: [] });
    const { pillar } = req.params;
    if (!['power', 'water', 'waste'].includes(pillar)) {
        return res.status(400).json({ error: 'Invalid pillar' });
    }
    const rows = db.prepare(
        'SELECT data FROM readings WHERE campus_id = ? AND pillar = ? ORDER BY timestamp ASC'
    ).all(campusId, pillar);
    const readings = rows.map(r => {
        try { return JSON.parse(r.data); } catch { return null; }
    }).filter(Boolean);
    res.json({ readings });
});

// POST /api/readings/:pillar (add one or many readings)
app.post('/api/readings/:pillar', (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.status(401).json({ error: 'Not authenticated' });
    const { pillar } = req.params;
    if (!['power', 'water', 'waste'].includes(pillar)) {
        return res.status(400).json({ error: 'Invalid pillar' });
    }

    const entries = Array.isArray(req.body) ? req.body : [req.body];
    const insert = db.prepare('INSERT INTO readings (campus_id, pillar, timestamp, data) VALUES (?, ?, ?, ?)');

    const insertMany = db.transaction((items) => {
        for (const entry of items) {
            const ts = entry.timestamp || Date.now();
            insert.run(campusId, pillar, ts, JSON.stringify({ ...entry, timestamp: ts }));
        }
    });

    try {
        insertMany(entries);
        // Keep max 365 entries per pillar
        const count = db.prepare('SELECT COUNT(*) as c FROM readings WHERE campus_id = ? AND pillar = ?').get(campusId, pillar).c;
        if (count > 365) {
            const excess = count - 365;
            db.prepare(`
        DELETE FROM readings WHERE id IN (
          SELECT id FROM readings WHERE campus_id = ? AND pillar = ? ORDER BY timestamp ASC LIMIT ?
        )
      `).run(campusId, pillar, excess);
        }
        res.json({ ok: true, count: entries.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// ═══════════════════════════════════════════════════════
//  GAME STATE ENDPOINTS
// ═══════════════════════════════════════════════════════

// GET /api/game
app.get('/api/game', (req, res) => {
    const campusId = getCampusId();
    if (!campusId) {
        return res.json({
            xp: 0, level: 1, streak: 0, bestStreak: 0, totalDays: 0,
            consumed: 0, generated: 0, history: [], lastPlayedDate: null
        });
    }
    const row = db.prepare('SELECT * FROM game_state WHERE campus_id = ?').get(campusId);
    if (!row) {
        return res.json({
            xp: 0, level: 1, streak: 0, bestStreak: 0, totalDays: 0,
            consumed: 0, generated: 0, history: [], lastPlayedDate: null
        });
    }
    let history = [];
    try { history = JSON.parse(row.history); } catch { }
    res.json({
        xp: row.xp,
        level: row.level,
        streak: row.streak,
        bestStreak: row.best_streak,
        totalDays: row.total_days,
        consumed: row.consumed,
        generated: row.generated,
        history,
        lastPlayedDate: row.last_played_date
    });
});

// PUT /api/game
app.put('/api/game', (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.status(401).json({ error: 'Not authenticated' });
    const { xp, level, streak, bestStreak, totalDays, consumed, generated, history, lastPlayedDate } = req.body;

    db.prepare(`
    UPDATE game_state
    SET xp = ?, level = ?, streak = ?, best_streak = ?, total_days = ?,
        consumed = ?, generated = ?, history = ?, last_played_date = ?
    WHERE campus_id = ?
  `).run(
        xp ?? 0, level ?? 1, streak ?? 0, bestStreak ?? 0, totalDays ?? 0,
        consumed ?? 0, generated ?? 0, JSON.stringify(history || []), lastPlayedDate || null,
        campusId
    );
    res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════
//  ROADMAP ENDPOINTS
// ═══════════════════════════════════════════════════════

// GET /api/roadmap
app.get('/api/roadmap', (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.json({ items: [] });
    const rows = db.prepare('SELECT * FROM roadmap_items WHERE campus_id = ? ORDER BY added_at DESC').all(campusId);
    const items = rows.map(r => ({
        id: r.id,
        title: r.title,
        solutions: (() => { try { return JSON.parse(r.solutions); } catch { return []; } })(),
        totalCapex: r.total_capex,
        totalAnnualSaving: r.annual_saving,
        carbonOffset: r.carbon_offset,
        payback: r.payback,
        status: r.status,
        progress: r.progress,
        addedAt: r.added_at,
        completed: !!r.completed
    }));
    res.json({ items });
});

// POST /api/roadmap
app.post('/api/roadmap', (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.status(401).json({ error: 'Not authenticated' });
    const { title, solutions, totalCapex, totalAnnualSaving, carbonOffset, payback, status, progress } = req.body;
    const id = 'rm_' + Date.now();
    const now = Date.now();

    db.prepare(`
    INSERT INTO roadmap_items (id, campus_id, title, solutions, total_capex, annual_saving, carbon_offset, payback, status, progress, added_at, completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(id, campusId, title, JSON.stringify(solutions || []), totalCapex || 0, totalAnnualSaving || 0, carbonOffset || 0, payback || null, status || 'planned', progress || 0, now);

    res.json({ ok: true, id });
});

// PUT /api/roadmap/:id
app.put('/api/roadmap/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const fields = [];
    const values = [];

    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.progress !== undefined) { fields.push('progress = ?'); values.push(updates.progress); }
    if (updates.completed !== undefined) { fields.push('completed = ?'); values.push(updates.completed ? 1 : 0); }

    if (fields.length > 0) {
        values.push(id);
        db.prepare(`UPDATE roadmap_items SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
    res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════
//  ALERTS ENDPOINTS
// ═══════════════════════════════════════════════════════

// GET /api/alerts
app.get('/api/alerts', (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.json({ alerts: [] });
    const rows = db.prepare('SELECT * FROM alerts WHERE campus_id = ? ORDER BY time DESC LIMIT 50').all(campusId);
    const alerts = rows.map(r => ({
        id: r.id, key: r.key, title: r.title, msg: r.msg,
        type: r.type, icon: r.icon, time: r.time, read: !!r.read
    }));
    res.json({ alerts });
});

// POST /api/alerts
app.post('/api/alerts', (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.status(401).json({ error: 'Not authenticated' });
    const { key, title, msg, type, icon } = req.body;
    const id = 'al_' + Date.now();
    const now = Date.now();

    db.prepare(`
    INSERT INTO alerts (id, campus_id, key, title, msg, type, icon, time, read)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(id, campusId, key || null, title, msg || '', type || 'info', icon || '🔔', now);

    // Keep max 50 alerts per campus
    const count = db.prepare('SELECT COUNT(*) as c FROM alerts WHERE campus_id = ?').get(campusId).c;
    if (count > 50) {
        db.prepare(`
      DELETE FROM alerts WHERE id IN (
        SELECT id FROM alerts WHERE campus_id = ? ORDER BY time ASC LIMIT ?
      )
    `).run(campusId, count - 50);
    }

    res.json({ ok: true, id, time: now });
});

// PUT /api/alerts/:id/read
app.put('/api/alerts/:id/read', (req, res) => {
    db.prepare('UPDATE alerts SET read = 1 WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

// GET /api/alerts/unread-count
app.get('/api/alerts/unread-count', (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.json({ count: 0 });
    const row = db.prepare('SELECT COUNT(*) as c FROM alerts WHERE campus_id = ? AND read = 0').get(campusId);
    res.json({ count: row.c });
});

// ═══════════════════════════════════════════════════════
//  TWIN CONFIG ENDPOINTS
// ═══════════════════════════════════════════════════════

// GET /api/twin
app.get('/api/twin', (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.json({ config: null });
    const row = db.prepare('SELECT config FROM twin_config WHERE campus_id = ?').get(campusId);
    let config = null;
    if (row) { try { config = JSON.parse(row.config); } catch { } }
    res.json({ config });
});

// PUT /api/twin
app.put('/api/twin', (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.status(401).json({ error: 'Not authenticated' });
    const config = JSON.stringify(req.body.config || {});

    const existing = db.prepare('SELECT id FROM twin_config WHERE campus_id = ?').get(campusId);
    if (existing) {
        db.prepare('UPDATE twin_config SET config = ? WHERE campus_id = ?').run(config, campusId);
    } else {
        db.prepare('INSERT INTO twin_config (campus_id, config) VALUES (?, ?)').run(campusId, config);
    }
    res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════
//  PYTHON MODEL ENDPOINTS (AI/ML)
// ═══════════════════════════════════════════════════════

const { execFile } = require('child_process');
const DB_PATH = path.join(__dirname, 'db', 'campuszero.db');

function runPythonModel(script, args) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'models', script);
        execFile('python3', [scriptPath, ...args], { timeout: 30000 }, (err, stdout, stderr) => {
            if (err) {
                console.error(`Model ${script} error:`, stderr || err.message);
                return reject(new Error(stderr || err.message));
            }
            try {
                resolve(JSON.parse(stdout));
            } catch {
                reject(new Error('Invalid JSON from model'));
            }
        });
    });
}

// GET /api/models/predict?pillar=power&field=consumption_kwh&days=30
app.get('/api/models/predict', async (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.status(401).json({ error: 'Not authenticated' });
    const { pillar = 'power', field = 'consumption_kwh', days = '30' } = req.query;
    try {
        const result = await runPythonModel('predict_consumption.py', [DB_PATH, String(campusId), pillar, field, days]);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/models/anomalies?pillar=power  (optional pillar, omit for all)
app.get('/api/models/anomalies', async (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.status(401).json({ error: 'Not authenticated' });
    const args = [DB_PATH, String(campusId)];
    if (req.query.pillar) args.push(req.query.pillar);
    try {
        const result = await runPythonModel('anomaly_detect.py', args);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/models/optimize?budget=50  (budget in lakhs, default 50)
app.get('/api/models/optimize', async (req, res) => {
    const campusId = getCampusId();
    if (!campusId) return res.status(401).json({ error: 'Not authenticated' });
    const budget = req.query.budget || '50';
    try {
        const result = await runPythonModel('optimize_suggestions.py', [DB_PATH, String(campusId), budget]);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════
//  CATCH-ALL: serve index.html / app.html
// ═══════════════════════════════════════════════════════
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'app', 'app.html'));
});

// ── Start Server (graceful port handling) ──
const server = app.listen(PORT, () => {
    console.log(`\n  🎮 CampusZero Server running on http://localhost:${PORT}\n`);
    console.log(`  📦 Database: db/campuszero.db`);
    console.log(`  🐍 Models:  models/*.py`);
    console.log(`  📡 API: http://localhost:${PORT}/api/\n`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n  ❌ Port ${PORT} is already in use!`);
        console.error(`  Fix: kill $(lsof -t -i:${PORT}) or use PORT=3001 node server.js\n`);
        process.exit(1);
    }
    throw err;
});
