from fastapi import APIRouter
from app.schemas.act import ActRequest, ActResponse
from app.core.agent import CptAgent
from app.adapters.k8s_adapter import K8sAdapter
from app.adapters.argo_adapter import ArgoAdapter
from app.adapters.prom_adapter import PromAdapter
from app.adapters.store_adapter import StoreAdapter
from app.core.tools import ToolRegistry
from datetime import datetime

router = APIRouter()

# Simple DI setup
k8s = K8sAdapter()
argo = ArgoAdapter()
prom = PromAdapter()
store = StoreAdapter()
agent = CptAgent(ToolRegistry(k8s, argo, prom, store))

@router.post("/act", response_model=ActResponse)
async def act(req: ActRequest):
    """CPT Ajanı ana aksiyon endpoint'i"""
    result = await agent.act(req.intent, req.params or {})
    
    return ActResponse(
        accepted=result.get("success", False),
        action=req.intent,
        result=result,
        timestamp=datetime.utcnow().isoformat(),
        confidence=result.get("confidence", 0.8)
    )

@router.get("/act/intents")
def get_available_intents():
    """Kullanılabilir intent'leri listele"""
    return {
        "intents": [
            {
                "name": "k8s.logs",
                "description": "Kubernetes deployment loglarını getir",
                "params": {"deployment": "string (required)"}
            },
            {
                "name": "prophet.tune",
                "description": "Prophet model konfigürasyonunu güncelle",
                "params": {"changepoint_prior_scale": "float", "seasonality_mode": "string"}
            },
            {
                "name": "metrics.query",
                "description": "Prometheus metriklerini sorgula",
                "params": {"query": "string (required)", "time_range": "string"}
            },
            {
                "name": "argo.sync",
                "description": "ArgoCD uygulamasını senkronize et",
                "params": {"app": "string (required)"}
            },
            {
                "name": "data.ingest",
                "description": "Veri girişi işlemi",
                "params": {"data_type": "string", "data": "object"}
            },
            {
                "name": "anomaly.detect",
                "description": "Anomali tespiti",
                "params": {"metric": "string", "threshold": "float"}
            }
        ]
    }

@router.get("/act/audit")
def get_audit_log():
    """Audit log'u getir"""
    return {
        "audit_log": agent.audit_log[-50:],  # Son 50 kayıt
        "total_entries": len(agent.audit_log)
    }
