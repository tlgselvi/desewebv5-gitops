from pydantic import BaseModel
from typing import Optional, Dict, Any

class ActRequest(BaseModel):
    intent: str  # e.g., "prophet.tune", "fp.reduce", "k8s.logs"
    params: Optional[Dict[str, Any]] = None

class ActResponse(BaseModel):
    accepted: bool
    action: str
    result: Dict[str, Any]
    timestamp: str
    confidence: Optional[float] = None

class TrainingRequest(BaseModel):
    data_type: str  # e.g., "prophet_config", "anomaly_patterns"
    data: Dict[str, Any]
    version: Optional[str] = "1.0"

class TrainingResponse(BaseModel):
    success: bool
    trained_items: int
    model_version: str
    accuracy: Optional[float] = None

class MetricsRequest(BaseModel):
    query: str
    time_range: Optional[str] = "1h"
    step: Optional[str] = "15s"

class MetricsResponse(BaseModel):
    query: str
    data: list
    status: str
    execution_time_ms: float
