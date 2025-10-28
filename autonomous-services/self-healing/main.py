from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
import logging
import time
from datetime import datetime
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EA Plan v6.0 Self-Healing API", version="1.0.0")

class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    FAILED = "failed"

class RemediationAction(str, Enum):
    RESTART_SERVICE = "restart_service"
    SCALE_UP = "scale_up"
    SCALE_DOWN = "scale_down"
    ROLLBACK_VERSION = "rollback_version"
    ENABLE_CIRCUIT_BREAKER = "enable_circuit_breaker"
    ISOLATE_SERVICE = "isolate_service"
    MIGRATE_WORKLOAD = "migrate_workload"
    ADD_RESOURCES = "add_resources"
    CLEAR_CACHE = "clear_cache"
    RESET_CONNECTION = "reset_connection"

class HealthCheck(BaseModel):
    service_name: str
    status: HealthStatus
    timestamp: datetime
    metrics: Dict[str, Any]
    issues: List[str]
    severity: str

class RemediationRequest(BaseModel):
    service_name: str
    issue_description: str
    detected_at: datetime
    remediation_actions: List[RemediationAction]
    priority: int

class RemediationResult(BaseModel):
    remediation_id: str
    service_name: str
    actions_executed: List[str]
    status: str
    execution_time_ms: float
    timestamp: datetime

class SelfHealingEngine:
    def __init__(self):
        self.health_checks = {}
        self.remediations = {}
        self.circuit_breakers = {}
        self.load_healing_policies()
    
    def load_healing_policies(self):
        """Load self-healing policies"""
        self.policies = {
            "health_thresholds": {
                "cpu_threshold": 95,
                "memory_threshold": 95,
                "error_rate_threshold": 0.05,
                "response_time_threshold": 1000,  # ms
                "availability_threshold": 0.99
            },
            "remediation_strategies": {
                "high_cpu": [RemediationAction.SCALE_UP, RemediationAction.ADD_RESOURCES],
                "high_memory": [RemediationAction.SCALE_UP, RemediationAction.ADD_RESOURCES],
                "high_error_rate": [RemediationAction.RESTART_SERVICE, RemediationAction.ROLLBACK_VERSION],
                "slow_response": [RemediationAction.SCALE_UP, RemediationAction.ADD_RESOURCES],
                "service_down": [RemediationAction.RESTART_SERVICE, RemediationAction.ROLLBACK_VERSION],
                "connection_issues": [RemediationAction.RESET_CONNECTION, RemediationAction.CLEAR_CACHE]
            },
            "circuit_breaker": {
                "failure_threshold": 5,
                "success_threshold": 2,
                "timeout_seconds": 60
            }
        }
    
    async def check_health(self, service_name: str, metrics: Dict[str, Any]) -> HealthCheck:
        """Check service health based on metrics"""
        issues = []
        severity = "low"
        
        # Check CPU utilization
        cpu_util = metrics.get("cpu_utilization", 0)
        if cpu_util > self.policies["health_thresholds"]["cpu_threshold"]:
            issues.append(f"High CPU utilization: {cpu_util}%")
            severity = "high"
        
        # Check memory utilization
        mem_util = metrics.get("memory_utilization", 0)
        if mem_util > self.policies["health_thresholds"]["memory_threshold"]:
            issues.append(f"High memory utilization: {mem_util}%")
            severity = "high"
        
        # Check error rate
        error_rate = metrics.get("error_rate", 0)
        if error_rate > self.policies["health_thresholds"]["error_rate_threshold"]:
            issues.append(f"High error rate: {error_rate}")
            severity = "critical"
        
        # Check response time
        response_time = metrics.get("response_time_ms", 0)
        if response_time > self.policies["health_thresholds"]["response_time_threshold"]:
            issues.append(f"Slow response time: {response_time}ms")
            severity = "medium" if severity == "low" else severity
        
        # Determine overall status
        if len(issues) == 0:
            status = HealthStatus.HEALTHY
        elif severity == "critical":
            status = HealthStatus.FAILED
        elif severity == "high":
            status = HealthStatus.UNHEALTHY
        else:
            status = HealthStatus.DEGRADED
        
        health_check = HealthCheck(
            service_name=service_name,
            status=status,
            timestamp=datetime.now(),
            metrics=metrics,
            issues=issues,
            severity=severity
        )
        
        self.health_checks[f"{service_name}_{int(time.time())}"] = health_check
        return health_check
    
    async def determine_remediation(self, health_check: HealthCheck) -> List[RemediationAction]:
        """Determine remediation actions based on health check"""
        actions = []
        
        # Check each issue and determine remediation
        for issue in health_check.issues:
            if "CPU" in issue:
                actions.extend(self.policies["remediation_strategies"]["high_cpu"])
            elif "memory" in issue.lower():
                actions.extend(self.policies["remediation_strategies"]["high_memory"])
            elif "error" in issue.lower():
                actions.extend(self.policies["remediation_strategies"]["high_error_rate"])
            elif "response" in issue.lower() or "slow" in issue.lower():
                actions.extend(self.policies["remediation_strategies"]["slow_response"])
            elif "connection" in issue.lower():
                actions.extend(self.policies["remediation_strategies"]["connection_issues"])
        
        # If service is failed, add restart and rollback
        if health_check.status == HealthStatus.FAILED:
            actions.extend([
                RemediationAction.RESTART_SERVICE,
                RemediationAction.ROLLBACK_VERSION
            ])
        
        # Remove duplicates and return
        return list(set(actions))
    
    async def execute_remediation(self, service_name: str, actions: List[RemediationAction]) -> RemediationResult:
        """Execute remediation actions"""
        remediation_id = f"rem_{int(time.time() * 1000)}"
        start_time = time.time()
        
        executed_actions = []
        
        try:
            for action in actions:
                # Simulate action execution
                await asyncio.sleep(0.2)
                executed_actions.append(action.value)
                
                logger.info(f"🔧 Executing {action.value} on {service_name}")
            
            # Simulate overall remediation time
            await asyncio.sleep(0.5)
            
            execution_time = (time.time() - start_time) * 1000
            
            result = RemediationResult(
                remediation_id=remediation_id,
                service_name=service_name,
                actions_executed=executed_actions,
                status="success",
                execution_time_ms=execution_time,
                timestamp=datetime.now()
            )
            
            self.remediations[remediation_id] = result
            logger.info(f"✅ Remediation {remediation_id} completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"❌ Remediation {remediation_id} failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def enable_circuit_breaker(self, service_name: str, reason: str) -> Dict[str, Any]:
        """Enable circuit breaker for a service"""
        circuit_breaker = {
            "service_name": service_name,
            "status": "open",
            "reason": reason,
            "enabled_at": datetime.now(),
            "failure_count": 0,
            "success_count": 0
        }
        
        self.circuit_breakers[service_name] = circuit_breaker
        logger.warning(f"⚠️ Circuit breaker opened for {service_name}: {reason}")
        
        return circuit_breaker
    
    async def check_circuit_breaker(self, service_name: str) -> bool:
        """Check if circuit breaker is enabled for a service"""
        if service_name in self.circuit_breakers:
            breaker = self.circuit_breakers[service_name]
            
            # Check if we should try to close the circuit
            if breaker["success_count"] >= self.policies["circuit_breaker"]["success_threshold"]:
                breaker["status"] = "closed"
                logger.info(f"✅ Circuit breaker closed for {service_name}")
                return False
            
            return breaker["status"] == "open"
        
        return False

# Initialize engine
healing_engine = SelfHealingEngine()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "self-healing",
        "total_health_checks": len(healing_engine.health_checks),
        "total_remediations": len(healing_engine.remediations),
        "active_circuit_breakers": len([cb for cb in healing_engine.circuit_breakers.values() if cb["status"] == "open"]),
        "version": "1.0.0"
    }

