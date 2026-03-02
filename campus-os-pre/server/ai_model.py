import json
from sqlalchemy.orm import Session
from sklearn.linear_model import LinearRegression
import numpy as np
import models
import schemas
from datetime import datetime

def run_ai_prediction(db: Session) -> schemas.PredictionResponse:
    """
    Simulates training a Linear Regression model on recent sensor data to predict 
    future power usage, then saves that prediction back to the database.
    """
    # 1. Fetch recent sensor data from the database
    # For a real Linear Regression, we need X (e.g., temperature) and y (e.g., power)
    recent_hvac = db.query(models.SensorData).filter(models.SensorData.sensor_type == "hvac").order_by(models.SensorData.timestamp.desc()).limit(20).all()
    recent_power = db.query(models.SensorData).filter(models.SensorData.sensor_type == "power").order_by(models.SensorData.timestamp.desc()).limit(20).all()
    
    # We need matching pairs. For simulation, just take whatever we have and pair them up.
    # In a real app, you'd join by closest timestamp.
    min_length = min(len(recent_hvac), len(recent_power))
    
    if min_length < 5:
        # Not enough data to train a meaningful model
        return None

    # X = temperatures (HVAC), y = power consumption
    X = np.array([[sensor.value] for sensor in recent_hvac[:min_length]])
    y = np.array([sensor.value for sensor in recent_power[:min_length]])
    
    # Retrieve the IDs of the sensors used for tracing
    sensor_ids_used = [sensor.id for sensor in recent_hvac[:min_length]] + [sensor.id for sensor in recent_power[:min_length]]

    # 2. Train the Linear Regression Model
    model = LinearRegression()
    model.fit(X, y)
    
    # 3. Make a prediction for the next hour based on an assumed upcoming temperature 
    # Let's say the current average temp is X.mean(), we predict power for X.mean() + 1 degree
    assumed_future_temp = np.mean(X) + 1.0 
    predicted_power = model.predict([[assumed_future_temp]])[0]
    
    # Calculate R^2 score for confidence (just as a metric)
    confidence = model.score(X, y)

    # 4. Save the prediction to the database
    new_prediction = models.Prediction(
        model_type="linear_regression_power_forecast",
        predicted_value=round(predicted_power, 2),
        confidence_score=round(confidence, 4) if not np.isnan(confidence) else 0.0,
        target_metric="Future Power Consumption (kW) at +1°C",
        based_on_sensors=json.dumps(sensor_ids_used),
        timestamp=datetime.utcnow()
    )
    
    db.add(new_prediction)
    db.commit()
    db.refresh(new_prediction)
    
    return schemas.PredictionResponse.model_validate(new_prediction)
