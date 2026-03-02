import random
from typing import List
from sqlalchemy.orm import Session
import models
import schemas
from datetime import datetime

# Define campus zones for data generation
ZONES = ["Library", "Engineering Block", "Hostel A", "Cafeteria", "Main Admin"]
SENSOR_TYPES = {"power": "kW", "hvac": "°C", "water": "Liters", "waste": "kg"}

def generate_random_sensor_data(db: Session, num_records=10) -> List[schemas.SensorDataResponse]:
    """
    Generates random hypothetical sensor data and saves it to the database.
    This simulates actual real-world sensors pinging the backend.
    """
    generated_data = []
    
    for _ in range(num_records):
        sensor_type = random.choice(list(SENSOR_TYPES.keys()))
        unit = SENSOR_TYPES[sensor_type]
        location = random.choice(ZONES)
        
        # Generate realistic random values based on sensor type
        if sensor_type == "power":
            value = round(random.uniform(10.0, 500.0), 2)
        elif sensor_type == "hvac":
            value = round(random.uniform(18.0, 28.0), 1)
        elif sensor_type == "waste":
            value = round(random.uniform(5.0, 350.0), 2)
        else:  # water
            value = round(random.uniform(50.0, 1000.0), 2)
            
        new_sensor_record = models.SensorData(
            sensor_type=sensor_type,
            value=value,
            unit=unit,
            location=location,
            timestamp=datetime.utcnow()
        )
        
        db.add(new_sensor_record)
        db.commit()
        db.refresh(new_sensor_record)
        
        # Convert ORM model to Pydantic schema for response logging if needed
        generated_data.append(schemas.SensorDataResponse.model_validate(new_sensor_record))
        
    return generated_data
