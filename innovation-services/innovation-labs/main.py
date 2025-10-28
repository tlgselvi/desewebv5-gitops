from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
import logging
import time
from datetime import datetime
from enum import Enum
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EA Plan v6.0 Innovation Labs API", version="1.0.0")

class LabType(str, Enum):
    AI_ML_LAB = "ai_ml_lab"
    QUANTUM_LAB = "quantum_lab"
    BLOCKCHAIN_LAB = "blockchain_lab"
    EDGE_LAB = "edge_lab"
    IOT_LAB = "iot_lab"
    METAVERSE_LAB = "metaverse_lab"
    GREEN_TECH_LAB = "green_tech_lab"
    CYBERSECURITY_LAB = "cybersecurity_lab"

class LabStatus(str, Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"

class SandboxStatus(str, Enum):
    CREATING = "creating"
    READY = "ready"
    RUNNING = "running"
    STOPPED = "stopped"
    DESTROYED = "destroyed"

class InnovationLab(BaseModel):
    lab_id: str
    name: str
    lab_type: LabType
    status: LabStatus
    capacity: int
    current_users: int
    resources: Dict[str, Any]
    tools: List[str]
    created_at: datetime

class SandboxEnvironment(BaseModel):
    sandbox_id: str
    lab_id: str
    name: str
    description: str
    status: SandboxStatus
    environment_type: str
    resources: Dict[str, Any]
    configuration: Dict[str, Any]
    created_at: datetime
    expires_at: Optional[datetime]

class InnovationLabs:
    def __init__(self):
        self.labs = {}
        self.sandboxes = {}
        self.load_lab_capabilities()
        self.initialize_labs()
    
    def load_lab_capabilities(self):
        """Load innovation lab capabilities"""
        self.lab_capabilities = {
            LabType.AI_ML_LAB: {
                "tools": ["jupyter", "tensorflow", "pytorch", "scikit-learn", "mlflow", "kubeflow"],
                "resources": {"gpu": 4, "cpu": 16, "memory": "64GB", "storage": "1TB"},
                "environments": ["python", "r", "julia", "spark"]
            },
            LabType.QUANTUM_LAB: {
                "tools": ["qiskit", "cirq", "braket", "pennylane", "quantum-network"],
                "resources": {"quantum-processor": 2, "quantum-simulator": 8, "cpu": 32, "memory": "128GB"},
                "environments": ["quantum-circuit", "quantum-algorithm", "quantum-simulation"]
            },
            LabType.BLOCKCHAIN_LAB: {
                "tools": ["truffle", "hardhat", "substrate", "tendermint", "web3"],
                "resources": {"blockchain-node": 10, "storage": "2TB", "network": "high-speed"},
                "environments": ["ethereum", "hyperledger", "polkadot", "cosmos"]
            },
            LabType.EDGE_LAB: {
                "tools": ["k3s", "microk8s", "edgex-foundry", "azure-iot", "aws-greengrass"],
                "resources": {"edge-device": 20, "edge-gateway": 5, "cloud-connectivity": "5G"},
                "environments": ["kubernetes-edge", "docker-edge", "iot-platform"]
            },
            LabType.IOT_LAB: {
                "tools": ["arduino", "raspberry-pi", "mqtt", "coap", "opc-ua"],
                "resources": {"sensors": 100, "actuators": 50, "gateways": 10},
                "environments": ["iot-platform", "sensor-simulator", "device-management"]
            },
            LabType.METAVERSE_LAB: {
                "tools": ["unity3d", "unreal-engine", "three.js", "aframe", "webxr"],
                "resources": {"vr-headset": 8, "ar-device": 12, "3d-rendering": "high-performance"},
                "environments": ["unity", "unreal", "webxr", "vr-platform"]
            },
            LabType.GREEN_TECH_LAB: {
                "tools": ["energy-monitor", "carbon-tracker", "sustainability-metrics"],
                "resources": {"solar-panel": 20, "wind-turbine": 5, "energy-storage": "10kWh"},
                "environments": ["renewable-energy", "carbon-capture", "sustainability"]
            },
            LabType.CYBERSECURITY_LAB: {
                "tools": ["penetration-testing", "vulnerability-scanner", "threat-detection"],
                "resources": {"security-tools": 50, "test-environment": "isolated", "monitoring": "24/7"},
                "environments": ["penetration-testing", "vulnerability-assessment", "threat-simulation"]
            }
        }
    
    def initialize_labs(self):
        """Initialize innovation labs"""
        for lab_type in LabType:
            lab_id = f"lab_{lab_type.value}"
            capabilities = self.lab_capabilities[lab_type]
            
            lab = InnovationLab(
                lab_id=lab_id,
                name=f"{lab_type.value.replace('_', ' ').title()}",
                lab_type=lab_type,
                status=LabStatus.AVAILABLE,
                capacity=10,
                current_users=0,
                resources=capabilities["resources"],
                tools=capabilities["tools"],
                created_at=datetime.now()
            )
            
            self.labs[lab_id] = lab
    
    async def create_sandbox(self, lab_id: str, name: str, description: str,
                           environment_type: str, configuration: Dict[str, Any],
                           duration_hours: int = 24) -> SandboxEnvironment:
        """Create a sandbox environment"""
        if lab_id not in self.labs:
            raise ValueError(f"Lab {lab_id} not found")
        
        lab = self.labs[lab_id]
        if lab.status != LabStatus.AVAILABLE:
            raise ValueError(f"Lab {lab_id} is not available")
        
        sandbox_id = f"sandbox_{uuid.uuid4().hex[:8]}"
        
        # Determine resources based on lab type and configuration
        lab_capabilities = self.lab_capabilities[lab.lab_type]
        resources = lab_capabilities["resources"].copy()
        
        # Adjust resources based on configuration
        if "gpu" in configuration:
            resources["gpu"] = min(resources.get("gpu", 0), configuration["gpu"])
        if "cpu" in configuration:
            resources["cpu"] = min(resources.get("cpu", 0), configuration["cpu"])
        
        expires_at = datetime.now().replace(hour=datetime.now().hour + duration_hours)
        
        sandbox = SandboxEnvironment(
            sandbox_id=sandbox_id,
            lab_id=lab_id,
            name=name,
            description=description,
            status=SandboxStatus.CREATING,
            environment_type=environment_type,
            resources=resources,
            configuration=configuration,
            created_at=datetime.now(),
            expires_at=expires_at
        )
        
        self.sandboxes[sandbox_id] = sandbox
        
        # Simulate sandbox creation
        await asyncio.sleep(1)
        sandbox.status = SandboxStatus.READY
        
        logger.info(f"✅ Sandbox {sandbox_id} created in lab {lab_id}")
        return sandbox
    
    async def start_sandbox(self, sandbox_id: str) -> Dict[str, Any]:
        """Start a sandbox environment"""
        if sandbox_id not in self.sandboxes:
            raise ValueError(f"Sandbox {sandbox_id} not found")
        
        sandbox = self.sandboxes[sandbox_id]
        if sandbox.status != SandboxStatus.READY:
            raise ValueError(f"Sandbox {sandbox_id} is not ready")
        
        sandbox.status = SandboxStatus.RUNNING
        
        # Simulate sandbox startup
        await asyncio.sleep(0.5)
        
        logger.info(f"✅ Sandbox {sandbox_id} started")
        return {
            "sandbox_id": sandbox_id,
            "status": "running",
            "access_url": f"https://sandbox-{sandbox_id}.innovation-labs.com",
            "ssh_endpoint": f"ssh://sandbox-{sandbox_id}.innovation-labs.com:22"
        }
    
    async def stop_sandbox(self, sandbox_id: str) -> Dict[str, Any]:
        """Stop a sandbox environment"""
        if sandbox_id not in self.sandboxes:
            raise ValueError(f"Sandbox {sandbox_id} not found")
        
        sandbox = self.sandboxes[sandbox_id]
        sandbox.status = SandboxStatus.STOPPED
        
        logger.info(f"✅ Sandbox {sandbox_id} stopped")
        return {
            "sandbox_id": sandbox_id,
            "status": "stopped",
            "stopped_at": datetime.now().isoformat()
        }
    
    async def destroy_sandbox(self, sandbox_id: str) -> Dict[str, Any]:
        """Destroy a sandbox environment"""
        if sandbox_id not in self.sandboxes:
            raise ValueError(f"Sandbox {sandbox_id} not found")
        
        sandbox = self.sandboxes[sandbox_id]
        sandbox.status = SandboxStatus.DESTROYED
        
        # Remove from active sandboxes
        del self.sandboxes[sandbox_id]
        
        logger.info(f"✅ Sandbox {sandbox_id} destroyed")
        return {
            "sandbox_id": sandbox_id,
            "status": "destroyed",
            "destroyed_at": datetime.now().isoformat()
        }
    
    async def get_lab_utilization(self, lab_id: str) -> Dict[str, Any]:
        """Get lab utilization metrics"""
        if lab_id not in self.labs:
            raise ValueError(f"Lab {lab_id} not found")
        
        lab = self.labs[lab_id]
        lab_sandboxes = [sb for sb in self.sandboxes.values() if sb.lab_id == lab_id]
        
        active_sandboxes = [sb for sb in lab_sandboxes if sb.status == SandboxStatus.RUNNING]
        
        utilization = {
            "lab_id": lab_id,
            "lab_name": lab.name,
            "total_capacity": lab.capacity,
            "active_sandboxes": len(active_sandboxes),
            "utilization_percentage": (len(active_sandboxes) / lab.capacity) * 100,
            "available_slots": lab.capacity - len(active_sandboxes),
            "resource_usage": {
                "cpu": f"{len(active_sandboxes) * 2}/{lab.resources.get('cpu', 0)} cores",
                "memory": f"{len(active_sandboxes) * 4}/{lab.resources.get('memory', '0GB')}",
                "gpu": f"{len(active_sandboxes)}/{lab.resources.get('gpu', 0)} GPUs"
            }
        }
        
        return utilization

# Initialize labs
innovation_labs = InnovationLabs()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "innovation-labs",
        "total_labs": len(innovation_labs.labs),
        "total_sandboxes": len(innovation_labs.sandboxes),
        "available_labs": len([lab for lab in innovation_labs.labs.values() if lab.status == LabStatus.AVAILABLE]),
        "version": "1.0.0"
    }

