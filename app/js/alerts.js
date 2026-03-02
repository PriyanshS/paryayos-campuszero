// ═══════════════════════════════════════════════════════
//  CampusZero — CoC-Style Alert System (API-backed)
// ═══════════════════════════════════════════════════════

const Alerts = {
    _container: null,
    _checkInterval: null,

    init(containerId) {
        this._container = document.getElementById(containerId);
        this.startMonitoring();
    },

    THRESHOLDS: {
        power_high: {
            field: 'consumption_kwh', op: '>', value: 150, pillar: 'power',
            title: '⚡ Grid Overload Warning!', msg: 'Power consumption has exceeded safe limits. Consider shedding non-essential loads.',
            type: 'danger', icon: '⚡'
        },
        water_full: {
            field: 'consumption_liters', op: '>', value: 5000, pillar: 'water',
            title: '💧 Water Tank Near Capacity!', msg: 'Water consumption is unusually high today. Check for leaks or open taps.',
            type: 'warning', icon: '💧'
        },
        waste_high: {
            field: 'total_kg', op: '>', value: 70, pillar: 'waste',
            title: '♻️ Waste Output Spike!', msg: 'Waste generation exceeds daily target. Segregation audit recommended.',
            type: 'warning', icon: '♻️'
        },
        power_low_gen: {
            field: 'generation_kwh', op: '<', value: 20, pillar: 'power',
            title: '☁️ Low Solar Generation', msg: 'Solar output dropped below minimum. Cloud cover detected, battery backup engaging.',
            type: 'info', icon: '☁️'
        },
        power_peak: {
            field: 'peak_kw', op: '>', value: 400, pillar: 'power',
            title: '🔴 Peak Demand Alert!', msg: 'Peak load exceeded 400kW. Demand response protocol available.',
            type: 'danger', icon: '🔴'
        },
    },

    async checkThresholds() {
        const readings = await Store.getReadings();
        const existingAlerts = await Store.getAlerts();
        const newAlerts = [];

        for (const [key, threshold] of Object.entries(this.THRESHOLDS)) {
            const pillarData = readings[threshold.pillar];
            if (!pillarData || pillarData.length === 0) continue;
            const latest = pillarData[pillarData.length - 1];
            const val = latest[threshold.field];
            if (val === undefined) continue;

            let triggered = false;
            if (threshold.op === '>' && val > threshold.value) triggered = true;
            if (threshold.op === '<' && val < threshold.value) triggered = true;

            if (triggered) {
                const recent = existingAlerts.find(a =>
                    a.key === key && (Date.now() - a.time) < 60000
                );
                if (!recent) {
                    const alert = {
                        key,
                        title: threshold.title,
                        msg: threshold.msg + ` (Current: ${val})`,
                        type: threshold.type,
                        icon: threshold.icon,
                        actualValue: val,
                        thresholdValue: threshold.value,
                        actions: threshold.type === 'danger'
                            ? [{ label: 'Accept & Shed Load', action: 'accept' }, { label: 'Dismiss', action: 'dismiss' }]
                            : [{ label: 'Acknowledge', action: 'dismiss' }]
                    };
                    await Store.addAlert(alert);
                    newAlerts.push(alert);
                }
            }
        }
        return newAlerts;
    },

    checkSeasonalAlerts() {
        const month = new Date().getMonth();
        const alerts = [];

        if (month >= 2 && month <= 4) {
            alerts.push({
                title: '☀️ Summer Peak Approaching!',
                msg: 'AC load expected to rise 35–40%. Recommend pre-charging battery storage during off-peak hours.',
                type: 'seasonal', icon: '☀️',
                actions: [{ label: 'Activate Summer Protocol', action: 'accept' }, { label: 'Later', action: 'dismiss' }]
            });
        }
        if (month >= 5 && month <= 8) {
            alerts.push({
                title: '🌧️ Monsoon Season Active!',
                msg: 'Rainwater harvesting opportunity! Solar output may decrease 20–30%. Switch to grid backup profile.',
                type: 'seasonal', icon: '🌧️',
                actions: [{ label: 'Enable Harvest Mode', action: 'accept' }, { label: 'Skip', action: 'dismiss' }]
            });
        }
        if (month >= 10 || month === 0) {
            alerts.push({
                title: '❄️ Winter Conservation Mode',
                msg: 'Shorter daylight = less solar. Grid dependence may rise 15–25%. Pre-schedule load shifts.',
                type: 'seasonal', icon: '❄️',
                actions: [{ label: 'Enable Winter Schedule', action: 'accept' }, { label: 'Dismiss', action: 'dismiss' }]
            });
        }
        return alerts;
    },

    renderAlertPopup(alert) {
        const div = document.createElement('div');
        div.className = `alert-popup alert-${alert.type}`;
        div.innerHTML = `
      <div class="alert-header">
        <span class="alert-icon">${alert.icon}</span>
        <span class="alert-title">${alert.title}</span>
        <button class="alert-close" onclick="this.closest('.alert-popup').remove()">✕</button>
      </div>
      <div class="alert-body">${alert.msg}</div>
      <div class="alert-actions">
        ${(alert.actions || []).map(a =>
            `<button class="alert-btn alert-btn-${a.action}" onclick="Alerts.handleAction('${alert.id || ''}','${a.action}');this.closest('.alert-popup').remove()">${a.label}</button>`
        ).join('')}
      </div>
    `;
        div.style.animation = 'alertSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards';
        if (this._container) {
            this._container.appendChild(div);
            setTimeout(() => { if (div.parentNode) div.remove(); }, 15000);
        }
    },

    async handleAction(alertId, action) {
        if (alertId) await Store.markAlertRead(alertId);
        if (action === 'accept') {
            const state = await Store.getGameState();
            state.xp += 15;
            await Store.setGameState(state);
        }
    },

    startMonitoring() {
        this._checkInterval = setInterval(async () => {
            const newAlerts = await this.checkThresholds();
            newAlerts.forEach(a => this.renderAlertPopup(a));
        }, 10000);
    },

    stopMonitoring() {
        if (this._checkInterval) {
            clearInterval(this._checkInterval);
            this._checkInterval = null;
        }
    }
};

window.Alerts = Alerts;
