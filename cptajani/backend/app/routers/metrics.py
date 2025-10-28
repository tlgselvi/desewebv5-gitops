from fastapi import APIRouter
from app.schemas.act import MetricsRequest, MetricsResponse
from app.adapters.prom_adapter import PromAdapter
from datetime import datetime
import time

router = APIRouter()
prom = PromAdapter()

@router.post("/metrics", response_model=MetricsResponse)
def query_metrics(req: MetricsRequest):
    """Prometheus metriklerini sorgula"""
    start_time = time.time()
    
    result = prom.query(req.query, req.time_range)
    
    execution_time = (time.time() - start_time) * 1000
    
    return MetricsResponse(
        query=req.query,
        data=result.get("data", []),
        status=result.get("status", "success"),
        execution_time_ms=execution_time
    )

@router.get("/metrics/kpis")
def get_kpis():
    """Ana KPI metriklerini getir"""
    return {
        "kpis": {
            "accuracy": {
                "current": 0.92,
                "target": 0.90,
                "trend": "stable",
                "last_updated": datetime.utcnow().isoformat()
            },
            "fp_rate": {
                "current": 0.025,
                "target": 0.03,
                "trend": "improving",
                "last_updated": datetime.utcnow().isoformat()
            },
            "correlation": {
                "current": 0.91,
                "target": 0.90,
                "trend": "stable",
                "last_updated": datetime.utcnow().isoformat()
            },
            "latency": {
                "current": 4.2,
                "target": 6.0,
                "trend": "stable",
                "last_updated": datetime.utcnow().isoformat()
            }
        }
    }

@router.get("/metrics/dashboard")
def get_dashboard_metrics():
    """Dashboard için metrikleri getir"""
    return {
        "system_metrics": {
            "cpu_usage": 0.75,
            "memory_usage": 0.68,
            "disk_usage": 0.45,
            "network_io": 0.32
        },
        "application_metrics": {
            "requests_per_second": 150,
            "response_time_ms": 250,
            "error_rate": 0.02,
            "uptime_percentage": 99.8
        },
        "business_metrics": {
            "seo_score": 0.93,
            "performance_score": 0.87,
            "accessibility_score": 0.95,
            "pwa_score": 0.68
        }
    }

@router.get("/metrics/alerts")
def get_active_alerts():
    """Aktif uyarıları getir"""
    return {
        "alerts": [
            {
                "name": "High CPU Usage",
                "severity": "warning",
                "status": "firing",
                "description": "CPU usage above 80%",
                "timestamp": datetime.utcnow().isoformat()
            },
            {
                "name": "Memory Pressure",
                "severity": "info",
                "status": "resolved",
                "description": "Memory usage normalized",
                "timestamp": datetime.utcnow().isoformat()
            }
        ]
    }
