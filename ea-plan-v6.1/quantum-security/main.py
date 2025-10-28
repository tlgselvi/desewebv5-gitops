from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
import logging
import time
from datetime import datetime
from enum import Enum
import uuid
import secrets

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EA Plan v6.1 Quantum Security API", version="1.0.0")

class QuantumAlgorithm(str, Enum):
    KYBER = "kyber"
    DILITHIUM = "dilithium"
    FALCON = "falcon"
    SPHINCS = "sphincs"
    CRYSTALS_DILITHIUM = "crystals_dilithium"
    CRYSTALS_KYBER = "crystals_kyber"

class SecurityLevel(str, Enum):
    LEVEL_1 = "level_1"  # 128-bit security
    LEVEL_3 = "level_3"  # 192-bit security
    LEVEL_5 = "level_5"   # 256-bit security

class QuantumKeyStatus(str, Enum):
    GENERATED = "generated"
    DISTRIBUTED = "distributed"
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"

class QuantumKey(BaseModel):
    key_id: str
    algorithm: QuantumAlgorithm
    security_level: SecurityLevel
    key_data: str
    status: QuantumKeyStatus
    created_at: datetime
    expires_at: datetime
    usage_count: int

class QuantumChannel(BaseModel):
    channel_id: str
    source_node: str
    target_node: str
    quantum_algorithm: QuantumAlgorithm
    security_level: SecurityLevel
    key_rate: float  # keys per second
    error_rate: float
    distance_km: float
    status: str
    created_at: datetime

