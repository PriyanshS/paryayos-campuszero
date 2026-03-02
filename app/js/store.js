// ═══════════════════════════════════════════════════════
//  CampusZero — API-Backed Data Store
//  All data now persists in SQLite3 via REST API
// ═══════════════════════════════════════════════════════

const API = '/api';

// Local cache to avoid excessive requests
const _cache = {
    admin: null,
    campus: null,
    mode: null,
    readings: null,
    game: null,
    roadmap: null,
    alerts: null,
    _dirty: {}
};

async function _fetch(url, opts = {}) {
    opts.headers = { 'Content-Type': 'application/json', ...opts.headers };
    if (opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
    const res = await fetch(API + url, opts);
    return res.json();
}

const Store = {
    // ── Auth ──
    async getAdmin() {
        if (_cache.admin) return _cache.admin;
        const { admin } = await _fetch('/auth/me');
        _cache.admin = admin;
        return admin;
    },
    async setAdmin(admin) {
        _cache.admin = admin;
    },
    async isLoggedIn() {
        const admin = await this.getAdmin();
        return !!admin;
    },
    async logout() {
        await _fetch('/auth/logout', { method: 'POST', body: {} });
        _cache.admin = null;
        _cache.campus = null;
        _cache.mode = null;
    },

    // ── Campus Profile ──
    async getCampus() {
        if (_cache.campus) return _cache.campus;
        const { campus } = await _fetch('/campus');
        _cache.campus = campus;
        return campus;
    },
    async setCampus(campus) {
        _cache.campus = campus;
    },

    // ── Ingestion Mode ──
    async getMode() {
        if (_cache.mode) return _cache.mode;
        const { mode } = await _fetch('/campus/mode');
        _cache.mode = mode;
        return mode;
    },
    async setMode(mode) {
        await _fetch('/campus/mode', { method: 'PUT', body: { mode } });
        _cache.mode = mode;
    },

    // ── Sensor Readings ──
    async getReadings() {
        if (_cache.readings) return _cache.readings;
        const data = await _fetch('/readings');
        _cache.readings = { power: data.power || [], water: data.water || [], waste: data.waste || [] };
        return _cache.readings;
    },
    async addReading(pillar, entry) {
        const ts = entry.timestamp || Date.now();
        await _fetch(`/readings/${pillar}`, { method: 'POST', body: { ...entry, timestamp: ts } });
        // Update cache
        if (_cache.readings) {
            if (!_cache.readings[pillar]) _cache.readings[pillar] = [];
            _cache.readings[pillar].push({ ...entry, timestamp: ts });
            if (_cache.readings[pillar].length > 365) {
                _cache.readings[pillar] = _cache.readings[pillar].slice(-365);
            }
        }
    },
    async setReadings(readings) {
        // Bulk upload: clear and re-add
        for (const pillar of ['power', 'water', 'waste']) {
            if (readings[pillar] && readings[pillar].length > 0) {
                await _fetch(`/readings/${pillar}`, { method: 'POST', body: readings[pillar] });
            }
        }
        _cache.readings = readings;
    },

    // ── Game State ──
    async getGameState() {
        if (_cache.game) return _cache.game;
        const data = await _fetch('/game');
        _cache.game = data;
        return data;
    },
    async setGameState(state) {
        await _fetch('/game', { method: 'PUT', body: state });
        _cache.game = state;
    },

    // ── Roadmap ──
    async getRoadmap() {
        const { items } = await _fetch('/roadmap');
        _cache.roadmap = items || [];
        return _cache.roadmap;
    },
    async addRoadmapItem(item) {
        const result = await _fetch('/roadmap', { method: 'POST', body: item });
        _cache.roadmap = null; // invalidate
        return result;
    },
    async updateRoadmapItem(id, updates) {
        await _fetch(`/roadmap/${id}`, { method: 'PUT', body: updates });
        _cache.roadmap = null; // invalidate
    },

    // ── Alerts ──
    async getAlerts() {
        const { alerts } = await _fetch('/alerts');
        _cache.alerts = alerts || [];
        return _cache.alerts;
    },
    async addAlert(alert) {
        const result = await _fetch('/alerts', { method: 'POST', body: alert });
        _cache.alerts = null; // invalidate
        return result;
    },
    async markAlertRead(id) {
        await _fetch(`/alerts/${id}/read`, { method: 'PUT', body: {} });
        if (_cache.alerts) {
            const al = _cache.alerts.find(a => a.id === id);
            if (al) al.read = true;
        }
    },
    async getUnreadCount() {
        const { count } = await _fetch('/alerts/unread-count');
        return count;
    },

    // ── Twin Config ──
    async getTwinConfig() {
        const { config } = await _fetch('/twin');
        return config;
    },
    async setTwinConfig(config) {
        await _fetch('/twin', { method: 'PUT', body: { config } });
    },

    // ── Full Reset ──
    async resetAll() {
        // Clear caches
        Object.keys(_cache).forEach(k => { _cache[k] = null; });
    },

    // ── Generate sample data (now server-side) ──
    async generateSampleData() {
        const result = await _fetch('/readings/sample', { method: 'POST', body: {} });
        _cache.readings = null; // invalidate cache
        return result;
    }
};

// Make globally available
window.Store = Store;
