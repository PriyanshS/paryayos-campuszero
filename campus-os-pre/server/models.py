from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class SensorData(Base):
    __tablename__ = "sensor_data"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    sensor_type = Column(String, index=True) # e.g., 'power', 'hvac', 'temperature'
    value = Column(Float)
    unit = Column(String)
    location = Column(String)

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    model_type = Column(String, index=True) # e.g., 'power_usage_forecast'
    predicted_value = Column(Float)
    confidence_score = Column(Float, nullable=True)
    target_metric = Column(String) # What is being predicted
    based_on_sensors = Column(String) # JSON string of sensor IDs used for this prediction


class Hardware(Base):
    """Hardware/device registry: Add to Twin → AI CBA Run → Approve & Install → Sync to Server."""
    __tablename__ = "hardware"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    device_type = Column(String)  # e.g. sensor, meter, actuator
    location = Column(String, nullable=True)
    specs = Column(String, nullable=True)  # JSON or free text
    sensor_ids = Column(String, nullable=True)  # comma-separated or JSON
    status = Column(String, default="draft")  # draft | in_twin | cba_requested | cba_done | approved | installed | synced
    cba_result = Column(String, nullable=True)  # AI cost-benefit analysis result
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class HistoricalData(Base):
    """Historical data from CSV uploads for model training."""
    __tablename__ = "historical_data"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    sensor_type = Column(String, index=True)
    value = Column(Float)
    unit = Column(String, nullable=True)
    location = Column(String, nullable=True)
    source_file = Column(String, nullable=True)


class Building(Base):
    """User-added buildings: name, photo, sample data; shown in Digital Twin."""
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    photo_base64 = Column(String, nullable=True)  # data URL or base64
    energy = Column(Float, default=0)
    water = Column(Float, default=0)
    occupancy = Column(Float, default=0)
    temp = Column(Float, nullable=True)
    position_x = Column(Float, default=0)
    position_z = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
