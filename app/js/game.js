// ═══════════════════════════════════════════════════════
//  CampusZero — Game Engine (XP, Levels, Progress) — API-backed
// ═══════════════════════════════════════════════════════

const Game = {
    LEVELS: [
        { level: 1, title: 'Carbon Rookie', xpReq: 0 },
        { level: 2, title: 'Green Cadet', xpReq: 100 },
        { level: 3, title: 'Eco Apprentice', xpReq: 300 },
        { level: 4, title: 'Sustainability Scout', xpReq: 600 },
        { level: 5, title: 'Grid Handler', xpReq: 1000 },
        { level: 6, title: 'Energy Warden', xpReq: 1600 },
        { level: 7, title: 'Carbon Cutter', xpReq: 2400 },
        { level: 8, title: 'Net-Zero Commander', xpReq: 3500 },
        { level: 9, title: 'Climate Champion', xpReq: 5000 },
        { level: 10, title: 'Net-Zero Achieved ★', xpReq: 7500 },
    ],

    getLevelInfo(xp) {
        let current = this.LEVELS[0];
        let next = this.LEVELS[1];
        for (let i = this.LEVELS.length - 1; i >= 0; i--) {
            if (xp >= this.LEVELS[i].xpReq) {
                current = this.LEVELS[i];
                next = this.LEVELS[i + 1] || null;
                break;
            }
        }
        const progress = next
            ? ((xp - current.xpReq) / (next.xpReq - current.xpReq)) * 100
            : 100;
        return { current, next, progress: Math.min(100, Math.max(0, progress)) };
    },

    async getNetZeroRatio() {
        const readings = await Store.getReadings();
        const power = readings.power;
        if (power.length === 0) return { consumed: 0, generated: 0, ratio: 0 };
        const last30 = power.slice(-30);
        const consumed = last30.reduce((s, r) => s + (r.consumption_kwh || 0), 0);
        const generated = last30.reduce((s, r) => s + (r.generation_kwh || 0), 0);
        return {
            consumed,
            generated,
            ratio: consumed > 0 ? (generated / consumed) * 100 : 0
        };
    },

    async processDay() {
        const state = await Store.getGameState();
        const today = new Date().toDateString();
        if (state.lastPlayedDate === today) return state;

        const { consumed, generated, ratio } = await this.getNetZeroRatio();
        const prevRatio = state.consumed > 0 ? (state.generated / state.consumed) * 100 : 0;

        let xpDelta = 0;
        let improved = false;

        if (ratio > prevRatio) {
            xpDelta = Math.round(10 + (ratio - prevRatio) * 5);
            improved = true;
        } else if (ratio < prevRatio && prevRatio > 0) {
            xpDelta = -Math.round(5 + (prevRatio - ratio) * 2);
        } else {
            xpDelta = 5;
        }

        state.xp = Math.max(0, state.xp + xpDelta);
        state.totalDays++;
        state.consumed = consumed;
        state.generated = generated;
        state.lastPlayedDate = today;

        if (improved) {
            state.streak++;
            if (state.streak > state.bestStreak) state.bestStreak = state.streak;
            if (state.streak >= 7) state.xp += 50;
            if (state.streak >= 30) state.xp += 200;
        } else if (xpDelta < 0) {
            state.streak = 0;
        }

        state.history = state.history || [];
        state.history.push({
            date: today, consumed, generated, ratio,
            xpDelta, totalXp: state.xp
        });
        if (state.history.length > 365) state.history = state.history.slice(-365);

        const levelInfo = this.getLevelInfo(state.xp);
        state.level = levelInfo.current.level;

        await Store.setGameState(state);
        return { ...state, xpDelta, improved, levelInfo };
    },

    async getStats() {
        const state = await Store.getGameState();
        const { consumed, generated, ratio } = await this.getNetZeroRatio();
        const levelInfo = this.getLevelInfo(state.xp);
        return { ...state, consumed, generated, ratio, levelInfo };
    },

    async getRoadmapComparison() {
        const readings = await Store.getReadings();
        const power = readings.power;
        if (power.length < 7) return null;

        const first = power[0];
        const initialConsumption = first.consumption_kwh || 1000;
        const daysOfData = power.length;
        const idealDaily = power.map((_, i) => {
            const progress = i / 365;
            return Math.round(initialConsumption * (1 - progress * 0.8));
        });
        const actual = power.map(r => r.consumption_kwh || 0);

        return {
            idealDaily: idealDaily.slice(0, daysOfData),
            actual,
            daysOfData,
            avgActual: actual.reduce((s, v) => s + v, 0) / actual.length,
            avgIdeal: idealDaily.slice(0, daysOfData).reduce((s, v) => s + v, 0) / daysOfData,
        };
    }
};

window.Game = Game;
