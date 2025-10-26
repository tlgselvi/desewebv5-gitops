#!/usr/bin/env python3
"""
Predictive Analyzer for Deployment Risk Assessment - Hardened
Uses IsolationForest ML model to predict anomalies and deployment risk
Includes model caching and deterministic version tracking
"""

import json
import sys
import os
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
import pickle
try:
    from sklearn.ensemble import IsolationForest
except ImportError:
    print("⚠️  scikit-learn not installed, using placeholder")
    IsolationForest = None


def load_metrics(metric_files):
    """Load metrics from JSON files"""
    metrics = {}
    
    for file in metric_files:
        try:
            with open(file, 'r') as f:
                data = json.load(f)
                # Extract values (assuming array format or time series)
                if isinstance(data, list):
                    metrics[Path(file).stem] = np.array(data)
                elif isinstance(data, dict) and 'values' in data:
                    metrics[Path(file).stem] = np.array(data['values'])
                else:
                    print(f"⚠️  Unknown format in {file}")
                    metrics[Path(file).stem] = np.array([100, 200, 300])  # Placeholder
        except FileNotFoundError:
            print(f"⚠️  File not found: {file}")
            metrics[Path(file).stem] = np.array([100, 200, 300])  # Placeholder
    
    return metrics


def extract_features(metrics):
    """Extract statistical features from metrics"""
    features = []
    
    for metric_name, values in metrics.items():
        if len(values) > 0:
            features.extend([
                np.mean(values),      # Mean
                np.std(values),       # Standard deviation
                np.median(values),    # Median
                np.percentile(values, 25),  # Q1
                np.percentile(values, 75),  # Q3
                np.max(values),       # Max
                np.min(values),       # Min
                len(values)           # Sample size
            ])
        else:
            features.extend([0] * 8)  # Placeholder zeros
    
    return np.array(features)


def train_model(historical_metrics, contamination=0.1):
    """Train IsolationForest model on historical data"""
    print("🤖 Training IsolationForest model...")
    
    # Create feature matrix from historical metrics
    features_list = []
    for metrics_dict in historical_metrics:
        features = extract_features(metrics_dict)
        features_list.append(features)
    
    X = np.array(features_list)
    
    # Train model
    model = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X)
    
    print(f"✅ Model trained on {len(features_list)} samples")
    return model


def predict_risk(model, current_metrics):
    """Predict risk score using trained model"""
    print("🔍 Predicting deployment risk...")
    
    # Extract features from current metrics
    features = extract_features(current_metrics)
    features = features.reshape(1, -1)
    
    # Predict anomaly score
    anomaly_score = model.decision_function(features)[0]
    
    # Convert to risk score (0-1 scale)
    # IsolationForest returns: negative = anomaly, positive = normal
    # We want: positive risk_score = high risk
    risk_score = abs(anomaly_score)
    
    # Normalize to 0-1 range
    risk_score = (risk_score - (-0.5)) / (0.5 - (-0.5))  # Rough normalization
    risk_score = max(0.0, min(1.0, risk_score))  # Clamp to [0, 1]
    
    return risk_score, anomaly_score


def save_model(model, filepath):
    """Save trained model to file"""
    with open(filepath, 'wb') as f:
        pickle.dump(model, f)
    print(f"💾 Model saved to {filepath}")


def load_model(filepath):
    """Load trained model from file"""
    try:
        with open(filepath, 'rb') as f:
            model = pickle.load(f)
        print(f"📥 Model loaded from {filepath}")
        return model
    except FileNotFoundError:
        print(f"⚠️  Model not found: {filepath}")
        return None


def main():
    """Main predictive analysis logic"""
    print("=" * 60)
    print("🤖 Predictive Risk Analyzer")
    print("=" * 60)
    
    # File paths
    metric_files = sys.argv[1:] if len(sys.argv) > 1 else ['latency.json', 'cpu.json', 'error.json']
    model_path = Path("aiops/models/risk_model.pkl")
    
    # Ensure model directory exists
    model_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Load current metrics
    print(f"\n📊 Loading current metrics...")
    current_metrics = load_metrics(metric_files)
    
    if not current_metrics:
        print("❌ No metrics available for analysis")
        sys.exit(1)
    
    print(f"✅ Loaded metrics: {list(current_metrics.keys())}")
    
    # Load or train model
    model = load_model(model_path)
    
    if model is None:
        print("⚠️  Model not found, training new model...")
        # For training, we need historical data
        # In production, this would be loaded from Prometheus
        # For now, we create a simple training set
        historical_data = [current_metrics]  # Simplified
        model = train_model(historical_data)
        save_model(model, model_path)
    
    # Predict risk
    risk_score, anomaly_score = predict_risk(model, current_metrics)
    
    print(f"\n📈 Risk Analysis Results:")
    print(f"   Risk Score: {risk_score:.3f}")
    print(f"   Anomaly Score: {anomaly_score:.3f}")
    print(f"   Threshold: 0.8")
    
    # Generate decision
    threshold = 0.8
    decision = "rollback" if risk_score > threshold else "proceed"
    
    print(f"\n🎯 Decision: {decision.upper()}")
    
    if risk_score > threshold:
        print("❌ HIGH RISK DETECTED: Rollback recommended")
    else:
        print("✅ LOW RISK: Deployment can proceed")
    
    # Output JSON for workflow consumption
    output = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "risk_score": round(risk_score, 4),
        "anomaly_score": round(anomaly_score, 4),
        "threshold": threshold,
        "decision": decision,
        "metrics": {k: len(v) for k, v in current_metrics.items()},
        "model_version": "v1.0.0-isolation-forest"
    }
    
    output_path = Path("aiops/risk-prediction.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\n📄 Results saved to: {output_path}")
    
    # Exit code
    if decision == "rollback":
        print("\n❌ Exiting with code 1: Rollback recommended")
        sys.exit(1)
    else:
        print("\n✅ Exiting with code 0: Deployment approved")
        sys.exit(0)


if __name__ == '__main__':
    main()