@app.post("/check/{service_name}", response_model=HealthCheck)
async def check_service_health(service_name: str, metrics: Dict[str, Any]):
    """Check service health"""
    try:
        health_check = await healing_engine.check_health(service_name, metrics)
        return health_check
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/remediate", response_model=RemediationResult)
async def remediate_service(service_name: str, metrics: Dict[str, Any]):
    """Automatically detect and remediate service issues"""
    try:
        # Check service health
        health_check = await healing_engine.check_health(service_name, metrics)
        
        # If healthy, no remediation needed
        if health_check.status == HealthStatus.HEALTHY:
            return RemediationResult(
                remediation_id="none",
                service_name=service_name,
                actions_executed=[],
                status="no_action_needed",
                execution_time_ms=0,
                timestamp=datetime.now()
            )
        
        # Determine remediation actions
        actions = await healing_engine.determine_remediation(health_check)
        
        # Execute remediation
        result = await healing_engine.execute_remediation(service_name, actions)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/circuit-breaker/enable")
async def enable_circuit_breaker(service_name: str, reason: str):
    """Enable circuit breaker for a service"""
    try:
        result = await healing_engine.enable_circuit_breaker(service_name, reason)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/circuit-breaker/status/{service_name}")
async def get_circuit_breaker_status(service_name: str):
    """Get circuit breaker status for a service"""
    if service_name in healing_engine.circuit_breakers:
        return healing_engine.circuit_breakers[service_name]
    return {"status": "closed", "service_name": service_name}

@app.get("/health-checks")
async def get_health_checks():
    """Get all health checks"""
    return {
        "health_checks": [
            {
                "service_name": hc.service_name,
                "status": hc.status,
                "timestamp": hc.timestamp.isoformat(),
                "issues": hc.issues,
                "severity": hc.severity
            }
            for hc in healing_engine.health_checks.values()
        ],
        "total_count": len(healing_engine.health_checks)
    }

@app.get("/remediations")
async def get_remediations():
    """Get all remediations"""
    return {
        "remediations": [
            {
                "remediation_id": rem.remediation_id,
                "service_name": rem.service_name,
                "actions_executed": rem.actions_executed,
                "status": rem.status,
                "execution_time_ms": rem.execution_time_ms,
                "timestamp": rem.timestamp.isoformat()
            }
            for rem in healing_engine.remediations.values()
        ],
        "total_count": len(healing_engine.remediations)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
