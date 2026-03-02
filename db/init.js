// ═══════════════════════════════════════════════════════
//  CampusZero — Pure-JS JSON Database (Native-Free)
// ═══════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'campuszero.json');

/**
 * A lightweight, pure-JS replacement for better-sqlite3.
 * Stores data in a single JSON file.
 * Provides a subset of the better-sqlite3 API.
 */
class JSONDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {
      admins: [],
      campuses: [],
      readings: [],
      game_state: [],
      roadmap_items: [],
      alerts: [],
      twin_config: []
    };
    this.load();
  }

  load() {
    if (fs.existsSync(this.filePath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      } catch (e) {
        console.error('Error loading DB, starting fresh:', e);
      }
    } else {
      this.save();
    }
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  // Mock better-sqlite3 methods
  pragma() { return this; }

  exec(sql) {
    // Simple mock for table creation - we already have the structure in this.data
    return this;
  }

  prepare(query) {
    const self = this;
    return {
      get: (...params) => {
        const result = self._mockQuery(query, params, 'get');
        return result;
      },
      all: (...params) => {
        const result = self._mockQuery(query, params, 'all');
        return result;
      },
      run: (...params) => {
        const result = self._mockQuery(query, params, 'run');
        self.save();
        return result;
      }
    };
  }

  transaction(fn) {
    return (...args) => {
      const result = fn(...args);
      this.save();
      return result;
    };
  }

  /**
   * Extremely simplified mock query logic to handle existing server.js calls.
   */
  _mockQuery(query, params, type) {
    const q = query.toLowerCase();

    // -- ADMINS --
    if (q.includes('select * from admins where email = ?')) {
      return this.data.admins.find(a => a.email === params[0]) || null;
    }
    if (q.includes('select * from admins where id = ?')) {
      return this.data.admins.find(a => a.id === params[0]) || null;
    }
    if (q.includes('insert into admins')) {
      const admin = {
        id: params[0], institution_name: params[1], campus_lat: params[2],
        campus_lng: params[3], address: params[4], name: params[5],
        email: params[6], avatar_url: params[7], registered_at: params[8],
        last_login: params[9]
      };
      this.data.admins.push(admin);
      return { lastInsertRowid: admin.id };
    }
    if (q.includes('update admins set last_login = ?')) {
      const admin = this.data.admins.find(a => a.id === params[1]);
      if (admin) admin.last_login = params[0];
      return { changes: 1 };
    }

    // -- CAMPUSES --
    if (q.includes('select id from campuses where admin_id = ?')) {
      return this.data.campuses.find(c => c.admin_id === params[0]) || null;
    }
    if (q.includes('select * from campuses where id = ?')) {
      return this.data.campuses.find(c => c.id === params[0]) || null;
    }
    if (q.includes('insert into campuses')) {
      const campus = {
        id: this.data.campuses.length + 1,
        admin_id: params[0], name: params[1], lat: params[2],
        lng: params[3], address: params[4], bbox: params[5],
        sensor_count: 0, mode: null
      };
      this.data.campuses.push(campus);
      return { lastInsertRowid: campus.id };
    }
    if (q.includes('update campuses set mode = ?')) {
      const campus = this.data.campuses.find(c => c.id === params[1]);
      if (campus) campus.mode = params[0];
      return { changes: 1 };
    }

    // -- READINGS --
    if (q.includes('select data from readings where campus_id = ? and pillar = ?')) {
      return this.data.readings.filter(r => r.campus_id === params[0] && r.pillar === params[1]);
    }
    if (q.includes('insert into readings')) {
      this.data.readings.push({
        campus_id: params[0], pillar: params[1], timestamp: params[2], data: params[3]
      });
      return { changes: 1 };
    }
    if (q.includes('delete from readings')) {
      this.data.readings = this.data.readings.filter(r => r.campus_id !== params[0]);
      return { changes: 1 };
    }

    // -- GAME STATE --
    if (q.includes('select * from game_state where campus_id = ?')) {
      return this.data.game_state.find(g => g.campus_id === params[0]) || null;
    }
    if (q.includes('insert into game_state')) {
      this.data.game_state.push({
        campus_id: params[0], xp: 0, level: 1, streak: 0, best_streak: 0,
        total_days: 0, consumed: 0, generated: 0, history: '[]', last_played_date: null
      });
      return { changes: 1 };
    }
    if (q.includes('update game_state')) {
      const g = this.data.game_state.find(item => item.campus_id === params[9]);
      if (g) {
        g.xp = params[0]; g.level = params[1]; g.streak = params[2];
        g.best_streak = params[3]; g.total_days = params[4];
        g.consumed = params[5]; g.generated = params[6];
        g.history = params[7]; g.last_played_date = params[8];
      }
      return { changes: 1 };
    }

    // -- ROADMAP --
    if (q.includes('select * from roadmap_items where campus_id = ?')) {
      return this.data.roadmap_items.filter(r => r.campus_id === params[0]);
    }
    if (q.includes('insert into roadmap_items')) {
      this.data.roadmap_items.push({
        id: params[0], campus_id: params[1], title: params[2], solutions: params[3],
        total_capex: params[4], annual_saving: params[5], carbon_offset: params[6],
        payback: params[7], status: params[8], progress: params[9], added_at: params[10], completed: 0
      });
      return { changes: 1 };
    }

    // -- ALERTS --
    if (q.includes('select * from alerts where campus_id = ?')) {
      return this.data.alerts.filter(a => a.campus_id === params[0]).slice(0, 50);
    }
    if (q.includes('select count(*) as c from alerts where campus_id = ? and read = 0')) {
      return { c: this.data.alerts.filter(a => a.campus_id === params[0] && !a.read).length };
    }
    if (q.includes('insert into alerts')) {
      this.data.alerts.push({
        id: params[0], campus_id: params[1], key: params[2], title: params[3],
        msg: params[4], type: params[5], icon: params[6], time: params[7], read: 0
      });
      return { changes: 1 };
    }

    // -- TWIN --
    if (q.includes('select config from twin_config where campus_id = ?')) {
      return this.data.twin_config.find(t => t.campus_id === params[0]) || null;
    }
    if (q.includes('insert into twin_config')) {
      this.data.twin_config.push({ campus_id: params[0], config: params[1] });
      return { changes: 1 };
    }
    if (q.includes('update twin_config set config = ?')) {
      const t = this.data.twin_config.find(item => item.campus_id === params[1]);
      if (t) t.config = params[0];
      return { changes: 1 };
    }

    return type === 'all' ? [] : null;
  }
}

function initDB() {
  return new JSONDatabase(DB_PATH);
}

module.exports = { initDB, DB_PATH };
