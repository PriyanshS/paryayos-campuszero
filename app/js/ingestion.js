// ═══════════════════════════════════════════════════════
//  CampusZero — CSV Ingestion & IoT Simulation (API-backed)
// ═══════════════════════════════════════════════════════

const Ingestion = {
    // ── CSV Parser ──
    parseCSV(text) {
        const lines = text.trim().split('\n');
        if (lines.length < 2) throw new Error('CSV must have header + at least 1 row');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(',').map(v => v.trim());
            if (vals.length !== headers.length) continue;
            const row = {};
            headers.forEach((h, idx) => {
                const v = vals[idx];
                row[h] = isNaN(v) ? v : parseFloat(v);
            });
            rows.push(row);
        }
        return { headers, rows };
    },

    // ── Validate & Ingest CSV for a pillar ──
    async ingestCSV(pillar, csvText) {
        const { headers, rows } = this.parseCSV(csvText);
        const results = { success: 0, errors: [], warnings: [] };

        const requiredFields = {
            power: ['date', 'consumption_kwh'],
            water: ['date', 'consumption_liters'],
            waste: ['date', 'total_kg']
        };

        const req = requiredFields[pillar] || [];
        const missing = req.filter(f => !headers.includes(f));
        if (missing.length > 0) {
            results.errors.push(`Missing required columns: ${missing.join(', ')}`);
            return results;
        }

        // Batch all entries and send to server
        const entries = [];
        rows.forEach((row, idx) => {
            try {
                const dateVal = row.date;
                let ts;
                if (typeof dateVal === 'string') {
                    ts = new Date(dateVal).getTime();
                    if (isNaN(ts)) {
                        const parts = dateVal.split(/[\/\-]/);
                        if (parts.length === 3) {
                            ts = new Date(parts[2], parts[1] - 1, parts[0]).getTime();
                        }
                    }
                } else {
                    ts = dateVal;
                }
                if (isNaN(ts)) {
                    results.warnings.push(`Row ${idx + 2}: Invalid date, skipped`);
                    return;
                }

                const entry = { timestamp: ts };
                headers.forEach(h => { if (h !== 'date') entry[h] = row[h]; });
                entries.push(entry);
                results.success++;
            } catch (e) {
                results.warnings.push(`Row ${idx + 2}: ${e.message}`);
            }
        });

        // Bulk send to API
        if (entries.length > 0) {
            await fetch(`/api/readings/${pillar}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entries)
            });
        }

        return results;
    },

    // ── Handle file upload ──
    handleFileUpload(file, pillar) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const result = await this.ingestCSV(pillar, e.target.result);
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    },

    // ── Dynamic IoT Simulation ──
    _simInterval: null,
    _simCallbacks: [],

    startSimulation(callback) {
        if (callback) this._simCallbacks.push(callback);
        if (this._simInterval) return;

        this._simInterval = setInterval(async () => {
            const now = Date.now();
            const hour = new Date().getHours();
            const isDay = hour >= 6 && hour <= 18;

            const powerReading = {
                timestamp: now,
                consumption_kwh: Math.round(80 + Math.random() * 40 + (isDay ? 30 : -10)),
                generation_kwh: Math.round(isDay ? 40 + Math.random() * 30 : Math.random() * 5),
                peak_kw: Math.round(300 + Math.random() * 150),
                grid_import_kwh: Math.round(40 + Math.random() * 30),
            };
            await Store.addReading('power', powerReading);

            const waterReading = {
                timestamp: now,
                consumption_liters: Math.round(3000 + Math.random() * 2000),
                recycled_liters: Math.round(1000 + Math.random() * 800),
                harvested_liters: Math.round(Math.random() * 500),
            };
            await Store.addReading('water', waterReading);

            const wasteReading = {
                timestamp: now,
                total_kg: Math.round(50 + Math.random() * 30),
                recycled_kg: Math.round(25 + Math.random() * 15),
                composted_kg: Math.round(10 + Math.random() * 10),
                landfill_kg: Math.round(5 + Math.random() * 10),
            };
            await Store.addReading('waste', wasteReading);

            const data = { power: powerReading, water: waterReading, waste: wasteReading };
            this._simCallbacks.forEach(cb => cb(data));
        }, 5000);
    },

    stopSimulation() {
        if (this._simInterval) {
            clearInterval(this._simInterval);
            this._simInterval = null;
        }
        this._simCallbacks = [];
    },

    // ── Daily Prompt (Static Mode) ──
    async shouldPromptUpload() {
        const mode = await Store.getMode();
        if (mode !== 'static') return false;
        const readings = await Store.getReadings();
        if (!readings.power.length) return true;
        const lastTs = readings.power[readings.power.length - 1].timestamp;
        const daysSince = (Date.now() - lastTs) / 86400000;
        return daysSince >= 1;
    }
};

window.Ingestion = Ingestion;
