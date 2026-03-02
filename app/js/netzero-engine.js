// ═══════════════════════════════════════════════════════
//  CampusZero — Net-Zero Engine (Rule-Based Chatbot) — API-backed
// ═══════════════════════════════════════════════════════

const NetZeroEngine = {
    SOLUTIONS: [
        {
            id: 'solar_rooftop', name: 'Rooftop Solar PV Array', icon: '☀️', category: 'power',
            capex_per_kw: 45000, annual_savings_per_kw: 12000, carbon_offset_per_kw: 1.2, payback_years: 3.5,
            desc: 'Install rooftop solar panels on available building roofs to generate clean electricity.',
            requirements: 'Minimum 100 sq.m unshaded roof area per 10kW',
        },
        {
            id: 'bess', name: 'Battery Energy Storage (BESS)', icon: '🔋', category: 'power',
            capex_per_kwh: 15000, annual_savings_per_kwh: 3000, carbon_offset_per_kwh: 0.3, payback_years: 5,
            desc: 'Li-ion battery storage to shift solar energy to peak-demand evening hours.',
            requirements: 'Dedicated room with cooling, near main electrical panel',
        },
        {
            id: 'led_retrofit', name: 'LED Lighting Retrofit', icon: '💡', category: 'power',
            capex_per_unit: 500, annual_savings_per_unit: 200, carbon_offset_per_unit: 0.05, payback_years: 2.5,
            desc: 'Replace all fluorescent/CFL lights with energy-efficient LED panels.',
            requirements: 'Audit of existing light fixtures count',
        },
        {
            id: 'rwh', name: 'Rainwater Harvesting System', icon: '🌧️', category: 'water',
            capex_per_unit: 250000, annual_savings_per_unit: 80000, water_saved_liters: 500000, payback_years: 3,
            desc: 'Capture and store rainwater from building roofs for non-potable use.',
            requirements: 'Storage tank (10,000L+ capacity), filtration unit',
        },
        {
            id: 'greywater', name: 'Greywater Recycling Plant', icon: '♻️', category: 'water',
            capex_per_unit: 800000, annual_savings_per_unit: 200000, water_saved_liters: 2000000, payback_years: 4,
            desc: 'Treat wastewater from basins and showers for reuse in flushing and landscaping.',
            requirements: 'Space for treatment plant (50 sq.m), plumbing retrofit',
        },
        {
            id: 'biogas', name: 'Biogas Digester', icon: '🌿', category: 'waste',
            capex_per_unit: 500000, annual_savings_per_unit: 150000, carbon_offset_per_unit: 8, payback_years: 3.5,
            desc: 'Convert cafeteria food waste into biogas for cooking and methane-based power generation.',
            requirements: 'Organic waste supply >50kg/day, space for digester',
        },
        {
            id: 'composting', name: 'Smart Composting Units', icon: '🍂', category: 'waste',
            capex_per_unit: 150000, annual_savings_per_unit: 40000, carbon_offset_per_unit: 2, payback_years: 3.5,
            desc: 'Automated composting machines that convert garden and kitchen waste into usable compost.',
            requirements: '5 sq.m per unit, power connection for aeration',
        },
        {
            id: 'smart_meters', name: 'Smart Metering Network', icon: '📡', category: 'monitoring',
            capex_per_unit: 8000, annual_savings_per_unit: 5000, carbon_offset_per_unit: 0.1, payback_years: 1.5,
            desc: 'Install smart energy/water meters on every building for real-time consumption tracking.',
            requirements: 'WiFi/LoRa connectivity, IoT gateway per zone',
        },
        {
            id: 'ev_charging', name: 'EV Charging Stations', icon: '🚗', category: 'power',
            capex_per_unit: 150000, annual_savings_per_unit: 30000, carbon_offset_per_unit: 3, payback_years: 5,
            desc: 'Install EV charging points in parking areas, powered by campus solar.',
            requirements: 'Parking area electrical infrastructure upgrade',
        },
        {
            id: 'wind_turbine', name: 'Small Wind Turbines', icon: '🌬️', category: 'power',
            capex_per_unit: 300000, annual_savings_per_unit: 60000, carbon_offset_per_unit: 4, payback_years: 5,
            desc: 'Rooftop micro wind turbines to supplement solar during cloudy/night periods.',
            requirements: 'Average wind speed >4 m/s, rooftop structural clearance',
        },
    ],

    async generateSuggestions(userInput = '') {
        const readings = await Store.getReadings();
        const power = readings.power;
        const water = readings.water;
        const waste = readings.waste;

        const suggestions = [];
        const input = userInput.toLowerCase();

        if (power.length > 0) {
            const avgConsumption = power.slice(-30).reduce((s, r) => s + (r.consumption_kwh || 0), 0) / Math.min(30, power.length);
            const avgGeneration = power.slice(-30).reduce((s, r) => s + (r.generation_kwh || 0), 0) / Math.min(30, power.length);
            const gap = avgConsumption - avgGeneration;

            if (gap > 0 || input.includes('power') || input.includes('solar') || input.includes('energy')) {
                const solarKw = Math.ceil(gap / 4);
                suggestions.push({
                    title: `Option A: Solar + Storage Combo`,
                    solutions: [
                        { ...this.SOLUTIONS.find(s => s.id === 'solar_rooftop'), quantity: `${solarKw} kW`, totalCost: solarKw * 45000, annualSaving: solarKw * 12000 },
                        { ...this.SOLUTIONS.find(s => s.id === 'bess'), quantity: `${Math.round(solarKw * 2)} kWh`, totalCost: solarKw * 2 * 15000, annualSaving: solarKw * 2 * 3000 },
                    ],
                    totalCapex: solarKw * 45000 + solarKw * 2 * 15000,
                    totalAnnualSaving: solarKw * 12000 + solarKw * 2 * 3000,
                    carbonOffset: solarKw * 1.2 + solarKw * 2 * 0.3,
                    payback: ((solarKw * 45000 + solarKw * 2 * 15000) / (solarKw * 12000 + solarKw * 2 * 3000)).toFixed(1),
                    reasoning: `Your daily power gap is ~${Math.round(gap)} kWh. A ${solarKw} kW solar array with ${solarKw * 2} kWh battery storage would close this gap completely.`
                });

                suggestions.push({
                    title: `Option B: Solar + LED + Smart Meters`,
                    solutions: [
                        { ...this.SOLUTIONS.find(s => s.id === 'solar_rooftop'), quantity: `${Math.ceil(solarKw * 0.6)} kW`, totalCost: Math.ceil(solarKw * 0.6) * 45000, annualSaving: Math.ceil(solarKw * 0.6) * 12000 },
                        { ...this.SOLUTIONS.find(s => s.id === 'led_retrofit'), quantity: '200 units', totalCost: 200 * 500, annualSaving: 200 * 200 },
                        { ...this.SOLUTIONS.find(s => s.id === 'smart_meters'), quantity: '25 meters', totalCost: 25 * 8000, annualSaving: 25 * 5000 },
                    ],
                    totalCapex: Math.ceil(solarKw * 0.6) * 45000 + 200 * 500 + 25 * 8000,
                    totalAnnualSaving: Math.ceil(solarKw * 0.6) * 12000 + 200 * 200 + 25 * 5000,
                    carbonOffset: Math.ceil(solarKw * 0.6) * 1.2 + 200 * 0.05 + 25 * 0.1,
                    payback: ((Math.ceil(solarKw * 0.6) * 45000 + 200 * 500 + 25 * 8000) / (Math.ceil(solarKw * 0.6) * 12000 + 200 * 200 + 25 * 5000)).toFixed(1),
                    reasoning: `A lower-cost approach: smaller solar array (${Math.ceil(solarKw * 0.6)} kW) combined with LED retrofit and smart metering to reduce consumption by 15-20%.`
                });
            }
        }

        if (water.length > 0 || input.includes('water') || input.includes('rain')) {
            suggestions.push({
                title: `Option C: Water Sustainability Package`,
                solutions: [
                    { ...this.SOLUTIONS.find(s => s.id === 'rwh'), quantity: '2 units', totalCost: 2 * 250000, annualSaving: 2 * 80000 },
                    { ...this.SOLUTIONS.find(s => s.id === 'greywater'), quantity: '1 plant', totalCost: 800000, annualSaving: 200000 },
                ],
                totalCapex: 2 * 250000 + 800000,
                totalAnnualSaving: 2 * 80000 + 200000,
                carbonOffset: 5,
                payback: ((2 * 250000 + 800000) / (2 * 80000 + 200000)).toFixed(1),
                reasoning: `Rainwater harvesting + greywater recycling can reduce municipal water dependency by 40-60%.`
            });
        }

        if (suggestions.length <= 2 || input.includes('waste') || input.includes('biogas')) {
            suggestions.push({
                title: `Option ${String.fromCharCode(65 + suggestions.length)}: Waste-to-Energy Package`,
                solutions: [
                    { ...this.SOLUTIONS.find(s => s.id === 'biogas'), quantity: '1 unit', totalCost: 500000, annualSaving: 150000 },
                    { ...this.SOLUTIONS.find(s => s.id === 'composting'), quantity: '3 units', totalCost: 3 * 150000, annualSaving: 3 * 40000 },
                ],
                totalCapex: 500000 + 3 * 150000,
                totalAnnualSaving: 150000 + 3 * 40000,
                carbonOffset: 8 + 3 * 2,
                payback: ((500000 + 3 * 150000) / (150000 + 3 * 40000)).toFixed(1),
                reasoning: `Convert organic waste to biogas and compost, reducing landfill output by 70-80%.`
            });
        }

        return suggestions.slice(0, 3);
    },

    async chat(userMessage) {
        const msg = userMessage.toLowerCase();
        let response = '';
        let suggestions = [];

        if (msg.includes('help') || msg.includes('what can') || msg.includes('options')) {
            response = `I can help you with:\n• **Power reduction** — solar panels, batteries, LED upgrades\n• **Water conservation** — rainwater harvesting, greywater recycling\n• **Waste management** — biogas, composting, smart segregation\n• **Monitoring** — smart meters, IoT sensors\n\nJust tell me what area you'd like to improve, or type "suggest" for personalized recommendations based on your data!`;
        } else if (msg.includes('suggest') || msg.includes('recommend') || msg.includes('what should')) {
            suggestions = await this.generateSuggestions(msg);
            response = `Based on your campus data, here are my top recommendations:`;
        } else if (msg.includes('solar') || msg.includes('energy') || msg.includes('power')) {
            suggestions = await this.generateSuggestions('power');
            response = `Here are power-focused solutions for your campus:`;
        } else if (msg.includes('water') || msg.includes('rain')) {
            suggestions = await this.generateSuggestions('water');
            response = `Here are water conservation solutions:`;
        } else if (msg.includes('waste') || msg.includes('biogas') || msg.includes('compost')) {
            suggestions = await this.generateSuggestions('waste');
            response = `Here are waste management solutions:`;
        } else if (msg.includes('cost') || msg.includes('budget') || msg.includes('how much')) {
            suggestions = await this.generateSuggestions(msg);
            response = `Here's a cost breakdown of recommended interventions:`;
        } else if (msg.includes('net zero') || msg.includes('netzero') || msg.includes('net-zero')) {
            suggestions = await this.generateSuggestions(msg);
            response = `To achieve Net-Zero, here's what I recommend:`;
        } else {
            suggestions = await this.generateSuggestions(msg);
            response = suggestions.length > 0
                ? `Based on your input, here are matching solutions:`
                : `I understand you're asking about "${userMessage}". Try asking about **solar**, **water**, **waste**, or type **"suggest"** for AI-powered recommendations.`;
        }

        return { response, suggestions };
    },

    async addToRoadmap(suggestion) {
        await Store.addRoadmapItem({
            title: suggestion.title,
            solutions: suggestion.solutions.map(s => ({ name: s.name, quantity: s.quantity })),
            totalCapex: suggestion.totalCapex,
            totalAnnualSaving: suggestion.totalAnnualSaving,
            carbonOffset: suggestion.carbonOffset,
            payback: suggestion.payback,
            status: 'planned',
            progress: 0
        });

        const state = await Store.getGameState();
        state.xp += 25;
        await Store.setGameState(state);
        return true;
    }
};

window.NetZeroEngine = NetZeroEngine;
