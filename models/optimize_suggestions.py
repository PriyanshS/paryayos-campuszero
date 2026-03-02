#!/usr/bin/env python3
"""
CampusZero — Net-Zero Optimization Model
Reads campus data from SQLite, analyzes consumption patterns,
and recommends optimal intervention portfolios with ROI calculations.

Usage: python3 models/optimize_suggestions.py <db_path> <campus_id>
"""

import sys
import json
import math
import sqlite3


# Solution catalog with costs in INR
SOLUTIONS = {
    "solar_rooftop": {
        "name": "Rooftop Solar PV",
        "category": "power",
        "capex_per_unit": 45000,  # per kW
        "annual_saving_per_unit": 12000,
        "carbon_per_unit": 1.2,  # tCO2e/yr per kW
        "unit": "kW"
    },
    "bess": {
        "name": "Battery Storage (BESS)",
        "category": "power",
        "capex_per_unit": 15000,  # per kWh
        "annual_saving_per_unit": 3000,
        "carbon_per_unit": 0.3,
        "unit": "kWh"
    },
    "led_retrofit": {
        "name": "LED Lighting Retrofit",
        "category": "power",
        "capex_per_unit": 500,
        "annual_saving_per_unit": 200,
        "carbon_per_unit": 0.05,
        "unit": "units"
    },
    "smart_meters": {
        "name": "Smart Metering Network",
        "category": "monitoring",
        "capex_per_unit": 8000,
        "annual_saving_per_unit": 5000,
        "carbon_per_unit": 0.1,
        "unit": "meters"
    },
    "rwh": {
        "name": "Rainwater Harvesting",
        "category": "water",
        "capex_per_unit": 250000,
        "annual_saving_per_unit": 80000,
        "carbon_per_unit": 0.5,
        "unit": "units"
    },
    "greywater": {
        "name": "Greywater Recycling",
        "category": "water",
        "capex_per_unit": 800000,
        "annual_saving_per_unit": 200000,
        "carbon_per_unit": 2.0,
        "unit": "plants"
    },
    "biogas": {
        "name": "Biogas Digester",
        "category": "waste",
        "capex_per_unit": 500000,
        "annual_saving_per_unit": 150000,
        "carbon_per_unit": 8.0,
        "unit": "units"
    },
    "composting": {
        "name": "Smart Composting",
        "category": "waste",
        "capex_per_unit": 150000,
        "annual_saving_per_unit": 40000,
        "carbon_per_unit": 2.0,
        "unit": "units"
    }
}


def calculate_gap(readings, pillar):
    """Calculate the consumption-generation gap."""
    entries = [json.loads(r[0]) for r in readings]
    if not entries:
        return 0, 0, 0

    if pillar == "power":
        consumption = sum(e.get("consumption_kwh", 0) for e in entries) / len(entries)
        generation = sum(e.get("generation_kwh", 0) for e in entries) / len(entries)
        return consumption, generation, consumption - generation
    elif pillar == "water":
        consumption = sum(e.get("consumption_liters", 0) for e in entries) / len(entries)
        recycled = sum(e.get("recycled_liters", 0) for e in entries) / len(entries)
        return consumption, recycled, consumption - recycled
    elif pillar == "waste":
        total = sum(e.get("total_kg", 0) for e in entries) / len(entries)
        recycled = sum(e.get("recycled_kg", 0) for e in entries) / len(entries)
        return total, recycled, total - recycled
    return 0, 0, 0


def knapsack_optimize(items, budget):
    """Simple greedy knapsack: pick items with best ROI first, within budget."""
    # Sort by ROI (annual_saving / capex) descending
    ranked = sorted(items, key=lambda x: x["roi_ratio"], reverse=True)
    selected = []
    remaining = budget

    for item in ranked:
        if item["capex"] <= remaining:
            selected.append(item)
            remaining -= item["capex"]

    return selected


