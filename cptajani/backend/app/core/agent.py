from typing import Dict, Any
from datetime import datetime
from .tools import ToolRegistry

SYSTEM_RULES = {
    "goals": [
        "accuracy >= 90%", 
        "fp <= 3%", 
        "corr >= 0.9", 
        "latency < 6s"
    ],
    "policy": [
        "read-only unless intent explicitly allows mutation",
        "always log actions and outcomes",
        "validate parameters before execution",
        "maintain audit trail for all operations"
    ],
}

class CptAgent:
    def __init__(self, tools: ToolRegistry):
        self.tools = tools
        self.audit_log = []

    def act(self, intent: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        CPT Ajanı ana karar döngüsü
        """
        start_time = datetime.utcnow()
        
        # Intent validation
        if not self._validate_intent(intent):
            return {"error": "invalid_intent", "message": f"Unknown intent: {intent}"}
        
        # Parameter validation
        if not self._validate_params(intent, params):
            return {"error": "invalid_params", "message": "Parameter validation failed"}
        
        # Execute action based on intent
        try:
            if intent == "k8s.logs":
                result = self.tools.k8s_logs(params.get("deployment", ""))
            elif intent == "prophet.tune":
                result = self.tools.update_prophet_config(params)
            elif intent == "metrics.query":
                result = self.tools.query_metrics(params)
            elif intent == "argo.sync":
                result = self.tools.argo_sync(params.get("app", ""))
            elif intent == "data.ingest":
                result = self.tools.ingest_data(params)
            elif intent == "anomaly.detect":
                result = self.tools.detect_anomalies(params)
            else:
                return {"error": "unsupported_intent", "message": f"Intent {intent} not implemented"}
            
            # Log action
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self._log_action(intent, params, result, execution_time)
            
            return {
                "success": True,
                "result": result,
                "execution_time_ms": execution_time * 1000,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self._log_action(intent, params, {"error": str(e)}, 0)
            return {"error": "execution_failed", "message": str(e)}

    def _validate_intent(self, intent: str) -> bool:
        """Intent doğrulama"""
        valid_intents = [
            "k8s.logs", "prophet.tune", "metrics.query", 
            "argo.sync", "data.ingest", "anomaly.detect"
        ]
        return intent in valid_intents

    def _validate_params(self, intent: str, params: Dict[str, Any]) -> bool:
        """Parametre doğrulama"""
        if intent == "k8s.logs" and not params.get("deployment"):
            return False
        if intent == "argo.sync" and not params.get("app"):
            return False
        return True

    def _log_action(self, intent: str, params: Dict[str, Any], result: Dict[str, Any], execution_time: float):
        """Audit log kaydı"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "intent": intent,
            "params": params,
            "result": result,
            "execution_time_ms": execution_time * 1000
        }
        self.audit_log.append(log_entry)
        
        # Keep only last 1000 entries
        if len(self.audit_log) > 1000:
            self.audit_log = self.audit_log[-1000:]
