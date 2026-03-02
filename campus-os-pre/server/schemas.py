from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class SensorDataBase(BaseModel):
    sensor_type: str
    value: float
    unit: str
    location: str

class SensorDataCreate(SensorDataBase):
    pass

class SensorDataResponse(SensorDataBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

class PredictionBase(BaseModel):
    model_type: str
    predicted_value: float
    confidence_score: Optional[float] = None
    target_metric: str
    based_on_sensors: str

class PredictionCreate(PredictionBase):
    pass

class PredictionResponse(PredictionBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True


class HardwareBase(BaseModel):
    name: str
    device_type: str
    location: Optional[str] = None
    specs: Optional[str] = None
    sensor_ids: Optional[str] = None
    status: Optional[str] = "draft"


class HardwareCreate(HardwareBase):
    pass


class HardwareUpdate(BaseModel):
    name: Optional[str] = None
    device_type: Optional[str] = None
    location: Optional[str] = None
    specs: Optional[str] = None
    sensor_ids: Optional[str] = None
    status: Optional[str] = None
    cba_result: Optional[str] = None


class HardwareResponse(HardwareBase):
    id: int
    status: str
    cba_result: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HistoricalDataResponse(BaseModel):
    id: int
    timestamp: datetime
    sensor_type: str
    value: float
    unit: Optional[str] = None
    location: Optional[str] = None
    source_file: Optional[str] = None

    class Config:
        from_attributes = True


class BuildingBase(BaseModel):
    name: str
    energy: float = 0
    water: float = 0
    occupancy: float = 0
    temp: Optional[float] = None
    position_x: float = 0
    position_z: float = 0


class BuildingCreate(BuildingBase):
    photo_base64: Optional[str] = None


class BuildingResponse(BuildingBase):
    id: int
    photo_base64: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
