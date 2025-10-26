#!/usr/bin/env python3
"""
Auto Rebaseline Script for SBOM Drift Detection - Hardened Version
Automatically updates baseline when drift is within acceptable threshold
"""

import json
import os
import hashlib
import sys
from datetime import datetime
from pathlib import Path


def sha256sum(file_path):
    """Calculate SHA256 digest of a file"""
    h = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                h.update(chunk)
        return h.hexdigest()
    except FileNotFoundError:
        return None


def drift_ratio(old_content, new_content):
    """Calculate drift percentage between two file contents"""
    diff = abs(len(old_content) - len(new_content))
    total = max(len(old_content), len(new_content), 1)
    return round((diff / total) * 100, 2)


def main():
    """Main auto-rebaseline logic"""
    print("=" * 60)
    print("🔄 Auto Rebaseline Script - Hardened Version")
    print("=" * 60)
    
    BASELINE = "compliance/sbom-baseline.json"
    LIVE = "sbom.spdx.json"
    LOG = "compliance/rebaseline.log"
    MAX_DRIFT = 10.0  # Threshold: <10% auto, ≥10% fail
    
    # Ensure log directory exists
    Path(LOG).parent.mkdir(parents=True, exist_ok=True)
    
    # Check if live SBOM exists
    if not os.path.exists(LIVE):
        print("[ERROR] Missing live SBOM file: sbom.spdx.json")
        sys.exit(1)
    
    # Load baseline
    if not os.path.exists(BASELINE):
        print("[WARN] Baseline not found. Creating initial baseline...")
        baseline = {
            "format": "SPDX-2.3",
            "generatedAt": datetime.utcnow().isoformat() + "Z",
            "baselineDigest": "sha256:" + "0" * 64,
            "purpose": "Initial baseline for auto-rebaseline",
            "components": {"application": "dese-ea-plan-v5", "version": "5.0.0"},
            "dependencies": [],
            "compliance": {
                "sbomDriftThreshold": 0.10,
                "maxDriftPercent": 10,
                "strict": True
            },
            "metadata": {
                "createdBy": "auto_rebaseline.py",
                "commit": "initial",
                "workflow": "continuous-compliance"
            }
        }
        with open(BASELINE, 'w') as f:
            json.dump(baseline, f, indent=2)
        print("[OK] Initial baseline created")
        sys.exit(0)
    
    # Read files
    old = open(BASELINE).read()
    new = open(LIVE).read()
    
    # Calculate drift
    drift = drift_ratio(old, new)
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    print(f"\n📊 SBOM Drift Analysis:")
    print(f"   Baseline: {BASELINE}")
    print(f"   Current: {LIVE}")
    print(f"   Drift: {drift}%")
    print(f"   Max Allowed: {MAX_DRIFT}%")
    
    # Log to file
    with open(LOG, "a") as log:
        log.write(f"[{timestamp}] SBOM drift: {drift}%\n")
    
    # Decision logic: <10% auto-rebaseline, ≥10% fail
    if drift < MAX_DRIFT:
        print(f"[OK] SBOM drift {drift}% < {MAX_DRIFT}% → baseline will be updated")
        
        # Parse new SBOM and update baseline
        try:
            new_data = json.loads(new)
            baseline_data = json.loads(old)
            
            # Update baseline metadata
            baseline_data['baselineDigest'] = "sha256:" + sha256sum(LIVE)
            baseline_data['generatedAt'] = timestamp
            baseline_data['metadata']['updatedBy'] = "auto_rebaseline.py"
            baseline_data['metadata']['commit'] = os.getenv('GITHUB_SHA', 'unknown')
            baseline_data['metadata']['workflow'] = os.getenv('GITHUB_WORKFLOW', 'continuous-compliance')
            
            # Write updated baseline
            with open(BASELINE, "w") as f:
                json.dump(baseline_data, f, indent=2)
            
            with open(LOG, "a") as log:
                log.write(f"[{timestamp}] [OK] Baseline updated (drift: {drift}%)\n")
            
            print(f"[OK] Baseline updated successfully")
            sys.exit(0)
        
        except Exception as e:
            print(f"[ERROR] Failed to update baseline: {e}")
            sys.exit(1)
    
    else:
        print(f"[FAIL] SBOM drift {drift}% ≥ {MAX_DRIFT}% → manual review required")
        
        with open(LOG, "a") as log:
            log.write(f"[{timestamp}] [FAIL] Drift {drift}% exceeds threshold - manual intervention required\n")
        
        sys.exit(1)


if __name__ == '__main__':
    main()
