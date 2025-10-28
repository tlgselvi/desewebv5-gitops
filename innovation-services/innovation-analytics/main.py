from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
import logging
import time
from datetime import datetime, timedelta
from enum import Enum
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EA Plan v6.0 Innovation Analytics API", version="1.0.0")

class InnovationMetricType(str, Enum):
    VELOCITY = "velocity"
    ADOPTION = "adoption"
    ROI = "roi"
    IMPACT = "impact"
    COLLABORATION = "collaboration"
    RESEARCH_OUTPUT = "research_output"

class InnovationTrend(str, Enum):
    RISING = "rising"
    STABLE = "stable"
    DECLINING = "declining"
    EMERGING = "emerging"

class InnovationMetric(BaseModel):
    metric_id: str
    metric_type: InnovationMetricType
    name: str
    value: float
    unit: str
    trend: InnovationTrend
    period: str
    timestamp: datetime

class InnovationInsight(BaseModel):
    insight_id: str
    title: str
    description: str
    category: str
    confidence: float
    impact_level: str
    recommendations: List[str]
    created_at: datetime

class InnovationAnalytics:
    def __init__(self):
        self.metrics = {}
        self.insights = {}
        self.load_innovation_data()
    
    def load_innovation_data(self):
        """Load innovation analytics data"""
        self.innovation_data = {
            "projects": {
                "total": 45,
                "active": 23,
                "completed": 18,
                "cancelled": 4
            },
            "technologies": {
                "evaluated": 67,
                "integrated": 34,
                "in_progress": 12,
                "deprecated": 8
            },
            "research": {
                "papers_published": 23,
                "patents_filed": 15,
                "patents_granted": 8,
                "collaborations": 12
            },
            "labs": {
                "total_labs": 8,
                "active_sandboxes": 34,
                "utilization_rate": 0.78,
                "user_satisfaction": 4.6
            }
        }
    
    async def calculate_innovation_velocity(self) -> InnovationMetric:
        """Calculate innovation velocity metric"""
        projects = self.innovation_data["projects"]
        completed_projects = projects["completed"]
        total_time_period = 12  # months
        
        velocity = completed_projects / total_time_period
        
        # Determine trend
        trend = InnovationTrend.RISING if velocity > 1.5 else InnovationTrend.STABLE if velocity > 1.0 else InnovationTrend.DECLINING
        
        metric = InnovationMetric(
            metric_id=f"metric_{uuid.uuid4().hex[:8]}",
            metric_type=InnovationMetricType.VELOCITY,
            name="Innovation Velocity",
            value=velocity,
            unit="projects/month",
            trend=trend,
            period="12 months",
            timestamp=datetime.now()
        )
        
        self.metrics[metric.metric_id] = metric
        return metric
    
    async def calculate_adoption_rate(self) -> InnovationMetric:
        """Calculate technology adoption rate"""
        technologies = self.innovation_data["technologies"]
        integrated = technologies["integrated"]
        evaluated = technologies["evaluated"]
        
        adoption_rate = integrated / evaluated if evaluated > 0 else 0
        
        # Determine trend
        trend = InnovationTrend.RISING if adoption_rate > 0.6 else InnovationTrend.STABLE if adoption_rate > 0.4 else InnovationTrend.DECLINING
        
        metric = InnovationMetric(
            metric_id=f"metric_{uuid.uuid4().hex[:8]}",
            metric_type=InnovationMetricType.ADOPTION,
            name="Technology Adoption Rate",
            value=adoption_rate,
            unit="percentage",
            trend=trend,
            period="12 months",
            timestamp=datetime.now()
        )
        
        self.metrics[metric.metric_id] = metric
        return metric
    
    async def calculate_innovation_roi(self) -> InnovationMetric:
        """Calculate innovation ROI"""
        # Mock ROI calculation
        total_investment = 2500000  # $2.5M
        total_return = 4200000  # $4.2M
        
        roi = ((total_return - total_investment) / total_investment) * 100
        
        # Determine trend
        trend = InnovationTrend.RISING if roi > 50 else InnovationTrend.STABLE if roi > 20 else InnovationTrend.DECLINING
        
        metric = InnovationMetric(
            metric_id=f"metric_{uuid.uuid4().hex[:8]}",
            metric_type=InnovationMetricType.ROI,
            name="Innovation ROI",
            value=roi,
            unit="percentage",
            trend=trend,
            period="12 months",
            timestamp=datetime.now()
        )
        
        self.metrics[metric.metric_id] = metric
        return metric
    
    async def calculate_research_output(self) -> InnovationMetric:
        """Calculate research output metric"""
        research = self.innovation_data["research"]
        papers = research["papers_published"]
        patents = research["patents_granted"]
        
        research_output = papers + patents
        
        # Determine trend
        trend = InnovationTrend.RISING if research_output > 25 else InnovationTrend.STABLE if research_output > 15 else InnovationTrend.DECLINING
        
        metric = InnovationMetric(
            metric_id=f"metric_{uuid.uuid4().hex[:8]}",
            metric_type=InnovationMetricType.RESEARCH_OUTPUT,
            name="Research Output",
            value=research_output,
            unit="publications",
            trend=trend,
            period="12 months",
            timestamp=datetime.now()
        )
        
        self.metrics[metric.metric_id] = metric
        return metric
    
    async def generate_innovation_insights(self) -> List[InnovationInsight]:
        """Generate innovation insights"""
        insights = []
        
        # Calculate all metrics
        velocity_metric = await self.calculate_innovation_velocity()
        adoption_metric = await self.calculate_adoption_rate()
        roi_metric = await self.calculate_innovation_roi()
        research_metric = await self.calculate_research_output()
        
        # Generate insights based on metrics
        if velocity_metric.trend == InnovationTrend.RISING:
            insight = InnovationInsight(
                insight_id=f"insight_{uuid.uuid4().hex[:8]}",
                title="High Innovation Velocity",
                description=f"Innovation velocity is {velocity_metric.value:.1f} projects/month, indicating strong innovation momentum",
                category="performance",
                confidence=0.85,
                impact_level="high",
                recommendations=[
                    "Maintain current innovation pace",
                    "Consider scaling innovation resources",
                    "Focus on quality over quantity"
                ],
                created_at=datetime.now()
            )
            insights.append(insight)
        
        if adoption_metric.value < 0.5:
            insight = InnovationInsight(
                insight_id=f"insight_{uuid.uuid4().hex[:8]}",
                title="Low Technology Adoption Rate",
                description=f"Technology adoption rate is {adoption_metric.value:.1%}, indicating potential barriers to adoption",
                category="adoption",
                confidence=0.90,
                impact_level="medium",
                recommendations=[
                    "Investigate adoption barriers",
                    "Improve technology evaluation process",
                    "Provide better training and support"
                ],
                created_at=datetime.now()
            )
            insights.append(insight)
        
        if roi_metric.value > 50:
            insight = InnovationInsight(
                insight_id=f"insight_{uuid.uuid4().hex[:8]}",
                title="Strong Innovation ROI",
                description=f"Innovation ROI is {roi_metric.value:.1f}%, demonstrating excellent return on innovation investment",
                category="financial",
                confidence=0.95,
                impact_level="high",
                recommendations=[
                    "Continue current innovation strategy",
                    "Consider increasing innovation budget",
                    "Replicate successful innovation patterns"
                ],
                created_at=datetime.now()
            )
            insights.append(insight)
        
        # Store insights
        for insight in insights:
            self.insights[insight.insight_id] = insight
        
        return insights
    
    async def get_innovation_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive innovation dashboard"""
        # Calculate all metrics
        velocity_metric = await self.calculate_innovation_velocity()
        adoption_metric = await self.calculate_adoption_rate()
        roi_metric = await self.calculate_innovation_roi()
        research_metric = await self.calculate_research_output()
        
        # Generate insights
        insights = await self.generate_innovation_insights()
        
        dashboard = {
            "overview": {
                "total_projects": self.innovation_data["projects"]["total"],
                "active_projects": self.innovation_data["projects"]["active"],
                "technologies_integrated": self.innovation_data["technologies"]["integrated"],
                "research_output": self.innovation_data["research"]["papers_published"] + self.innovation_data["research"]["patents_granted"]
            },
            "key_metrics": {
                "innovation_velocity": {
                    "value": velocity_metric.value,
                    "trend": velocity_metric.trend,
                    "unit": velocity_metric.unit
                },
                "adoption_rate": {
                    "value": adoption_metric.value,
                    "trend": adoption_metric.trend,
                    "unit": adoption_metric.unit
                },
                "innovation_roi": {
                    "value": roi_metric.value,
                    "trend": roi_metric.trend,
                    "unit": roi_metric.unit
                },
                "research_output": {
                    "value": research_metric.value,
                    "trend": research_metric.trend,
                    "unit": research_metric.unit
                }
            },
            "insights": [
                {
                    "title": insight.title,
                    "description": insight.description,
                    "category": insight.category,
                    "confidence": insight.confidence,
                    "impact_level": insight.impact_level,
                    "recommendations": insight.recommendations
                }
                for insight in insights
            ],
            "trends": {
                "rising_metrics": [m.name for m in [velocity_metric, adoption_metric, roi_metric, research_metric] if m.trend == InnovationTrend.RISING],
                "stable_metrics": [m.name for m in [velocity_metric, adoption_metric, roi_metric, research_metric] if m.trend == InnovationTrend.STABLE],
                "declining_metrics": [m.name for m in [velocity_metric, adoption_metric, roi_metric, research_metric] if m.trend == InnovationTrend.DECLINING]
            },
            "timestamp": datetime.now().isoformat()
        }
        
        return dashboard

# Initialize analytics
innovation_analytics = InnovationAnalytics()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "innovation-analytics",
        "total_metrics": len(innovation_analytics.metrics),
        "total_insights": len(innovation_analytics.insights),
        "version": "1.0.0"
    }

@app.get("/dashboard")
async def get_innovation_dashboard():
    """Get comprehensive innovation dashboard"""
    try:
        dashboard = await innovation_analytics.get_innovation_dashboard()
        return dashboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics")
async def get_innovation_metrics():
    """Get all innovation metrics"""
    return {
        "metrics": [
            {
                "metric_id": metric.metric_id,
                "metric_type": metric.metric_type,
                "name": metric.name,
                "value": metric.value,
                "unit": metric.unit,
                "trend": metric.trend,
                "period": metric.period,
                "timestamp": metric.timestamp.isoformat()
            }
            for metric in innovation_analytics.metrics.values()
        ],
        "total_count": len(innovation_analytics.metrics)
    }

@app.get("/insights")
async def get_innovation_insights():
    """Get all innovation insights"""
    return {
        "insights": [
            {
                "insight_id": insight.insight_id,
                "title": insight.title,
                "description": insight.description,
                "category": insight.category,
                "confidence": insight.confidence,
                "impact_level": insight.impact_level,
                "recommendations": insight.recommendations,
                "created_at": insight.created_at.isoformat()
            }
            for insight in innovation_analytics.insights.values()
        ],
        "total_count": len(innovation_analytics.insights)
    }

@app.get("/metrics/{metric_type}")
async def get_metric_by_type(metric_type: InnovationMetricType):
    """Get metrics by type"""
    metrics = [m for m in innovation_analytics.metrics.values() if m.metric_type == metric_type]
    return {
        "metrics": [
            {
                "metric_id": metric.metric_id,
                "name": metric.name,
                "value": metric.value,
                "unit": metric.unit,
                "trend": metric.trend,
                "timestamp": metric.timestamp.isoformat()
            }
            for metric in metrics
        ],
        "total_count": len(metrics)
    }

@app.get("/insights/{category}")
async def get_insights_by_category(category: str):
    """Get insights by category"""
    insights = [i for i in innovation_analytics.insights.values() if i.category == category]
    return {
        "insights": [
            {
                "insight_id": insight.insight_id,
                "title": insight.title,
                "description": insight.description,
                "confidence": insight.confidence,
                "impact_level": insight.impact_level,
                "recommendations": insight.recommendations,
                "created_at": insight.created_at.isoformat()
            }
            for insight in insights
        ],
        "total_count": len(insights)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