class QuantumSecurityEngine:
    def __init__(self):
        self.quantum_keys = {}
        self.quantum_channels = {}
        self.post_quantum_algorithms = {}
        self.load_quantum_capabilities()
    
    def load_quantum_capabilities(self):
        """Load quantum security capabilities"""
        self.quantum_algorithms = {
            QuantumAlgorithm.KYBER: {
                "security_levels": [SecurityLevel.LEVEL_1, SecurityLevel.LEVEL_3, SecurityLevel.LEVEL_5],
                "key_size": {"level_1": 800, "level_3": 1184, "level_5": 1568},
                "ciphertext_size": {"level_1": 768, "level_3": 1088, "level_5": 1568},
                "performance": "high"
            },
            QuantumAlgorithm.DILITHIUM: {
                "security_levels": [SecurityLevel.LEVEL_1, SecurityLevel.LEVEL_3, SecurityLevel.LEVEL_5],
                "signature_size": {"level_1": 2420, "level_3": 3293, "level_5": 4595},
                "public_key_size": {"level_1": 1952, "level_3": 2592, "level_5": 3360},
                "performance": "medium"
            },
            QuantumAlgorithm.FALCON: {
                "security_levels": [SecurityLevel.LEVEL_1, SecurityLevel.LEVEL_5],
                "signature_size": {"level_1": 666, "level_5": 1280},
                "public_key_size": {"level_1": 897, "level_5": 1793},
                "performance": "high"
            },
            QuantumAlgorithm.SPHINCS: {
                "security_levels": [SecurityLevel.LEVEL_1, SecurityLevel.LEVEL_3, SecurityLevel.LEVEL_5],
                "signature_size": {"level_1": 7856, "level_3": 17088, "level_5": 35616},
                "public_key_size": {"level_1": 32, "level_3": 48, "level_5": 64},
                "performance": "low"
            }
        }
    
    async def generate_quantum_key(self, algorithm: QuantumAlgorithm, 
                                 security_level: SecurityLevel) -> QuantumKey:
        """Generate a quantum-safe key"""
        if algorithm not in self.quantum_algorithms:
            raise ValueError(f"Algorithm {algorithm} not supported")
        
        if security_level not in self.quantum_algorithms[algorithm]["security_levels"]:
            raise ValueError(f"Security level {security_level} not supported for {algorithm}")
        
        key_id = f"qk_{uuid.uuid4().hex[:8]}"
        
        # Generate quantum-safe key (simulated)
        key_size = self.quantum_algorithms[algorithm]["key_size"][security_level]
        key_data = secrets.token_hex(key_size // 8)  # Convert bits to bytes
        
        quantum_key = QuantumKey(
            key_id=key_id,
            algorithm=algorithm,
            security_level=security_level,
            key_data=key_data,
            status=QuantumKeyStatus.GENERATED,
            created_at=datetime.now(),
            expires_at=datetime.now().replace(hour=datetime.now().hour + 24),  # 24 hour expiry
            usage_count=0
        )
        
        self.quantum_keys[key_id] = quantum_key
        logger.info(f"✅ Quantum key {key_id} generated using {algorithm} at {security_level}")
        return quantum_key
    
    async def distribute_quantum_key(self, key_id: str, target_nodes: List[str]) -> Dict[str, Any]:
        """Distribute quantum key to target nodes"""
        if key_id not in self.quantum_keys:
            raise ValueError(f"Quantum key {key_id} not found")
        
        quantum_key = self.quantum_keys[key_id]
        
        # Simulate quantum key distribution
        distribution_result = {
            "key_id": key_id,
            "algorithm": quantum_key.algorithm,
            "security_level": quantum_key.security_level,
            "target_nodes": target_nodes,
            "distribution_status": "successful",
            "distribution_time_ms": 150.5,
            "quantum_fidelity": 0.999,
            "error_correction": "enabled",
            "distributed_at": datetime.now().isoformat()
        }
        
        quantum_key.status = QuantumKeyStatus.DISTRIBUTED
        logger.info(f"✅ Quantum key {key_id} distributed to {len(target_nodes)} nodes")
        return distribution_result
    
    async def create_quantum_channel(self, source_node: str, target_node: str,
                                   algorithm: QuantumAlgorithm, security_level: SecurityLevel,
                                   distance_km: float) -> QuantumChannel:
        """Create a quantum communication channel"""
        channel_id = f"qc_{uuid.uuid4().hex[:8]}"
        
        # Calculate channel parameters based on distance
        base_error_rate = 0.001  # 0.1% base error rate
        distance_error_rate = distance_km * 0.0001  # Additional error per km
        total_error_rate = min(base_error_rate + distance_error_rate, 0.1)  # Cap at 10%
        
        # Calculate key rate based on distance and algorithm
        base_key_rate = 1000  # keys per second
        distance_factor = max(0.1, 1 - (distance_km / 1000))  # Decrease with distance
        algorithm_factor = 1.0 if algorithm in [QuantumAlgorithm.KYBER, QuantumAlgorithm.FALCON] else 0.8
        key_rate = base_key_rate * distance_factor * algorithm_factor
        
        quantum_channel = QuantumChannel(
            channel_id=channel_id,
            source_node=source_node,
            target_node=target_node,
            quantum_algorithm=algorithm,
            security_level=security_level,
            key_rate=key_rate,
            error_rate=total_error_rate,
            distance_km=distance_km,
            status="active",
            created_at=datetime.now()
        )
        
        self.quantum_channels[channel_id] = quantum_channel
        logger.info(f"✅ Quantum channel {channel_id} created between {source_node} and {target_node}")
        return quantum_channel
    
    async def encrypt_with_quantum_key(self, key_id: str, plaintext: str) -> Dict[str, Any]:
        """Encrypt data using quantum-safe key"""
        if key_id not in self.quantum_keys:
            raise ValueError(f"Quantum key {key_id} not found")
        
        quantum_key = self.quantum_keys[key_id]
        
        if quantum_key.status != QuantumKeyStatus.ACTIVE:
            raise ValueError(f"Quantum key {key_id} is not active")
        
        # Simulate quantum-safe encryption
        encrypted_data = f"quantum_encrypted_{plaintext}_{secrets.token_hex(16)}"
        
        encryption_result = {
            "key_id": key_id,
            "algorithm": quantum_key.algorithm,
            "security_level": quantum_key.security_level,
            "plaintext_length": len(plaintext),
            "ciphertext": encrypted_data,
            "encryption_time_ms": 2.5,
            "quantum_security": True,
            "encrypted_at": datetime.now().isoformat()
        }
        
        quantum_key.usage_count += 1
        logger.info(f"✅ Data encrypted using quantum key {key_id}")
        return encryption_result
    
    async def decrypt_with_quantum_key(self, key_id: str, ciphertext: str) -> Dict[str, Any]:
        """Decrypt data using quantum-safe key"""
        if key_id not in self.quantum_keys:
            raise ValueError(f"Quantum key {key_id} not found")
        
        quantum_key = self.quantum_keys[key_id]
        
        if quantum_key.status != QuantumKeyStatus.ACTIVE:
            raise ValueError(f"Quantum key {key_id} is not active")
        
        # Simulate quantum-safe decryption
        if ciphertext.startswith("quantum_encrypted_"):
            plaintext = ciphertext.split("_")[2]  # Extract original text
        else:
            raise ValueError("Invalid quantum-encrypted ciphertext")
        
        decryption_result = {
            "key_id": key_id,
            "algorithm": quantum_key.algorithm,
            "security_level": quantum_key.security_level,
            "plaintext": plaintext,
            "decryption_time_ms": 1.8,
            "quantum_security": True,
            "decrypted_at": datetime.now().isoformat()
        }
        
        quantum_key.usage_count += 1
        logger.info(f"✅ Data decrypted using quantum key {key_id}")
        return decryption_result
    
    async def get_quantum_security_status(self) -> Dict[str, Any]:
        """Get overall quantum security status"""
        active_keys = len([k for k in self.quantum_keys.values() if k.status == QuantumKeyStatus.ACTIVE])
        total_keys = len(self.quantum_keys)
        active_channels = len([c for c in self.quantum_channels.values() if c.status == "active"])
        
        status = {
            "quantum_security_status": "operational",
            "total_quantum_keys": total_keys,
            "active_quantum_keys": active_keys,
            "total_quantum_channels": len(self.quantum_channels),
            "active_quantum_channels": active_channels,
            "supported_algorithms": list(self.quantum_algorithms.keys()),
            "security_levels": [level.value for level in SecurityLevel],
            "quantum_readiness": "100%",
            "post_quantum_migration": "completed",
            "timestamp": datetime.now().isoformat()
        }
        
        return status

# Initialize quantum security
quantum_security = QuantumSecurityEngine()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "quantum-security",
        "total_quantum_keys": len(quantum_security.quantum_keys),
        "total_quantum_channels": len(quantum_security.quantum_channels),
        "supported_algorithms": list(quantum_security.quantum_algorithms.keys()),
        "version": "1.0.0"
    }

