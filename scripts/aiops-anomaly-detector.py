#!/usr/bin/env python3
"""
AIOps Anomaly Detector Script
Detects anomalies in production metrics using z-score algorithm.
Exits with code 1 if anomalies detected, else 0.
"""

import json
import sys
from pathlib import Path
from statistics import mean, stdev
from typing import List, Dict, Any


def calculate_z_score(value: float, mean_val: float, std_dev: float) -> float:
    """Calculate z-score for anomaly detection (threshold > 3.0)"""
    if std_dev == 0:
        return 0.0
    return abs((value - mean_val) / std_dev)


def detect_anomalies(metric_data: List[float], threshold: float = 3.0) -> List[Dict[str, Any]]:
    """Detect anomalies in metric data using z-score"""
    if len(metric_data) < 2:
        return []
    
    mean_val = mean(metric_data)
    std_dev = stdev(metric_data)
    
    anomalies = []
    for idx, value in enumerate(metric_data):
        z_score = calculate_z_score(value, mean_val, std_dev)
        if z_score > threshold:
            anomalies.append({
                'index': idx,
                'value': value,
                'z_score': z_score,
                'mean': mean_val,
                'std_dev': std_dev
            })
    
    return anomalies


def process_metric_file(file_path: Path, metric_name: str) -> Dict[str, Any]:
    """Process a single metric JSON file"""
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        # Extract values (assuming array format)
        if isinstance(data, list):
            values = [float(x) for x in data]
        elif isinstance(data, dict) and 'values' in data:
            values = [float(x) for x in data['values']]
        else:
            print(f"⚠️  Unknown format in {file_path}")
            return {'anomalies': [], 'total': 0, 'metric': metric_name}
        
        anomalies = detect_anomalies(values)
        
        return {
            'metric': metric_name,
            'total_samples': len(values),
            'anomalies': anomalies,
            'anomaly_count': len(anomalies),
            'mean': mean(values),
            'std_dev': stdev(values) if len(values) > 1 else 0.0
        }
    except FileNotFoundError:
        print(f"⚠️  File not found: {file_path}")
        return {'anomalies': [], 'total': 0, 'metric': metric_name}
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return {'anomalies': [], 'total': 0, 'metric': metric_name}


def main():
    """Main anomaly detection logic"""
    print("=" * 60)
    print("🔍 AIOps Anomaly Detector")
    print("=" * 60)
    
    # Default metric files to check
    metric_files = [
        ('latency.json', 'latency'),
        ('cpu.json', 'cpu_usage'),
        ('memory.json', 'memory_usage'),
        ('error_rate.json', 'error_rate')
    ]
    
    # Allow custom metric files via command line
    if len(sys.argv) > 1:
        metric_files = [(sys.argv[i], f"metric_{i}") for i in range(1, len(sys.argv))]
    
    all_results = []
    total_anomalies = 0
    
    # Process each metric file
    for filename, metric_name in metric_files:
        file_path = Path(filename)
        if not file_path.exists():
            continue
        
        print(f"\n📊 Processing {metric_name}...")
        result = process_metric_file(file_path, metric_name)
        all_results.append(result)
        total_anomalies += result['anomaly_count']
        
        if result['anomaly_count'] > 0:
            print(f"⚠️  {result['anomaly_count']} anomalies detected in {metric_name}")
            for anomaly in result['anomalies']:
                print(f"   - Index {anomaly['index']}: value={anomaly['value']:.2f}, z-score={anomaly['z_score']:.2f}")
        else:
            print(f"✅ No anomalies in {metric_name}")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Anomaly Detection Summary")
    print("=" * 60)
    print(f"Total anomalies detected: {total_anomalies}")
    
    for result in all_results:
        print(f"\n{result['metric']}:")
        print(f"  Samples: {result['total_samples']}")
        print(f"  Anomalies: {result['anomaly_count']}")
        if result['total_samples'] > 0:
            print(f"  Mean: {result['mean']:.2f}")
            print(f"  Std Dev: {result['std_dev']:.2f}")
    
    # Exit code: 1 if anomalies detected
    if total_anomalies > 0:
        print("\n❌ Anomalies detected! Exiting with code 1")
        sys.exit(1)
    else:
        print("\n✅ No anomalies detected. System healthy.")
        sys.exit(0)


if __name__ == '__main__':
    main()

