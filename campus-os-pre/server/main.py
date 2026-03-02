from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta
import base64
import csv
import io
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")

import models, schemas, database, auth
from sensor_generator import generate_random_sensor_data
from ai_model import run_ai_prediction
from hf_llm import get_strategic_advice, get_kpi_suggestion, analyze_building_image

# Create the database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="ParyayOS Backend Database")

# CORS middleware for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# --- Dependency to get current user ---
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except auth.JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

# --- AUTH ENDPOINTS ---

@app.post("/api/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_pwd = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


# --- DATA ENDPOINTS ---
# Notice we protect these routes by adding `Depends(get_current_user)`

@app.get("/api/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.post("/api/data/generate", response_model=List[schemas.SensorDataResponse])
def trigger_data_generation(num_records: int = 10, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Endpoint to manually trigger the creation of synthetic sensor data.
    """
    new_data = generate_random_sensor_data(db, num_records)
    return new_data

@app.post("/api/ai/predict", response_model=schemas.PredictionResponse)
def trigger_ai_prediction(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Endpoint to trigger the Linear Regression model to calculate insights based on current DB sensor data.
    """
    prediction = run_ai_prediction(db)
    if not prediction:
        raise HTTPException(status_code=400, detail="Not enough sensor data in DB to run the model.")
    return prediction

@app.get("/api/sensors", response_model=List[schemas.SensorDataResponse])
def get_sensor_data(limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Fetch the latest raw sensor metrics to populate frontend dashboards.
    """
    return db.query(models.SensorData).order_by(models.SensorData.timestamp.desc()).limit(limit).all()
    
@app.get("/api/predictions", response_model=List[schemas.PredictionResponse])
def get_ai_predictions(limit: int = 10, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Fetch the latest model predictions to display mapped logic to the frontend.
    """
    return db.query(models.Prediction).order_by(models.Prediction.timestamp.desc()).limit(limit).all()


# --- AI / Hugging Face (strategic advice & KPI suggestions) ---

@app.get("/api/ai/advice")
def ai_strategic_advice(
    topic: str = "energy",
    context: str = "",
    current_user: models.User = Depends(get_current_user),
):
    """Get human-readable strategic advice from the configured Hugging Face model (e.g. TinyLlama/Phi-2)."""
    advice = get_strategic_advice(topic, context)
    return {"topic": topic, "advice": advice}


@app.get("/api/ai/kpi-suggestion")
def ai_kpi_suggestion(
    metric: str = "power",
    current_value: float = 0.0,
    unit: str = "kW",
    current_user: models.User = Depends(get_current_user),
):
    """Get a suggested KPI value and rationale from the model for map/graph predictions."""
    result = get_kpi_suggestion(metric, current_value, unit)
    return result


@app.post("/api/ai/analyze-building-image")
def ai_analyze_building_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
):
    """Analyze an uploaded building image with HF vision model; return inferred shape and height (width, depth, height in meters)."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
    try:
        contents = file.file.read()
        image_b64 = base64.b64encode(contents).decode("utf-8")
        # Optional: pass as data URL for some APIs
        content_type = (file.content_type or "image/jpeg").split(";")[0].strip()
        image_b64 = f"data:{content_type};base64,{image_b64}"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")
    result = analyze_building_image(image_b64)
    return result


# --- CSV UPLOAD (historical data for model training) ---

@app.post("/api/data/upload", response_model=List[schemas.HistoricalDataResponse])
def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upload a CSV file with historical sensor/training data. Expected columns: sensor_type, value, unit (optional), location (optional)."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV.")
    try:
        contents = file.file.read()
        text = contents.decode("utf-8")
        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {str(e)}")
    created = []
    for row in rows:
        sensor_type = row.get("sensor_type") or row.get("sensor_type ", "").strip()
        value_s = row.get("value") or row.get(" value", "0").strip()
        if not sensor_type:
            continue
        try:
            value = float(value_s)
        except ValueError:
            value = 0.0
        unit = (row.get("unit") or "").strip() or None
        location = (row.get("location") or "").strip() or None
        rec = models.HistoricalData(
            sensor_type=sensor_type,
            value=value,
            unit=unit,
            location=location,
            source_file=file.filename,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        created.append(schemas.HistoricalDataResponse.model_validate(rec))
    return created


# --- HARDWARE REGISTRY (Add to Twin → AI CBA Run → Approve & Install → Sync to Server) ---

@app.get("/api/hardware", response_model=List[schemas.HardwareResponse])
def list_hardware(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Hardware).order_by(models.Hardware.updated_at.desc()).all()


@app.post("/api/hardware", response_model=schemas.HardwareResponse)
def create_hardware(
    body: schemas.HardwareCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    h = models.Hardware(
        name=body.name,
        device_type=body.device_type,
        location=body.location,
        specs=body.specs,
        sensor_ids=body.sensor_ids,
        status=body.status or "draft",
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return schemas.HardwareResponse.model_validate(h)


@app.get("/api/hardware/{hardware_id}", response_model=schemas.HardwareResponse)
def get_hardware(
    hardware_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    h = db.query(models.Hardware).filter(models.Hardware.id == hardware_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hardware not found")
    return schemas.HardwareResponse.model_validate(h)


@app.patch("/api/hardware/{hardware_id}", response_model=schemas.HardwareResponse)
def update_hardware(
    hardware_id: int,
    body: schemas.HardwareUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    h = db.query(models.Hardware).filter(models.Hardware.id == hardware_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hardware not found")
    if body.name is not None:
        h.name = body.name
    if body.device_type is not None:
        h.device_type = body.device_type
    if body.location is not None:
        h.location = body.location
    if body.specs is not None:
        h.specs = body.specs
    if body.sensor_ids is not None:
        h.sensor_ids = body.sensor_ids
    if body.status is not None:
        h.status = body.status
    if body.cba_result is not None:
        h.cba_result = body.cba_result
    db.commit()
    db.refresh(h)
    return schemas.HardwareResponse.model_validate(h)


@app.post("/api/hardware/{hardware_id}/add-to-twin")
def hardware_add_to_twin(
    hardware_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    h = db.query(models.Hardware).filter(models.Hardware.id == hardware_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hardware not found")
    h.status = "in_twin"
    db.commit()
    db.refresh(h)
    return {"ok": True, "status": h.status}


@app.post("/api/hardware/{hardware_id}/cba-run")
def hardware_cba_run(
    hardware_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Request AI cost-benefit analysis for this hardware."""
    h = db.query(models.Hardware).filter(models.Hardware.id == hardware_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hardware not found")
    h.status = "cba_requested"
    h.cba_result = "CBA pending (run AI pipeline); placeholder result."
    db.commit()
    db.refresh(h)
    return {"ok": True, "status": h.status, "cba_result": h.cba_result}


@app.post("/api/hardware/{hardware_id}/approve-install")
def hardware_approve_install(
    hardware_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    h = db.query(models.Hardware).filter(models.Hardware.id == hardware_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hardware not found")
    h.status = "approved"
    db.commit()
    db.refresh(h)
    return {"ok": True, "status": h.status}


@app.post("/api/hardware/{hardware_id}/sync-to-server")
def hardware_sync_to_server(
    hardware_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    h = db.query(models.Hardware).filter(models.Hardware.id == hardware_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hardware not found")
    h.status = "synced"
    db.commit()
    db.refresh(h)
    return {"ok": True, "status": h.status}


# --- BUILDINGS (user-added; show in Digital Twin) ---

@app.get("/api/buildings", response_model=List[schemas.BuildingResponse])
def list_buildings(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Building).order_by(models.Building.created_at.desc()).all()


@app.post("/api/buildings", response_model=schemas.BuildingResponse)
def create_building(
    body: schemas.BuildingCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    b = models.Building(
        name=body.name,
        photo_base64=body.photo_base64,
        energy=body.energy,
        water=body.water,
        occupancy=body.occupancy,
        temp=body.temp,
        position_x=body.position_x,
        position_z=body.position_z,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return schemas.BuildingResponse.model_validate(b)


@app.get("/api/buildings/{building_id}", response_model=schemas.BuildingResponse)
def get_building(
    building_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    b = db.query(models.Building).filter(models.Building.id == building_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")
    return schemas.BuildingResponse.model_validate(b)
