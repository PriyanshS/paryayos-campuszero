# 🎮 CampusZero — Net-Zero Campus Management Game

> A gamified digital twin platform where campus administrators monitor power, water, and waste — get AI-powered recommendations — and race to achieve net-zero status. Like SimCity, but for real campuses.

![Status](https://img.shields.io/badge/Status-Prototype-brightgreen) ![Version](https://img.shields.io/badge/Version-1.0-blue) ![License](https://img.shields.io/badge/License-MIT-green)

---

## 🌟 What is CampusZero?

CampusZero transforms campus sustainability management into a **game-like experience**. Campus administrators register their institution, choose between static (CSV upload) or dynamic (IoT simulation) data ingestion, and interact with a **living 3D digital twin** of their campus.

The platform tracks three pillars — **Power ⚡, Water 💧, and Waste ♻️** — and uses an XP-based game loop to drive progress toward net-zero status.

### Core Features

| Feature | Description |
|---------|-------------|
| 🏛️ **3D Digital Twin** | Procedurally generated campus using real OpenStreetMap data via Three.js |
| 📊 **Dual Ingestion** | Static (CSV upload) or Dynamic (simulated IoT sensors at 5s intervals) |
| 🎮 **XP & Leveling** | 10 levels from "Carbon Rookie" to "Net-Zero Achieved ★" with streak bonuses |
| 🤖 **AI Predictions** | Linear regression model predicting consumption trends with seasonal adjustment |
| 💬 **Net-Zero Chatbot** | Rule-based engine with 10+ solutions, cost/benefit, and "Add to Roadmap" |
| ⚡ **CoC-Style Alerts** | Threshold-triggered popup notifications with accept/dismiss actions |
| 💰 **CBA Calculator** | 14-item hardware catalog with Indian pricing, payback, and carbon credits |
| 🗺️ **Roadmap Tracker** | Track suggestions → planned → implemented, with daily progress comparison |

---

## 📁 Project Structure

```
ParyayOS/
├── index.html                   # Landing page with "Register Your Campus" CTA
├── campuszero-unified.html      # Platform overview & KPI dashboard (original)
├── README.md                    # This file
├── app/
│   ├── app.html                 # Main game interface (post-login)
│   ├── css/
│   │   └── game.css             # CoC/SimCity dark theme (~900 lines)
│   └── js/
│       ├── store.js             # LocalStorage data layer
│       ├── auth.js              # Registration & login
│       ├── ingestion.js         # CSV parser + IoT simulation
│       ├── twin.js              # 3D engine (Three.js + Overpass API)
│       ├── game.js              # XP, levels, net-zero tracking
│       ├── alerts.js            # Threshold monitoring + alerts
│       ├── predict.js           # Linear regression prediction
│       ├── netzero-engine.js    # Chatbot with solution catalog
│       └── cba.js               # Cost-benefit analysis calculator
└── NewGame/                     # Reference documents
    ├── Prompt.md
    ├── 3d model gen.md
    └── Static-Dynamic.md
```

---

## 🚀 Getting Started

### Option 1: Direct File Open
Simply open `index.html` in any modern browser. No server required.

### Option 2: Local Server (Recommended for CORS)
```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .

# Then open http://localhost:8080
```

### Quick Flow
1. Open `index.html` → Click **"Register Your Campus"**
2. Enter institution details → complete authentication
3. Choose **Static** (CSV upload) or **Dynamic** (simulated IoT) mode
4. Explore the 3D twin → upload data → chat with Net-Zero AI
5. Watch your XP grow as you improve your net-zero ratio!

---

## 🗺️ Implementation Roadmap

### Phase 1: Foundation (Months 1–4)
- [x] Campus registration & admin authentication
- [x] 3D digital twin MVP (procedural + OSM data)
- [x] Static & Dynamic data ingestion pipelines
- [x] Three-pillar monitoring (Power, Water, Waste)
- [x] Basic monitoring dashboard with live metrics
- [ ] IoT sensor deployment (physical hardware)
- [ ] Time-series database (InfluxDB / TimescaleDB)

### Phase 2: Intelligence (Months 5–9)
- [x] AI prediction engine (linear regression + seasonal)  
- [x] CoC-style alert system with threshold monitoring
- [x] Net-Zero chatbot with solution recommendations
- [x] XP/gamification system with 10 levels
- [x] Cost-benefit analysis engine
- [ ] ML-based anomaly detection
- [ ] Solar + BESS integration (SCADA bridge)
- [ ] Mobile alert push notifications

### Phase 3: Optimization (Months 10–15)
- [ ] ML-based load forecasting (upgrade from linear regression)
- [ ] Digital twin simulation (what-if scenarios)
- [ ] CBA engine v2 (ML-enhanced, sensitivity analysis)
- [ ] Carbon credit MRV export module
- [ ] VERRA / Gold Standard report generator
- [ ] EV charging integration
- [ ] Grid export / demand response automation

### Phase 4: Net-Zero (Months 16–24)
- [ ] Full Scope 1/2/3 net-zero dashboard
- [ ] Carbon credit trading integration
- [ ] Autonomous energy optimization (RL agent)
- [ ] Multi-campus federation & leaderboards
- [ ] NAAC / NIRF sustainability reporting export
- [ ] Public-facing sustainability microsite
- [ ] Digital twin API for third-party research

---

## 💰 Cost-Benefit Analysis

The interactive CBA calculator is available in the game interface (💰 CBA button). It covers:

### Hardware Costs (Indian Market Pricing)

| Component | Cost Range (₹) | Per |
|-----------|----------------|-----|
| IoT Gateway | 15,000 – 45,000 | per gateway |
| Smart Energy Meter | 6,000 – 25,000 | per meter |
| CT Clamp Retrofit | 5,000 – 12,000 | per point |
| Solar PV Panel | 40,000 – 55,000 | per kWp |
| Li-ion Battery | 12,000 – 18,000 | per kWh |
| LED Panel Light | 400 – 800 | per unit |
| Rainwater Tank (10kL) | 80,000 – 2,00,000 | per tank |
| Biogas Digester | 3,00,000 – 8,00,000 | per unit |
| EV Charging Station | 1,50,000 | per station |
| Wind Turbine (Micro) | 3,00,000 | per unit |

### Software/Connectivity

| Component | Cost Range (₹) | Per |
|-----------|----------------|-----|
| 4G/5G SIM Data | 800 – 1,500 | per month |
| Time-Series DB (Cloud) | 0 – 15,000 | per month |
| CSV Parsing Logic | 75,000 – 2,00,000 | one-time |

### Required Hardware for Production

1. **IoT Gateways** (1 per electrical cabinet): Bridge Modbus/Pulse meters to internet
2. **Smart Meters** or **CT Clamp Retrofits**: Real consumption data
3. **Network**: Ethernet or 4G SIM for each gateway
4. **Cloud Infrastructure**: AWS IoT Core / Azure IoT Hub + Time-series DB

---

## 🏗️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS |
| 3D Engine | Three.js (r128) + OrbitControls |
| Map Data | Overpass API (OpenStreetMap) |
| Data Store | localStorage (prototype) → PostgreSQL + InfluxDB (production) |
| Prediction | Client-side linear regression |
| Styling | Custom CSS with glassmorphism + gradients |
| Fonts | Syne, DM Mono, Instrument Serif (Google Fonts) |

---

## 📝 Production Deployment Guide

For a real deployment, the following would replace the prototype components:

1. **Backend**: Node.js/Django API server with JWT authentication
2. **Database**: PostgreSQL (profiles) + InfluxDB/TimescaleDB (time-series)
3. **IoT**: MQTT broker (HiveMQ/Mosquitto) → AWS IoT Core
4. **ML**: Python (scikit-learn/TensorFlow) for forecasting
5. **Auth**: Firebase Auth or Auth0 for Google OAuth
6. **Hosting**: Any CDN (Vercel/Netlify) for frontend, AWS/GCP for backend

---

## 📄 License

MIT License. Built for the future of campus sustainability.

---

<p align="center">
  <strong>CampusZero</strong> — Where sustainability meets gaming 🌱🎮
</p>
