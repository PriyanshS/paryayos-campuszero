#!/usr/bin/env python3
"""
CampusZero — Consumption Prediction Model
Reads sensor data from SQLite, runs linear regression + seasonal decomposition,
outputs 30-day forecast as JSON.

Usage: python3 models/predict_consumption.py <db_path> <campus_id> <pillar> <field>
Example: python3 models/predict_consumption.py db/campuszero.db 1 power consumption_kwh
"""

import sys
import json
import math
import sqlite3
from datetime import datetime, timedelta


def linear_regression(y_values):
    """Simple OLS linear regression."""
    n = len(y_values)
    if n < 2:
        return {"slope": 0, "intercept": y_values[0] if y_values else 0, "r2": 0}

    sum_x = sum(range(n))
    sum_y = sum(y_values)
    sum_xy = sum(i * y for i, y in enumerate(y_values))
    sum_x2 = sum(i * i for i in range(n))

    denom = n * sum_x2 - sum_x * sum_x
    if denom == 0:
        return {"slope": 0, "intercept": sum_y / n, "r2": 0}

    slope = (n * sum_xy - sum_x * sum_y) / denom
    intercept = (sum_y - slope * sum_x) / n

    y_mean = sum_y / n
    ss_res = sum((y - (slope * i + intercept)) ** 2 for i, y in enumerate(y_values))
    ss_tot = sum((y - y_mean) ** 2 for y in y_values)
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0

    return {"slope": slope, "intercept": intercept, "r2": r2}


def moving_average(data, window=7):
    """Compute moving average for smoothing."""
    result = []
    for i in range(len(data)):
        start = max(0, i - window + 1)
        chunk = data[start:i + 1]
        result.append(sum(chunk) / len(chunk))
    return result


def detect_seasonality(values, period=30):
    """Simple seasonal decomposition using sine fitting."""
    n = len(values)
    if n < period:
        return 0.0
    # Compute amplitude of seasonal swing
    chunks = [values[i:i + period] for i in range(0, n - period + 1, period)]
    if len(chunks) < 2:
        return 0.0
    amplitudes = [(max(c) - min(c)) / 2 for c in chunks]
    return sum(amplitudes) / len(amplitudes)


def predict(db_path, campus_id, pillar, field, days_ahead=30):
    """Main prediction pipeline."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute(
        "SELECT data FROM readings WHERE campus_id = ? AND pillar = ? ORDER BY timestamp ASC",
        (campus_id, pillar)
    )
    rows = cursor.fetchall()
    conn.close()

    if len(rows) < 7:
        return {"error": "Need at least 7 days of data", "predictions": []}

    # Extract field values
    values = []
    timestamps = []
    for row in rows:
        entry = json.loads(row[0])
        val = entry.get(field, 0)
        values.append(float(val) if val else 0)
        timestamps.append(entry.get("timestamp", 0))

    # Smooth and regress
    smoothed = moving_average(values, 7)
    reg = linear_regression(smoothed)

    # Seasonal amplitude
    season_amp = detect_seasonality(values)

    # Generate predictions
    predictions = []
    last_idx = len(values) - 1
    now = datetime.now()

    for i in range(1, days_ahead + 1):
        idx = last_idx + i
        base = reg["slope"] * idx + reg["intercept"]

        # Add seasonal sine component
        seasonal = season_amp * math.sin((idx / 90) * math.pi * 2) * 0.15
        predicted = base * (1 + seasonal)
        predicted = max(0, predicted)

        pred_date = (now + timedelta(days=i)).strftime("%Y-%m-%d")
        confidence = max(15, min(95, reg["r2"] * 100 - i * 0.8))

        predictions.append({
            "day": i,
            "date": pred_date,
            "value": round(predicted, 2),
            "confidence": round(confidence, 1)
        })

    # Trend classification
    slope = reg["slope"]
    trend = "increasing" if slope > 0.5 else "decreasing" if slope < -0.5 else "stable"

    # Current vs predicted averages
    current_avg = sum(values[-7:]) / min(7, len(values))
    predicted_avg = sum(p["value"] for p in predictions[:7]) / 7

    # Generate warnings
    warnings = []
    if trend == "increasing":
        pct = ((predicted_avg - current_avg) / current_avg * 100) if current_avg > 0 else 0
        warnings.append({
            "severity": "high" if abs(pct) > 15 else "medium",
            "title": f"📈 {pillar.title()} {field.replace('_', ' ').title()} Rising",
            "message": f"Predicted to increase {pct:.1f}% over next 14 days "
                       f"({current_avg:.0f} → {predicted_avg:.0f})"
        })
    elif trend == "decreasing" and pillar == "power":
        warnings.append({
            "severity": "info",
            "title": f"📉 {pillar.title()} Declining",
            "message": "Positive trend! Consumption is decreasing."
        })

    return {
        "pillar": pillar,
        "field": field,
        "trend": trend,
        "slope": round(slope, 4),
        "r2": round(reg["r2"], 4),
        "seasonal_amplitude": round(season_amp, 2),
        "current_avg": round(current_avg, 2),
        "predicted_avg": round(predicted_avg, 2),
        "data_points": len(values),
        "predictions": predictions,
        "warnings": warnings
    }


if __name__ == "__main__":
    if len(sys.argv) < 5:
        print(json.dumps({"error": "Usage: predict_consumption.py <db_path> <campus_id> <pillar> <field>"}))
        sys.exit(1)

    db_path = sys.argv[1]
    campus_id = int(sys.argv[2])
    pillar = sys.argv[3]
    field = sys.argv[4]
    days = int(sys.argv[5]) if len(sys.argv) > 5 else 30

    result = predict(db_path, campus_id, pillar, field, days)
    print(json.dumps(result))