def generate_portfolio(conn, campus_id, budget_lakhs=50):
    """Generate optimal intervention portfolio."""
    cursor = conn.cursor()
    budget = budget_lakhs * 100000  # Convert to INR

    # Fetch data for each pillar
    pillar_data = {}
    for pillar in ["power", "water", "waste"]:
        cursor.execute(
            "SELECT data FROM readings WHERE campus_id = ? AND pillar = ? ORDER BY timestamp DESC LIMIT 30",
            (campus_id, pillar)
        )
        rows = cursor.fetchall()
        cons, gen, gap = calculate_gap(rows, pillar)
        pillar_data[pillar] = {"consumption": cons, "generation": gen, "gap": gap, "count": len(rows)}

    # Size interventions based on gaps
    candidates = []

    # Power interventions
    power_gap = pillar_data["power"]["gap"]
    if power_gap > 0:
        solar_kw = max(1, math.ceil(power_gap / 4))  # 4 peak sun hours
        s = SOLUTIONS["solar_rooftop"]
        candidates.append({
            "id": "solar_rooftop", "name": s["name"], "quantity": solar_kw,
            "unit": s["unit"], "capex": solar_kw * s["capex_per_unit"],
            "annual_saving": solar_kw * s["annual_saving_per_unit"],
            "carbon_offset": solar_kw * s["carbon_per_unit"],
            "roi_ratio": s["annual_saving_per_unit"] / s["capex_per_unit"],
            "reasoning": f"Close {power_gap:.0f} kWh/day gap with {solar_kw} kW solar"
        })

        batt_kwh = max(1, math.ceil(solar_kw * 1.5))
        s = SOLUTIONS["bess"]
        candidates.append({
            "id": "bess", "name": s["name"], "quantity": batt_kwh,
            "unit": s["unit"], "capex": batt_kwh * s["capex_per_unit"],
            "annual_saving": batt_kwh * s["annual_saving_per_unit"],
            "carbon_offset": batt_kwh * s["carbon_per_unit"],
            "roi_ratio": s["annual_saving_per_unit"] / s["capex_per_unit"],
            "reasoning": f"{batt_kwh} kWh storage for peak shaving"
        })

    # LED retrofit (always useful)
    led_count = max(50, math.ceil(pillar_data["power"]["consumption"] * 0.2))
    s = SOLUTIONS["led_retrofit"]
    candidates.append({
        "id": "led_retrofit", "name": s["name"], "quantity": led_count,
        "unit": s["unit"], "capex": led_count * s["capex_per_unit"],
        "annual_saving": led_count * s["annual_saving_per_unit"],
        "carbon_offset": led_count * s["carbon_per_unit"],
        "roi_ratio": s["annual_saving_per_unit"] / s["capex_per_unit"],
        "reasoning": f"{led_count} LED replacements for 15-20% power reduction"
    })

    # Smart meters
    s = SOLUTIONS["smart_meters"]
    candidates.append({
        "id": "smart_meters", "name": s["name"], "quantity": 25,
        "unit": s["unit"], "capex": 25 * s["capex_per_unit"],
        "annual_saving": 25 * s["annual_saving_per_unit"],
        "carbon_offset": 25 * s["carbon_per_unit"],
        "roi_ratio": s["annual_saving_per_unit"] / s["capex_per_unit"],
        "reasoning": "25 meters for full campus monitoring"
    })

    # Water interventions
    if pillar_data["water"]["gap"] > 0:
        s = SOLUTIONS["rwh"]
        candidates.append({
            "id": "rwh", "name": s["name"], "quantity": 2,
            "unit": s["unit"], "capex": 2 * s["capex_per_unit"],
            "annual_saving": 2 * s["annual_saving_per_unit"],
            "carbon_offset": 2 * s["carbon_per_unit"],
            "roi_ratio": s["annual_saving_per_unit"] / s["capex_per_unit"],
            "reasoning": "2 rainwater harvesting units"
        })
        s = SOLUTIONS["greywater"]
        candidates.append({
            "id": "greywater", "name": s["name"], "quantity": 1,
            "unit": s["unit"], "capex": s["capex_per_unit"],
            "annual_saving": s["annual_saving_per_unit"],
            "carbon_offset": s["carbon_per_unit"],
            "roi_ratio": s["annual_saving_per_unit"] / s["capex_per_unit"],
            "reasoning": "1 greywater plant for 40-60% water reduction"
        })

    # Waste interventions
    if pillar_data["waste"]["gap"] > 0:
        s = SOLUTIONS["biogas"]
        candidates.append({
            "id": "biogas", "name": s["name"], "quantity": 1,
            "unit": s["unit"], "capex": s["capex_per_unit"],
            "annual_saving": s["annual_saving_per_unit"],
            "carbon_offset": s["carbon_per_unit"],
            "roi_ratio": s["annual_saving_per_unit"] / s["capex_per_unit"],
            "reasoning": "1 biogas digester for organic waste"
        })
        s = SOLUTIONS["composting"]
        candidates.append({
            "id": "composting", "name": s["name"], "quantity": 2,
            "unit": s["unit"], "capex": 2 * s["capex_per_unit"],
            "annual_saving": 2 * s["annual_saving_per_unit"],
            "carbon_offset": 2 * s["carbon_per_unit"],
            "roi_ratio": s["annual_saving_per_unit"] / s["capex_per_unit"],
            "reasoning": "2 composting units for garden/kitchen waste"
        })

    # Optimize with budget constraint
    selected = knapsack_optimize(candidates, budget)

    # Calculate totals
    total_capex = sum(s["capex"] for s in selected)
    total_saving = sum(s["annual_saving"] for s in selected)
    total_carbon = sum(s["carbon_offset"] for s in selected)
    payback = total_capex / total_saving if total_saving > 0 else float("inf")

    return {
        "campus_id": campus_id,
        "budget_lakhs": budget_lakhs,
        "pillar_analysis": pillar_data,
        "all_candidates": len(candidates),
        "selected_count": len(selected),
        "portfolio": selected,
        "summary": {
            "total_capex": round(total_capex),
            "total_capex_lakhs": round(total_capex / 100000, 1),
            "annual_saving": round(total_saving),
            "annual_saving_lakhs": round(total_saving / 100000, 1),
            "payback_years": round(payback, 1) if payback != float("inf") else "N/A",
            "total_carbon_offset_tco2e": round(total_carbon, 1),
            "carbon_credit_revenue": round(total_carbon * 500),
            "roi_25_year": round(total_saving * 25 - total_capex),
            "roi_25_year_lakhs": round((total_saving * 25 - total_capex) / 100000, 1)
        }
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: optimize_suggestions.py <db_path> <campus_id> [budget_lakhs]"}))
        sys.exit(1)

    db_path = sys.argv[1]
    campus_id = int(sys.argv[2])
    budget = int(sys.argv[3]) if len(sys.argv) > 3 else 50

    conn = sqlite3.connect(db_path)
    result = generate_portfolio(conn, campus_id, budget)
    conn.close()

    print(json.dumps(result))
