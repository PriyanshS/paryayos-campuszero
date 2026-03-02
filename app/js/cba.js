// ═══════════════════════════════════════════════════════
//  CampusZero — Cost-Benefit Analysis Calculator
// ═══════════════════════════════════════════════════════

const CBA = {
    // ── Hardware Catalog with Indian costs ──
    HARDWARE: {
        iot_gateway: { name: 'IoT Gateway', costMin: 15000, costMax: 45000, unit: 'per gateway', category: 'Infrastructure', benefit: 'Enables 24/7 remote real-time data', roi: 'High' },
        smart_meter: { name: 'Smart Energy Meter', costMin: 6000, costMax: 25000, unit: 'per meter', category: 'Monitoring', benefit: 'Automated consumption tracking', roi: 'High' },
        ct_clamp: { name: 'CT Clamp Retrofit', costMin: 5000, costMax: 12000, unit: 'per point', category: 'Monitoring', benefit: 'Non-invasive current measurement', roi: 'Medium' },
        flow_meter: { name: 'Water Flow Meter', costMin: 8000, costMax: 20000, unit: 'per meter', category: 'Monitoring', benefit: 'Real-time water flow tracking', roi: 'Medium' },
        solar_panel: { name: 'Solar PV Panel', costMin: 40000, costMax: 55000, unit: 'per kWp', category: 'Generation', benefit: 'Clean electricity generation', roi: 'High' },
        inverter: { name: 'Solar Inverter', costMin: 15000, costMax: 30000, unit: 'per 5kW', category: 'Generation', benefit: 'DC to AC conversion', roi: 'Required' },
        battery: { name: 'Li-ion Battery Pack', costMin: 12000, costMax: 18000, unit: 'per kWh', category: 'Storage', benefit: 'Peak shaving, backup power', roi: 'Medium' },
        led_panel: { name: 'LED Panel Light', costMin: 400, costMax: 800, unit: 'per unit', category: 'Efficiency', benefit: '50-70% lighting energy reduction', roi: 'Very High' },
        rwh_tank: { name: 'Rainwater Tank (10kL)', costMin: 80000, costMax: 200000, unit: 'per tank', category: 'Water', benefit: 'Water independence', roi: 'Medium' },
        biogas_unit: { name: 'Biogas Digester', costMin: 300000, costMax: 800000, unit: 'per unit', category: 'Waste', benefit: 'Waste to energy conversion', roi: 'Medium' },
        network_sim: { name: '4G/5G SIM Data Plan', costMin: 800, costMax: 1500, unit: 'per month', category: 'Connectivity', benefit: 'Reliable IoT connectivity', roi: 'Required', recurring: true },
        ethernet_cable: { name: 'Ethernet Cabling', costMin: 25000, costMax: 40000, unit: 'per run', category: 'Connectivity', benefit: 'Wired reliability', roi: 'One-time' },
        cloud_db: { name: 'Time-Series DB (Cloud)', costMin: 0, costMax: 15000, unit: 'per month', category: 'Software', benefit: 'Fast historical queries', roi: 'Required', recurring: true },
        csv_parser: { name: 'CSV Parsing Logic', costMin: 75000, costMax: 200000, unit: 'one-time', category: 'Software', benefit: 'Historical data ingestion', roi: 'One-time' },
    },

    // ── Calculate CBA for a set of interventions ──
    calculate(interventions) {
        let totalCapex = 0;
        let totalAnnualSaving = 0;
        let totalCarbonOffset = 0;
        let totalAnnualRecurring = 0;
        const items = [];

        interventions.forEach(({ id, quantity }) => {
            const hw = this.HARDWARE[id];
            if (!hw) return;

            const avgCost = (hw.costMin + hw.costMax) / 2;
            const cost = avgCost * quantity;

            if (hw.recurring) {
                totalAnnualRecurring += cost * 12;
            } else {
                totalCapex += cost;
            }

            // Estimated savings (simplified)
            let annualSaving = 0;
            if (id === 'solar_panel') annualSaving = quantity * 12000;
            else if (id === 'battery') annualSaving = quantity * 3000;
            else if (id === 'led_panel') annualSaving = quantity * 200;
            else if (id === 'smart_meter') annualSaving = quantity * 5000;
            else if (id === 'rwh_tank') annualSaving = quantity * 80000;
            else if (id === 'biogas_unit') annualSaving = quantity * 150000;
            else annualSaving = cost * 0.2;

            totalAnnualSaving += annualSaving;

            // Carbon offset
            let carbonOffset = 0;
            if (id === 'solar_panel') carbonOffset = quantity * 1.2;
            else if (id === 'led_panel') carbonOffset = quantity * 0.05;
            else if (id === 'biogas_unit') carbonOffset = quantity * 8;
            else carbonOffset = quantity * 0.1;

            totalCarbonOffset += carbonOffset;

            items.push({
                name: hw.name,
                category: hw.category,
                quantity,
                unitCost: `₹${Math.round(avgCost).toLocaleString()}`,
                totalCost: `₹${Math.round(cost).toLocaleString()}`,
                annualSaving: `₹${Math.round(annualSaving).toLocaleString()}`,
                carbonOffset: `${carbonOffset.toFixed(1)} tCO₂e/yr`,
                roi: hw.roi,
                recurring: hw.recurring || false,
            });
        });

        const netAnnualSaving = totalAnnualSaving - totalAnnualRecurring;
        const paybackYears = netAnnualSaving > 0 ? totalCapex / netAnnualSaving : Infinity;

        // Carbon credit value (India avg: ~₹500/tCO₂e)
        const carbonCreditRevenue = totalCarbonOffset * 500;

        return {
            items,
            summary: {
                totalCapex: `₹${Math.round(totalCapex).toLocaleString()}`,
                totalCapexRaw: totalCapex,
                annualRecurring: `₹${Math.round(totalAnnualRecurring).toLocaleString()}/yr`,
                annualSaving: `₹${Math.round(totalAnnualSaving).toLocaleString()}/yr`,
                netAnnualSaving: `₹${Math.round(netAnnualSaving).toLocaleString()}/yr`,
                paybackPeriod: paybackYears === Infinity ? 'N/A' : `${paybackYears.toFixed(1)} years`,
                paybackYearsRaw: paybackYears,
                totalCarbonOffset: `${totalCarbonOffset.toFixed(1)} tCO₂e/yr`,
                carbonCreditRevenue: `₹${Math.round(carbonCreditRevenue).toLocaleString()}/yr`,
                roi25year: `₹${Math.round(netAnnualSaving * 25 - totalCapex).toLocaleString()}`,
            }
        };
    },

    // ── Generate default CBA based on campus state ──
    async generateDefaultCBA() {
        const readings = await Store.getReadings();
        const power = readings.power;
        const avgConsumption = power.length > 0
            ? power.slice(-30).reduce((s, r) => s + (r.consumption_kwh || 0), 0) / Math.min(30, power.length)
            : 1000;

        // Recommend based on consumption
        const solarKw = Math.ceil(avgConsumption / 4);
        const batteryKwh = Math.ceil(solarKw * 2);
        const ledUnits = Math.ceil(avgConsumption * 0.3);

        return this.calculate([
            { id: 'solar_panel', quantity: solarKw },
            { id: 'inverter', quantity: Math.ceil(solarKw / 5) },
            { id: 'battery', quantity: batteryKwh },
            { id: 'led_panel', quantity: ledUnits },
            { id: 'smart_meter', quantity: 25 },
            { id: 'iot_gateway', quantity: 5 },
            { id: 'rwh_tank', quantity: 3 },
            { id: 'biogas_unit', quantity: 1 },
            { id: 'cloud_db', quantity: 1 },
            { id: 'network_sim', quantity: 5 },
        ]);
    }
};

window.CBA = CBA;
