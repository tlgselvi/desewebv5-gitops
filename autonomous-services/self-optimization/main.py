from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
import time
import asyncio
from datetime import datetime
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EA Plan v6.0 Self-Optimization API", version="1.0.0")

class OptimizationType(str, Enum):
    PERFORMANCE = "performance"
    COST = "cost"
    RESOURCE_UTILIZATION = "resource_utilization"
    ENERGY_EFFICIENCY = "energy_efficiency"
    WORKLOAD_BALANCING = "workload_balancing"

class OptimizationRecommendation(BaseModel):
    recommendation_id: str
    resource_name: str
    optimization_type: OptimizationType
    current_state: Dict[str, Any]
    recommended_state: Dict[str, Any]
    expected_improvement: Dict[str, float]
    confidence: float
    timestamp: datetime

class OptimizationResult(BaseModel):
    optimization_id: str
    resource_name: str
    optimizations_applied: List[str]
    before_state: Dict[str, Any]
    after_state: Dict[str, Any]
    improvement_achieved: Dict[str, float]
    timestamp: datetime

class SelfOptimizationEngine:
    def __init__(self):
        self.recommendations = {}
        self.optimizations = {}
        self.load_optimization_policies()
    
    def load_optimization_policies(self):
        """Load self-optimization policies"""
        self.policies = {
            "performance": {
                "target_p95_latency": 100,  # ms
                "target_p99_latency": 200,  # ms
                "target_throughput": 1000,  # req/s
                "optimization_strategies": ["scale_up", "add_cache", "optimize_query"]
            },
            "cost": {
                "max_monthly_cost": 10000,
                "cost_reduction_target": 0.25,
                "optimization_strategies": ["right_size", "reserve_instances", "remove_unused"]
            },
            "resource_utilization": {
                "target_cpu_util": 70,
                "target_mem_util": 75,
                "target_disk_util": 80,
                "optimization_strategies": ["rebalance_workload", "consolidate_resources"]
            },
            "energy_efficiency": {
                "target_power_performance_ratio": 0.5,
                "optimization_strategies": ["scale_down", "disable_unused", "optimize_schedule"]
            }
        }
    
    async def analyze_performance(self, resource_name: str, metrics: Dict[str, Any]) -> List[OptimizationRecommendation]:
        """Analyze performance and recommend optimizations"""
        recommendations = []
        
        p95_latency = metrics.get("p95_latency_ms", 0)
        p99_latency = metrics.get("p99_latency_ms", 0)
        throughput = metrics.get("throughput_req_s", 0)
        
        policy = self.policies["performance"]
        
        # Check latency and suggest optimization
        if p95_latency > policy["target_p95_latency"]:
            rec = OptimizationRecommendation(
                recommendation_id=f"perf_{int(time.time() * 1000)}",
                resource_name=resource_name,
                optimization_type=OptimizationType.PERFORMANCE,
                current_state={"p95_latency_ms": p95_latency},
                recommended_state={"scale_up": True, "add_cache": True},
                expected_improvement={"latency_reduction_percent": 30, "throughput_increase_percent": 20},
                confidence=0.85,
                timestamp=datetime.now()
            )
            recommendations.append(rec)
        
        # Check throughput and suggest optimization
        if throughput < policy["target_throughput"]:
            rec = OptimizationRecommendation(
                recommendation_id=f"perf_{int(time.time() * 1000) + 1}",
                resource_name=resource_name,
                optimization_type=OptimizationType.PERFORMANCE,
                current_state={"throughput_req_s": throughput},
                recommended_state={"scale_up": True, "optimize_query": True},
                expected_improvement={"throughput_increase_percent": 40, "resource_utilization_increase_percent": 15},
                confidence=0.80,
                timestamp=datetime.now()
            )
            recommendations.append(rec)
        
        return recommendations
    
    async def analyze_cost(self, resource_name: str, current_cost: float, metrics: Dict[str, Any]) -> List[OptimizationRecommendation]:
        """Analyze cost and recommend optimizations"""
        recommendations = []
        
        policy = self.policies["cost"]
        
        # Check if over budget
        if current_cost > policy["max_monthly_cost"]:
            rec = OptimizationRecommendation(
                recommendation_id=f"cost_{int(time.time() * 1000)}",
                resource_name=resource_name,
                optimization_type=OptimizationType.COST,
                current_state={"monthly_cost": current_cost},
                recommended_state={"right_size": True, "reserve_instances": True},
                expected_improvement={"cost_reduction_percent": 30, "resource_efficiency_increase_percent": 20},
                confidence=0.90,
                timestamp=datetime.now()
            )
            recommendations.append(rec)
        
        return recommendations
    
    async def analyze_resource_utilization(self, resource_name: str, metrics: Dict[str, Any]) -> List[OptimizationRecommendation]:
        """Analyze resource utilization and recommend optimizations"""
        recommendations = []
        
        cpu_util = metrics.get("cpu_utilization", 0)
        mem_util = metrics.get("memory_utilization", 0)
        disk_util = metrics.get("disk_utilization", 0)
        
        policy = self.policies["resource_utilization"]
        
        # Check underutilization
        if cpu_util < 50 or mem_util < 50:
            rec = OptimizationRecommendation(
                recommendation_id=f"util_{int(time.time() * 1000)}",
                resource_name=resource_name,
                optimization_type=OptimizationType.RESOURCE_UTILIZATION,
                current_state={"cpu_util": cpu_util, "mem_util": mem_util},
                recommended_state={"rebalance_workload": True, "consolidate_resources": True},
                expected_improvement={"utilization_increase_percent": 40, "cost_reduction_percent": 25},
                confidence=0.85,
                timestamp=datetime.now()
            )
            recommendations.append(rec)
        
        return recommendations
    
    async def apply_optimization(self, recommendation: OptimizationRecommendation) -> OptimizationResult:
        """Apply an optimization recommendation"""
        optimization_id = f"opt_{int(time.time() * 1000)}"
        
        # Simulate optimization execution
        await asyncio.sleep(0.5)
        
        # Calculate expected improvement
        improvements = {}
        for metric, value in recommendation.expected_improvement.items():
            improvements[metric] = value * 0.9  # Assume 90% of expected improvement
        
        result = OptimizationResult(
            optimization_id=optimization_id,
            resource_name=recommendation.resource_name,
            optimizations_applied=[k for k, v in recommendation.recommended_state.items() if v],
            before_state=recommendation.current_state,
            after_state={k: v * 0.9 if isinstance(v, (int, float)) else v for k, v in recommendation.current_state.items()},
            improvement_achieved=improvements,
            timestamp=datetime.now()
        )
        
        self.optimizations[optimization_id] = result
        logger.info(f"✅ Optimization {optimization_id} applied successfully")
        
        return result
    
    async def comprehensive_analysis(self, resource_name: str, metrics: Dict[str, Any], current_cost: float = 0) -> Dict[str, Any]:
        """Perform comprehensive optimization analysis"""
        all_recommendations = []
        
        # Performance analysis
        perf_recs = await self.analyze_performance(resource_name, metrics)
        all_recommendations.extend(perf_recs)
        
        # Cost analysis
        cost_recs = await self.analyze_cost(resource_name, current_cost, metrics)
        all_recommendations.extend(cost_recs)
        
        # Resource utilization analysis
        util_recs = await self.analyze_resource_utilization(resource_name, metrics)
        all_recommendations.extend(util_recs)
        
        return {
            "resource_name": resource_name,
            "total_recommendations": len(all_recommendations),
            "recommendations": [
                {
                    "recommendation_id": rec.recommendation_id,
                    "optimization_type": rec.optimization_type,
                    "current_state": rec.current_state,
                    "recommended_state": rec.recommended_state,
                    "expected_improvement": rec.expected_improvement,
                    "confidence": rec.confidence
                }
                for rec in all_recommendations
            ],
            "priority_recommendations": sorted(all_recommendations, key=lambda x: x.confidence, reverse=True)[:3],
            "timestamp": datetime.now().isoformat()
        }

