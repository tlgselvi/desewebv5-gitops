# EA Plan v6.8.0 - Post-Deployment Validation

**Version:** v6.8.0  
**Last Update:** 2025-01-27

## Hızlı Başlangıç

### Windows (PowerShell)
```powershell
.\ops\validate-deployment.ps1
```

### Linux/Mac (Bash)
```bash
chmod +x ops/validate-deployment.sh
./ops/validate-deployment.sh
```

## Manuel Validation Adımları

### 1. Pod Durumu
```bash
kubectl get pods -n dese-ea-plan-v5 -o wide
```

**Beklenen:** Tüm pod'lar `Running` durumunda olmalı

### 2. Deployment Health
```bash
kubectl rollout status deployment/cpt-ajan-backend -n dese-ea-plan-v5
kubectl rollout status deployment/cpt-ajan-frontend -n dese-ea-plan-v5
```

**Beklenen:** Her iki deployment da `successfully rolled out`

### 3. ServiceMonitor
```bash
kubectl get servicemonitor -n monitoring | grep cpt-ajan-backend
```

**Beklenen:** ServiceMonitor kaydı görünmeli

### 4. Services
```bash
kubectl get svc -n dese-ea-plan-v5
```

**Beklenen:**
- `cpt-ajan-backend` ClusterIP servisi (port 8080)
- `cpt-ajan-frontend` ClusterIP servisi (port 80)

### 5. Health Check
```bash
# Backend health
kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -- curl http://cpt-ajan-backend.dese-ea-plan-v5.svc.cluster.local:8080/health

# Frontend health
kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -- curl http://cpt-ajan-frontend.dese-ea-plan-v5.svc.cluster.local:80/
```

**Beklenen:** HTTP 200 responses

### 6. Prometheus Validation

#### Port Forward
```bash
kubectl port-forward svc/prometheus-k8s -n monitoring 9090:9090
```

#### Targets Kontrolü
```bash
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="cpt-ajan-backend")'
```

**Beklenen:** Backend target `up` durumunda

#### Metrics Kontrolü
```bash
curl -s http://localhost:9090/api/v1/query?query=cpt_user_action_total
curl -s http://localhost:9090/api/v1/query?query=api_latency_p95
```

**Beklenen:** Metrics query sonuçları dönmeli

### 7. Grafana Dashboard

#### Port Forward
```bash
kubectl port-forward svc/grafana -n monitoring 3000:3000
```

#### Tarayıcıda Aç
- URL: http://localhost:3000
- Dashboard: "Dese EA Plan v5.6 - Security & Validation"

**Beklenen:** Dashboard açılmalı ve grafikler görünmeli

### 8. ArgoCD Durum (Eğer kullanılıyorsa)
```bash
argocd app get cpt-ajan
```

**Beklenen:**
- Sync Status: Synced
- Health Status: Healthy

### 9. Logs Kontrolü
```bash
# Backend logs
kubectl logs -n dese-ea-plan-v5 -l app=cpt-ajan-backend --tail=50

# Frontend logs
kubectl logs -n dese-ea-plan-v5 -l app=cpt-ajan-frontend --tail=50

# AIOps events
kubectl logs -n dese-ea-plan-v5 -l app=cpt-ajan-backend本领 --tail=100 | grep -i "AIOPS"
```

**Beklenen:** Hata mesajı olmamalı

## Otomatik Validation

### Prometheus & Grafana
```bash
chmod +x ops/validate-prometheus-grafana.sh
./ops/validate-prometheus-grafana.sh
```

## Troubleshooting

### Pod'lar Çalışmıyor
```bash
# Pod detayları
kubectl describe pod <pod-name> -n dese-ea-plan-v5

# Events
kubectl get events -n dese-ea-plan-v5 --sort-by='.lastTimestamp'
```

### ServiceMonitor Bulunamıyor
```bash
# Kurulum kontrolü
kubectl get servicemonitor -n monitoring

# Yeniden kurulum
kubectl apply -f k8s/servicemonitor.yaml
```

### Prometheus Metrics Gelmiyor
```bash
# Backend metrics endpoint'i test et
kubectl exec -it <backend-pod-name> -n dese-ea-plan-v5 -- curl http://localhost:3000/metrics

# Prometheus scrape config kontrolü
kubectl get configmap prometheus-config -n monitoring -o yaml
```

### Frontend Erişilemiyor
```bash
# Pod restart
kubectl rollout restart deployment/cpt-ajan-frontend -n dese-ea-plan-v5

# Pod logs
kubectl logs -n dese-ea-plan-v5 -l app=cpt-ajan-frontend
```

## Success Criteria

✅ Tüm pod'lar Running durumunda
✅ Her iki deployment healthy
✅ Backend health endpoint 200 dönüyor
✅ Frontend servisi erişilebilir
✅ Prometheus backend'i scrape ediyor
✅ Custom metrics görünüyor
✅ Grafana dashboard açılıyor
✅ ArgoCD sync'li (varsa)

## Notlar

- Tüm komutlar `dese-ea-plan-v5` namespace'inde çalışır
- Monitoring araçları `monitoring` namespace'inde
- Port forwarding ile local erişim sağlanır
- Metrics 30 saniye scrape interval ile toplanır