@app.get("/labs")
async def get_labs():
    """Get all innovation labs"""
    return {
        "labs": [
            {
                "lab_id": lab.lab_id,
                "name": lab.name,
                "lab_type": lab.lab_type,
                "status": lab.status,
                "capacity": lab.capacity,
                "current_users": lab.current_users,
                "tools": lab.tools,
                "created_at": lab.created_at.isoformat()
            }
            for lab in innovation_labs.labs.values()
        ],
        "total_count": len(innovation_labs.labs)
    }

@app.get("/labs/{lab_id}")
async def get_lab(lab_id: str):
    """Get specific lab details"""
    if lab_id not in innovation_labs.labs:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    lab = innovation_labs.labs[lab_id]
    return {
        "lab": {
            "lab_id": lab.lab_id,
            "name": lab.name,
            "lab_type": lab.lab_type,
            "status": lab.status,
            "capacity": lab.capacity,
            "current_users": lab.current_users,
            "resources": lab.resources,
            "tools": lab.tools,
            "created_at": lab.created_at.isoformat()
        }
    }

@app.post("/sandboxes", response_model=SandboxEnvironment)
async def create_sandbox(lab_id: str, name: str, description: str,
                        environment_type: str, configuration: Dict[str, Any],
                        duration_hours: int = 24):
    """Create a sandbox environment"""
    try:
        sandbox = await innovation_labs.create_sandbox(
            lab_id, name, description, environment_type, configuration, duration_hours
        )
        return sandbox
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sandboxes/{sandbox_id}/start")
async def start_sandbox(sandbox_id: str):
    """Start a sandbox environment"""
    try:
        result = await innovation_labs.start_sandbox(sandbox_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sandboxes/{sandbox_id}/stop")
async def stop_sandbox(sandbox_id: str):
    """Stop a sandbox environment"""
    try:
        result = await innovation_labs.stop_sandbox(sandbox_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/sandboxes/{sandbox_id}")
async def destroy_sandbox(sandbox_id: str):
    """Destroy a sandbox environment"""
    try:
        result = await innovation_labs.destroy_sandbox(sandbox_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sandboxes")
async def get_sandboxes():
    """Get all sandbox environments"""
    return {
        "sandboxes": [
            {
                "sandbox_id": sb.sandbox_id,
                "lab_id": sb.lab_id,
                "name": sb.name,
                "status": sb.status,
                "environment_type": sb.environment_type,
                "created_at": sb.created_at.isoformat(),
                "expires_at": sb.expires_at.isoformat() if sb.expires_at else None
            }
            for sb in innovation_labs.sandboxes.values()
        ],
        "total_count": len(innovation_labs.sandboxes)
    }

@app.get("/labs/{lab_id}/utilization")
async def get_lab_utilization(lab_id: str):
    """Get lab utilization metrics"""
    try:
        utilization = await innovation_labs.get_lab_utilization(lab_id)
        return utilization
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/capabilities")
async def get_lab_capabilities():
    """Get lab capabilities"""
    return {
        "capabilities": {
            lab_type.value: capabilities
            for lab_type, capabilities in innovation_labs.lab_capabilities.items()
        },
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
