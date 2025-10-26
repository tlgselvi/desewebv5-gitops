# 🤖 Predictive Rollback Guide - EA Plan v5.1

## 📋 Overview

The Predictive Resilience system uses ML-based anomaly detection to predict deployment instability before it occurs, enabling proactive rollback decisions.

## 🔄 Predictive Resilience Loop

### Architecture

```
Deploy → Predict → Decide → Act
  ↓         ↓        ↓        ↓
Pod Live  ML Model  Risk?   Rollback?
  ↓         ↓        ↓        ↓
Metrics   Analyze   >0.8?   Auto-exec
```

**Flow:**
1. Deployment completes
2. Collect metrics from Prometheus (last 72h)
3. Feed into IsolationForest ML model
4. Compute `risk_score` (0-1)
5. **Decision:**
   - Risk ≤ 0.8: Proceed with health checks
   - Risk > 0.8: **Auto-rollback** → Slack alert

## 🧠 ML Model Details

### Model Type: IsolationForest

**Parameters:**
- `n_estimators`: 100
- `contamination`: 0.1 (10% expected anomalies)
- `random_state`: 42 (deterministic)

**Features Extracted:**
- Mean, Std, Median, Q1, Q3, Max, Min, Sample size
- From: latency, CPU, memory, error_rate

**Output:**
- `risk_score`: 0.0-1.0 (normalized anomaly score)
- `anomaly_score`: Raw IsolationForest score

### Model Location

- **Path**: `aiops/models/risk_model.pkl`
- **Version**: v1.0.0-isolation-forest
- **Retrain Schedule**: Weekly (Sunday 03:00 UTC)
- **Input**: 72h historical Prometheus metrics

---

## 🚀 Running Predictive Analysis

### Manual Run

```bash
# Generate test metrics
echo "[100,105,110,200,250,300]" > latency.json
echo "[50,55,60,90,95,100]" > cpu.json
echo "[0.01,0.02,0.03,0.15,0.20,0.25]" > error.json

# Run analysis
python3 scripts/predictive_analyzer.py latency.json cpu.json error.json

# Check results
cat aiops/risk-prediction.json | jq .
```

### Expected Output

**Low Risk (Proceed):**
```json
{
  "risk_score": 0.45,
  "decision": "proceed",
  "threshold": 0.8
}
```

**High Risk (Rollback):**
```json
{
  "risk_score": 0.83,
  "decision": "rollback",
  "threshold": 0.8
}
```

---

## ⏪ Manual Rollback

### Execute Auto-Rollback Script

```bash
# Ensure risk prediction exists
python3 scripts/predictive_analyzer.py latency.json cpu.json error.json

# Run rollback script
bash scripts/auto_rollback.sh

# Check rollback history
tail -20 logs/rollback-history.log
```

### ArgoCD Rollback

```bash
# View deployment history
argocd app history dese-ea-plan-v5

# Rollback to previous revision
argocd app rollback dese-ea-plan-v5 <revision-id>

# Verify rollback
argocd app get dese-ea-plan-v5
```

---

## 📊 Grafana Dashboard

### Access Dashboard

```bash
kubectl port-forward svc/grafana -n monitoring 3000:3000
# Navigate to: http://localhost:3000
# Dashboard: "Predictive Risk & Rollback Dashboard"
```

### Panels

1. **Predicted Risk Score Over Time** (Line chart)
   - Risk score timeline
   - Threshold markers (0.6, 0.8)

2. **Risk Threshold Visualization** (Gauge)
   - Current risk (0-1)
   - Color-coded by severity

3. **Anomaly Score** (Line chart)
   - IsolationForest anomaly score
   - Negative = anomaly, Positive = normal

4. **Rollback History** (Table)
   - Timestamp, app, revision, risk score
   - From: `logs/rollback-history.log`

5. **Rollback Decision Over Time** (Line chart)
   - Rollback vs. Proceed decisions

6. **Model Accuracy** (Gauge)
   - ML model accuracy percentage
   - Threshold: 85%

---

## 🔧 Model Retraining

### Automatic Retraining

**Schedule:** Sunday 03:00 UTC (weekly)