# Initialize engine
optimizer = SelfOptimizationEngine()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "self-optimization",
        "total_recommendations": len(optimizer.recommendations),
        "total_optimizations": len(optimizer.optimizations),
        "version": "1.0.0"
    }

@app.post("/analyze/performance")
async def analyze_performance(resource_name: str, metrics: Dict[str, Any]):
    """Analyze performance and recommend optimizations"""
    try:
        recommendations = await optimizer.analyze_performance(resource_name, metrics)
        return {
            "recommendations": recommendations,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/cost")
async def analyze_cost(resource_name: str, current_cost: float, metrics: Dict[str, Any]):
    """Analyze cost and recommend optimizations"""
    try:
        recommendations = await optimizer.analyze_cost(resource_name, current_cost, metrics)
        return {
            "recommendations": recommendations,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/utilization")
async def analyze_utilization(resource_name: str, metrics: Dict[str, Any]):
    """Analyze resource utilization and recommend optimizations"""
    try:
        recommendations = await optimizer.analyze_resource_utilization(resource_name, metrics)
        return {
            "recommendations": recommendations,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/comprehensive")
async def comprehensive_analysis(resource_name: str, metrics: Dict[str, Any], current_cost: float = 0):
    """Perform comprehensive optimization analysis"""
    try:
        analysis = await optimizer.comprehensive_analysis(resource_name, metrics, current_cost)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/apply")
async def apply_optimization(recommendation: OptimizationRecommendation):
    """Apply an optimization recommendation"""
    try:
        result = await optimizer.apply_optimization(recommendation)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recommendations")
async def get_recommendations():
    """Get all optimization recommendations"""
    return {
        "recommendations": [
            {
                "recommendation_id": rec.recommendation_id,
                "resource_name": rec.resource_name,
                "optimization_type": rec.optimization_type,
                "expected_improvement": rec.expected_improvement,
                "confidence": rec.confidence,
                "timestamp": rec.timestamp.isoformat()
            }
            for rec in optimizer.recommendations.values()
        ],
        "total_count": len(optimizer.recommendations)
    }

@app.get("/optimizations")
async def get_optimizations():
    """Get all applied optimizations"""
    return {
        "optimizations": [
            {
                "optimization_id": opt.optimization_id,
                "resource_name": opt.resource_name,
                "optimizations_applied": opt.optimizations_applied,
                "improvement_achieved": opt.improvement_achieved,
                "timestamp": opt.timestamp.isoformat()
            }
            for opt in optimizer.optimizations.values()
        ],
        "total_count": len(optimizer.optimizations)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
