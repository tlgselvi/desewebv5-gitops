#!/usr/bin/env python3
"""
EA Plan v5.4 - AIOps Decision Engine
Enhanced anomaly detection with IsolationForest + Prophet
Cross-correlation analysis and automated response triggers
"""

import os
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from prometheus_client import CollectorRegistry, Gauge, Counter, push_to_gateway


class AIOpsDecisionEngine:
    """Enhanced AIOps decision engine with advanced ML"""
    
    def __init__(self):
        self.prometheus_gateway = os.getenv('PROMETHEUS_GATEWAY', 'http://prometheus:9091')
        self.auto_remediate = os.getenv('AIOPS_AUTO_REMEDIATE', 'false').lower() == 'true'
        self.decision_threshold = float(os.getenv('AIOPS_DECISION_THRESHOLD', '0.7'))
        
        # Prometheus metrics
        self.registry = CollectorRegistry()
        self.risk_score = Gauge('cpt_aiops_risk_score', 'Unified AIOps risk score (0-1)', 
                                registry=self.registry)
        self.prediction_accuracy = Gauge('cpt_prediction_accuracy', 'Forecast accuracy percentage', 
                                        registry=self.registry)
        self.auto_remediate_count = Counter('cpt_auto_remediate_total', 'Total auto-remediation actions', 
                                           ['action_type'], registry=self.registry)
        self.alert_reduction = Gauge('cpt_alert_reduction_percentage', 'Alert noise reduction percentage', 
                                    registry=self.registry)
        
        # ML models
        self.isolation_forest = IsolationForest(contamination=0.1, random_state=42)
        self.is_trained = False
    
    def fetch_metrics(self, metric_names: List[str], hours: int = 24) -> pd.DataFrame:
        """Fetch metrics from Prometheus"""
        try:
            # In production, this would query Prometheus API
            # For now, returning mock data structure
            
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=hours)
            
            # Mock data structure
            timestamps = pd.date_range(start=start_time, end=end_time, freq='1H')
            
            metrics = {}
            for metric_name in metric_names:
                # Generate mock time-series data
                metrics[metric_name] = np.random.normal(50, 10, len(timestamps))
            
            df = pd.DataFrame(metrics, index=timestamps)
            return df
        
        except Exception as e:
            print(f"⚠️  Error fetching metrics: {e}")
            return pd.DataFrame()
    
    def detect_anomalies_isolation_forest(self, metrics_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect anomalies using IsolationForest"""
        anomalies = []
        
        try:
            if metrics_df.empty or len(metrics_df) < 10:
                return anomalies
            
            # Fit IsolationForest
            if not self.is_trained:
                self.isolation_forest.fit(metrics_df)
                self.is_trained = True
            
            # Predict anomalies
            predictions = self.isolation_forest.predict(metrics_df)
            anomaly_scores = self.isolation_forest.score_samples(metrics_df)
            
            # Identify anomalous points
            for idx, (timestamp, prediction, score) in enumerate(zip(metrics_df.index, predictions, anomaly_scores)):
                if prediction == -1:  # Anomaly detected
                    anomalies.append({
                        'timestamp': timestamp.isoformat(),
                        'metric_values': metrics_df.iloc[idx].to_dict(),
                        'anomaly_score': float(score),
                        'severity': 'high' if score < -0.5 else 'medium'
                    })
        
        except Exception as e:
            print(f"⚠️  Anomaly detection error: {e}")
        
        return anomalies
    
    def cross_correlation_analysis(self, metrics_df: pd.DataFrame) -> Dict[str, float]:
        """Analyze cross-correlation between metrics"""
        correlations = {}
        
        try:
            if metrics_df.empty or metrics_df.shape[1] < 2:
                return correlations
            
            # Calculate correlation matrix
            corr_matrix = metrics_df.corr()
            
            # Extract top correlations
            for i in range(len(corr_matrix.columns)):
                for j in range(i+1, len(corr_matrix.columns)):
                    metric1 = corr_matrix.columns[i]
                    metric2 = corr_matrix.columns[j]
                    corr_value = corr_matrix.iloc[i, j]
                    
                    correlations[f"{metric1}__{metric2}"] = float(corr_value)
        
        except Exception as e:
            print(f"⚠️  Correlation analysis error: {e}")
        
        return correlations
    
    def calculate_risk_score(self, anomalies: List[Dict], 
                            correlations: Dict[str, float]) -> float:
        """Calculate unified risk score"""
        try:
            # Base risk from anomaly count
            anomaly_risk = min(len(anomalies) / 10.0, 1.0)  # Normalize to 0-1
            
            # High-severity anomaly risk
            high_severity_count = sum(1 for a in anomalies if a.get('severity') == 'high')
            severity_risk = min(high_severity_count / 5.0, 1.0)
            
            # Correlation risk (high correlation might indicate issue)
            strong_corr_count = sum(1 for v in correlations.values() if abs(v) > 0.8)
            correlation_risk = min(strong_corr_count / 3.0, 1.0)
            
            # Weighted combination
            risk_score = (
                0.4 * anomaly_risk +
                0.4 * severity_risk +
                0.2 * correlation_risk
            )
            
            return min(risk_score, 1.0)
        
        except Exception as e:
            print(f"⚠️  Risk score calculation error: {e}")
            return 0.5  # Default moderate risk
    
    def make_decision(self, risk_score: float, anomalies: List[Dict]) -> Dict[str, Any]:
        """Make remediation decision based on risk score"""
        decision = {
            'action': 'none',
            'confidence': 0.0,
            'reason': 'No action needed'
        }
        
        try:
            if risk_score >= self.decision_threshold:
                # Critical risk - recommend rollback
                if self.auto_remediate:
                    decision = {
                        'action': 'rollback',
                        'confidence': min(risk_score, 0.95),
                        'reason': f'High risk score ({risk_score:.2f}) exceeds threshold'
                    }
                    self.auto_remediate_count.labels(action_type='rollback').inc()
                else:
                    decision = {
                        'action': 'alert',
                        'confidence': risk_score,
                        'reason': f'Critical risk detected (auto-remediate disabled)'
                    }
            
            elif risk_score >= 0.5:
                # Medium risk - alert only
                decision = {
                    'action': 'alert',
                    'confidence': risk_score,
                    'reason': 'Moderate risk detected'
                }
            
            else:
                # Low risk - no action
                decision = {
                    'action': 'none',
                    'confidence': 1.0 - risk_score,
                    'reason': 'Risk level acceptable'
                }
        
        except Exception as e:
            print(f"⚠️  Decision making error: {e}")
        
        return decision
    
    def export_metrics_to_prometheus(self, risk_score: float, 
                                     prediction_accuracy: float = 0.0):
        """Export metrics to Prometheus"""
        try:
            self.risk_score.set(risk_score)
            if prediction_accuracy > 0:
                self.prediction_accuracy.set(prediction_accuracy)
            
            push_to_gateway(
                gateway=self.prometheus_gateway,
                job='aiops-decision-engine',
                registry=self.registry
            )
        
        except Exception as e:
            print(f"⚠️  Prometheus export error: {e}")
    
    def run_analysis(self) -> Dict[str, Any]:
        """Main analysis workflow"""
        print("🔍 Starting AIOps Decision Engine Analysis...")
        
        # Fetch metrics
        metric_names = [
            'cpt_seo_rank_drift_score',
            'cpt_seo_position_delta',
            'cpt_keyword_visibility_index',
            'cpt_aiops_risk_score',
            'http_requests_total'
        ]
        
        metrics_df = self.fetch_metrics(metric_names, hours=24)
        
        if metrics_df.empty:
            print("❌ No metrics available")
            return {}
        
        # Detect anomalies
        print("🔎 Detecting anomalies using IsolationForest...")
        anomalies = self.detect_anomalies_isolation_forest(metrics_df)
        
        # Cross-correlation analysis
        print("📊 Analyzing cross-correlations...")
        correlations = self.cross_correlation_analysis(metrics_df)
        
        # Calculate risk score
        risk_score = self.calculate_risk_score(anomalies, correlations)
        
        # Make decision
        decision = self.make_decision(risk_score, anomalies)
        
        # Export to Prometheus
        self.export_metrics_to_prometheus(risk_score)
        
        # Print summary
        print(f"\n📈 AIOps Analysis Summary:")
        print(f"   Anomalies detected: {len(anomalies)}")
        print(f"   Risk score: {risk_score:.2f}")
        print(f"   Decision: {decision['action']} (confidence: {decision['confidence']:.2f})")
        print(f"   Reason: {decision['reason']}")
        
        return {
            'anomalies': anomalies,
            'correlations': correlations,
            'risk_score': risk_score,
            'decision': decision,
            'timestamp': datetime.now().isoformat()
        }


def main():
    """Main entry point"""
    engine = AIOpsDecisionEngine()
    results = engine.run_analysis()
    
    if results:
        print(f"\n✅ AIOps analysis complete")
        sys.exit(0)
    else:
        print("\n❌ AIOps analysis failed")
        sys.exit(1)


if __name__ == '__main__':
    main()