**Process:**
1. Collect last 7 days of Prometheus metrics
2. Extract features
3. Train new IsolationForest model
4. Evaluate accuracy
5. If accuracy > 0.85: Replace old model
6. Log to `aiops/model-retrain.log`

### Manual Retraining

```bash
# Download historical metrics
kubectl exec -n monitoring deployment/prometheus -- \
  wget -qO- 'http://localhost:9090/api/v1/query_range?query=...' > historical.json

# Retrain model
python3 scripts/predictive_analyzer.py historical.json

# Test new model
python3 scripts/predictive_analyzer.py latency.json cpu.json error.json

# Verify accuracy
cat aiops/risk-prediction.json | jq .model_accuracy
```

---

## 🚨 Alert Thresholds

### Prometheus Alert Rules

| Alert | Threshold | Duration | Severity |
|-------|-----------|----------|----------|
| HighPredictedRisk | risk_score > 0.8 | 5m | Critical |
| MediumPredictedRisk | 0.6 < risk_score ≤ 0.8 | 10m | Warning |
| HighAnomalyScore | anomaly_score < -0.5 | 5m | Critical |
| LowModelAccuracy | accuracy < 0.85 | 1h | Warning |
| RollbackExecuted | rollbacks > 0 | - | Warning |
| IncreasingRiskTrend | +0.2 over 1h | 30m | Warning |

### Apply Alerts

```bash
kubectl apply -f prometheus/predictive-alerts.yml -n monitoring
kubectl -n monitoring exec deployment/prometheus -- kill -HUP 1
```

---

## 📝 Slack Notifications

### High Risk Alert

```
🚨 Predictive Risk Alert
Risk Score: 0.83 (threshold: 0.8)
Decision: ROLLBACK
Action: Auto-rollback initiated
```

### Rollback Executed

```
⏪ Predictive Rollback Executed
Application: dese-ea-plan-v5
Rolled back to: sha-abc123
Reason: Predicted deployment instability
```

---

## 🔍 Troubleshooting

### High False Positive Rate

**Symptom:** Frequent unnecessary rollbacks

**Solution:**
```bash
# Lower contamination parameter
# Edit: scripts/predictive_analyzer.py
# Change: contamination=0.05 (from 0.1)

# Retrain model
python3 scripts/predictive_analyzer.py --retrain

# Verify
cat aiops/model-accuracy.json
```

### Model Not Found

**Symptom:** Model file not found

**Solution:**
```bash
# Create model directory
mkdir -p aiops/models

# Train initial model
python3 scripts/predictive_analyzer.py --train

# Verify
ls -lh aiops/models/risk_model.pkl
```

### Rollback Script Fails

**Symptom:** Auto rollback fails

**Solution:**
```bash
# Check ArgoCD access
argocd app get dese-ea-plan-v5

# Verify revision exists
argocd app history dese-ea-plan-v5

# Manual rollback
kubectl rollout undo deployment/dese-ea-plan-v5 -n dese-ea-plan-v5
```

---

## ✅ Success Criteria

### Predictive Resilience Success

- ✅ Risk score calculated
- ✅ ML model loaded/trained
- ✅ Decision made (< 0.8 proceed, ≥ 0.8 rollback)
- ✅ Auto-rollback executed (if needed)
- ✅ Slack notification sent
- ✅ Rollback logged
- ✅ ArgoCD state updated

---

## 📚 Quick Reference

### Validation Commands

```bash
# Run predictive analysis
python3 scripts/predictive_analyzer.py latency.json cpu.json error.json

# Execute rollback
bash scripts/auto_rollback.sh

# Check Prometheus alerts
kubectl get prometheusrules -n monitoring | grep predictive

# View ArgoCD app
argocd app get dese-ea-plan-v5

# Check rollback history
cat logs/rollback-history.log
```

### Trigger Workflow

```bash
# Manual run with predictive analysis
gh workflow run ci-cd.yml --ref main --raw-field predictive=true

# Monitor execution
gh run watch

# Check predictive job logs
gh run view --log | grep "Predictive Resilience"
```

---

**Last Updated**: 2024  
**Version**: 5.1.0  
**Status**: ✅ Production Ready

