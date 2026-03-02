#!/usr/bin/env python3
"""
CampusZero — Anomaly Detection Model
Reads sensor data from SQLite, detects outliers using Z-score and IQR methods,
outputs anomalies with severity as JSON.

Usage: python3 models/anomaly_detect.py <db_path> <campus_id> [pillar]
"""

import sys
import json
import math
import sqlite3


def z_score_detect(values, threshold=2.0):
    """Detect anomalies using Z-score method."""
    if len(values) < 3:
        return []

    mean = sum(values) / len(values)
    variance = sum((x - mean) ** 2 for x in values) / len(values)
    std = math.sqrt(variance) if variance > 0 else 1

    anomalies = []
    for i, val in enumerate(values):
        z = abs(val - mean) / std
        if z > threshold:
            anomalies.append({
                "index": i,
                "value": val,
                "z_score": round(z, 2),
                "deviation": "above" if val > mean else "below",
                "severity": "high" if z > 3 else "medium"
            })
    return anomalies


def iqr_detect(values, multiplier=1.5):
    """Detect anomalies using IQR (Interquartile Range) method."""
    if len(values) < 4:
        return []

    sorted_vals = sorted(values)
    n = len(sorted_vals)
    q1 = sorted_vals[n // 4]
    q3 = sorted_vals[3 * n // 4]
    iqr = q3 - q1

    lower = q1 - multiplier * iqr
    upper = q3 + multiplier * iqr

    anomalies = []
    for i, val in enumerate(values):
        if val < lower or val > upper:
            anomalies.append({
                "index": i,
                "value": val,
                "bound_violated": "lower" if val < lower else "upper",
                "lower_bound": round(lower, 2),
                "upper_bound": round(upper, 2)
            })
    return anomalies


def rate_of_change_detect(values, threshold_pct=50):
    """Detect sudden spikes/drops between consecutive readings."""
    anomalies = []
    for i in range(1, len(values)):
        if values[i - 1] == 0:
            continue
        pct_change = ((values[i] - values[i - 1]) / values[i - 1]) * 100
        if abs(pct_change) > threshold_pct:
            anomalies.append({
                "index": i,
                "value": values[i],
                "prev_value": values[i - 1],
                "pct_change": round(pct_change, 1),
                "type": "spike" if pct_change > 0 else "drop"
            })
    return anomalies


def analyze_pillar(conn, campus_id, pillar):
    """Run full anomaly detection on one pillar."""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT data FROM readings WHERE campus_id = ? AND pillar = ? ORDER BY timestamp ASC",
        (campus_id, pillar)
    )
    rows = cursor.fetchall()

    if len(rows) < 5:
        return {"pillar": pillar, "error": "Insufficient data (need >= 5 readings)"}

    entries = [json.loads(r[0]) for r in rows]

    # Determine primary field per pillar
    field_map = {
        "power": "consumption_kwh",
        "water": "consumption_liters",
        "waste": "total_kg"
    }
    field = field_map.get(pillar, "consumption_kwh")
    values = [float(e.get(field, 0)) for e in entries]
    timestamps = [e.get("timestamp", 0) for e in entries]

    # Run all detection methods
    z_anomalies = z_score_detect(values)
    iqr_anomalies = iqr_detect(values)
    roc_anomalies = rate_of_change_detect(values)

    # Combine and deduplicate
    anomaly_indices = set()
    combined = []
    for a in z_anomalies + iqr_anomalies + roc_anomalies:
        idx = a["index"]
        if idx not in anomaly_indices:
            anomaly_indices.add(idx)
            combined.append({
                **a,
                "timestamp": timestamps[idx] if idx < len(timestamps) else None,
                "pillar": pillar,
                "field": field
            })

    # Statistics
    mean_val = sum(values) / len(values)
    std_val = math.sqrt(sum((x - mean_val) ** 2 for x in values) / len(values))

    return {
        "pillar": pillar,
        "field": field,
        "data_points": len(values),
        "mean": round(mean_val, 2),
        "std": round(std_val, 2),
        "min": round(min(values), 2),
        "max": round(max(values), 2),
        "anomaly_count": len(combined),
        "anomaly_rate": round(len(combined) / len(values) * 100, 1),
        "anomalies": combined[:20],  # Top 20
        "health_score": max(0, round(100 - len(combined) / len(values) * 200, 1))
    }


def detect(db_path, campus_id, pillar=None):
    """Main anomaly detection pipeline."""
    conn = sqlite3.connect(db_path)

    pillars = [pillar] if pillar else ["power", "water", "waste"]
    results = {}
    overall_health = 0

    for p in pillars:
        results[p] = analyze_pillar(conn, campus_id, p)
        overall_health += results[p].get("health_score", 0)

    conn.close()

    overall_health = round(overall_health / len(pillars), 1)

    return {
        "campus_id": campus_id,
        "overall_health": overall_health,
        "status": "healthy" if overall_health > 80 else "warning" if overall_health > 50 else "critical",
        "pillars": results
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: anomaly_detect.py <db_path> <campus_id> [pillar]"}))
        sys.exit(1)

    db_path = sys.argv[1]
    campus_id = int(sys.argv[2])
    pillar = sys.argv[3] if len(sys.argv) > 3 else None

    result = detect(db_path, campus_id, pillar)
    print(json.dumps(result))
