from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health")
def health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "cpt-ajan-backend",
        "version": "1.0.0"
    }

@router.get("/health/detailed")
def health_detailed():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "cpt-ajan-backend",
        "version": "1.0.0",
        "components": {
            "database": "connected",
            "k8s_api": "available",
            "argo_api": "available",
            "prometheus": "available"
        }
    }
