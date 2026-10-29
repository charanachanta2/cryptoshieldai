from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
import uuid
import os
from contextlib import asynccontextmanager
from pathlib import Path

from app.schemas import (
    PredictRequest, PredictResponse, HealthResponse, ModelInfo,
    RiskLevel, ConfidenceLevel, RecommendedAction, EvidenceSeverity
)
from app.model_service import model_service

# Load environment
from dotenv import load_dotenv
load_dotenv()

# Resolve model path relative to this file's location, not CWD
_BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_PATH = os.getenv("MODEL_PATH", str(_BASE_DIR / "datasets" / "04_processed" / "model_artifacts" / "bccc_transaction_only_model.joblib"))
MODEL_VERSION = os.getenv("MODEL_VERSION", "0.1.0-exploratory")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting ML service...")
    success = model_service.load_model(MODEL_PATH, MODEL_VERSION)
    if not success:
        print("WARNING: Model failed to load. Service will return 503 for predictions.")
    yield
    # Shutdown
    print("Shutting down ML service...")

app = FastAPI(
    title="CryptoShield ML Inference Service",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "The request contains invalid fields.",
                "details": [
                    {
                        "field": ".".join(str(x) for x in e["loc"]),
                        "issue": e["type"],
                        "message": e["msg"],
                    }
                    for e in exc.errors()
                ],
                "requestId": request.state.request_id,
                "retryable": False,
            }
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "requestId": request.state.request_id,
                "retryable": False,
            }
        },
    )

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok" if model_service.is_loaded else "not_ready",
        service="cryptoshield-ml",
        version="0.1.0",
        model_loaded=model_service.is_loaded,
        model_version=model_service.model_version if model_service.is_loaded else None,
        feature_version=model_service.feature_version if model_service.is_loaded else None,
    )

@app.get("/model/info", response_model=ModelInfo)
async def model_info():
    if not model_service.is_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return ModelInfo(**model_service.get_model_info())

@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    if not model_service.is_loaded:
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "MODEL_NOT_READY",
                    "message": "The ML service is unavailable.",
                    "retryable": True,
                }
            }
        )
    
    try:
        result = model_service.predict(request.features)
        
        return PredictResponse(
            model=request.model,
            model_version=request.model_version,
            feature_version=model_service.feature_version or "bccc-11-v1",
            score=result["score"],
            risk_level=result["risk_level"],
            threshold=0.63,  # From training
            calibrated=False,
            evidence=result["evidence"],
            limitations=result["limitations"],
            request_id=str(uuid.uuid4()),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": f"Prediction failed: {str(e)}",
                    "retryable": False,
                }
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=os.getenv("ML_SERVICE_HOST", "127.0.0.1"),
        port=int(os.getenv("ML_SERVICE_PORT", "8000")),
        reload=True,
    )