// ═══════════════════════════════════════════════════════
//  CampusZero — Prediction Engine (Linear Regression) — API-backed
// ═══════════════════════════════════════════════════════

const Predict = {
    linearRegression(data) {
        const n = data.length;
        if (n < 2) return { slope: 0, intercept: data[0] || 0, r2: 0 };

        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
        data.forEach((y, x) => {
            sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; sumY2 += y * y;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const yMean = sumY / n;
        let ssRes = 0, ssTot = 0;
        data.forEach((y, x) => {
            const predicted = slope * x + intercept;
            ssRes += (y - predicted) ** 2;
            ssTot += (y - yMean) ** 2;
        });
        const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
        return { slope, intercept, r2 };
    },

    movingAverage(data, window = 7) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - window + 1);
            const slice = data.slice(start, i + 1);
            result.push(slice.reduce((s, v) => s + v, 0) / slice.length);
        }
        return result;
    },

    async predict(pillar, field, daysAhead = 30) {
        const readings = await Store.getReadings();
        const pillarData = readings[pillar] || [];

        if (pillarData.length < 7) {
            return { error: 'Need at least 7 days of data for predictions', predictions: [] };
        }

        const values = pillarData.map(r => r[field] || 0);
        const smoothed = this.movingAverage(values, 7);
        const { slope, intercept, r2 } = this.linearRegression(smoothed);

        const predictions = [];
        const lastIdx = values.length - 1;
        for (let i = 1; i <= daysAhead; i++) {
            const idx = lastIdx + i;
            let predicted = slope * idx + intercept;
            const seasonalFactor = Math.sin((idx / 90) * Math.PI * 2) * 0.1;
            predicted *= (1 + seasonalFactor);
            predicted *= (1 + (Math.random() - 0.5) * 0.05);
            predictions.push({
                dayOffset: i,
                date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
                value: Math.max(0, Math.round(predicted * 100) / 100),
                confidence: Math.max(20, Math.round((r2 * 100 - i * 0.5) * 10) / 10)
            });
        }

        const trend = slope > 0.5 ? 'increasing' : slope < -0.5 ? 'decreasing' : 'stable';
        return {
            predictions, trend,
            slope: Math.round(slope * 100) / 100,
            r2: Math.round(r2 * 1000) / 1000,
            model: { slope, intercept },
            currentAvg: Math.round(values.slice(-7).reduce((s, v) => s + v, 0) / 7),
            predictedAvg: Math.round(predictions.slice(0, 7).reduce((s, v) => s + v.value, 0) / 7),
        };
    },

    async generateWarnings() {
        const warnings = [];
        const pillars = [
            { id: 'power', field: 'consumption_kwh', label: 'Power Consumption', unit: 'kWh' },
            { id: 'water', field: 'consumption_liters', label: 'Water Usage', unit: 'L' },
            { id: 'waste', field: 'total_kg', label: 'Waste Output', unit: 'kg' },
        ];

        for (const { id, field, label, unit } of pillars) {
            const result = await this.predict(id, field, 14);
            if (result.error) continue;

            if (result.trend === 'increasing') {
                const increase = ((result.predictedAvg - result.currentAvg) / result.currentAvg * 100).toFixed(1);
                warnings.push({
                    pillar: id, severity: Math.abs(increase) > 15 ? 'high' : 'medium',
                    title: `📈 ${label} Rising`,
                    message: `${label} is projected to increase ${increase}% over the next 14 days (${result.currentAvg} → ${result.predictedAvg} ${unit}/day).`,
                    prediction: result, actions: ['accept', 'reject']
                });
            }
            if (result.trend === 'decreasing' && id === 'power') {
                warnings.push({
                    pillar: id, severity: 'info',
                    title: `📉 ${label} Declining`,
                    message: `Positive trend! ${label} is decreasing. Keep up the interventions.`,
                    prediction: result, actions: ['acknowledge']
                });
            }
        }

        const month = new Date().getMonth();
        if (month >= 2 && month <= 4) {
            warnings.push({
                pillar: 'power', severity: 'high', title: '☀️ Summer Peak Season',
                message: 'Summer peak is approaching. Historical data suggests a 25-40% increase in AC load. Recommend pre-charging batteries during off-peak hours and scheduling maintenance.',
                actions: ['accept', 'reject']
            });
        }
        if (month >= 5 && month <= 8) {
            warnings.push({
                pillar: 'water', severity: 'medium', title: '🌧️ Monsoon Harvesting Window',
                message: 'Monsoon season detected. Activate all rainwater harvesting units and divert overflow to recharge wells. Expected collection: +30% of annual water needs.',
                actions: ['accept', 'reject']
            });
        }
        return warnings;
    }
};

window.Predict = Predict;