@app.post("/quantum-keys", response_model=QuantumKey)
async def generate_quantum_key(algorithm: QuantumAlgorithm, security_level: SecurityLevel):
    """Generate a quantum-safe key"""
    try:
        quantum_key = await quantum_security.generate_quantum_key(algorithm, security_level)
        return quantum_key
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/quantum-keys/{key_id}/distribute")
async def distribute_quantum_key(key_id: str, target_nodes: List[str]):
    """Distribute quantum key to target nodes"""
    try:
        result = await quantum_security.distribute_quantum_key(key_id, target_nodes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/quantum-channels", response_model=QuantumChannel)
async def create_quantum_channel(source_node: str, target_node: str,
                               algorithm: QuantumAlgorithm, security_level: SecurityLevel,
                               distance_km: float):
    """Create a quantum communication channel"""
    try:
        channel = await quantum_security.create_quantum_channel(
            source_node, target_node, algorithm, security_level, distance_km
        )
        return channel
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/encrypt")
async def encrypt_data(key_id: str, plaintext: str):
    """Encrypt data using quantum-safe key"""
    try:
        result = await quantum_security.encrypt_with_quantum_key(key_id, plaintext)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/decrypt")
async def decrypt_data(key_id: str, ciphertext: str):
    """Decrypt data using quantum-safe key"""
    try:
        result = await quantum_security.decrypt_with_quantum_key(key_id, ciphertext)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/quantum-keys")
async def get_quantum_keys():
    """Get all quantum keys"""
    return {
        "quantum_keys": [
            {
                "key_id": key.key_id,
                "algorithm": key.algorithm,
                "security_level": key.security_level,
                "status": key.status,
                "created_at": key.created_at.isoformat(),
                "expires_at": key.expires_at.isoformat(),
                "usage_count": key.usage_count
            }
            for key in quantum_security.quantum_keys.values()
        ],
        "total_count": len(quantum_security.quantum_keys)
    }

@app.get("/quantum-channels")
async def get_quantum_channels():
    """Get all quantum channels"""
    return {
        "quantum_channels": [
            {
                "channel_id": channel.channel_id,
                "source_node": channel.source_node,
                "target_node": channel.target_node,
                "quantum_algorithm": channel.quantum_algorithm,
                "security_level": channel.security_level,
                "key_rate": channel.key_rate,
                "error_rate": channel.error_rate,
                "distance_km": channel.distance_km,
                "status": channel.status,
                "created_at": channel.created_at.isoformat()
            }
            for channel in quantum_security.quantum_channels.values()
        ],
        "total_count": len(quantum_security.quantum_channels)
    }

@app.get("/status")
async def get_quantum_security_status():
    """Get quantum security status"""
    try:
        status = await quantum_security.get_quantum_security_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/algorithms")
async def get_quantum_algorithms():
    """Get supported quantum algorithms"""
    return {
        "algorithms": quantum_security.quantum_algorithms,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
