# EA Plan v6.x Genel Denetim Kılavuzu

## 📋 Genel Bakış

Bu kılavuz, Deseweb v5 + EA Plan v6.x projesinin genel denetimi için kullanılır. Proje durumunu, yapılandırmaları, güvenlik politikalarını ve otomasyonları kontrol etmek için tasarlanmıştır.

## 🚀 Hızlı Başlangıç

### 1. Audit Script Kullanımı

```bash
# Tüm kontrolleri çalıştır
./ops/audit-ea-plan-v6.sh all

# Spesifik bölümleri kontrol et
./ops/audit-ea-plan-v6.sh configmaps
./ops/audit-ea-plan-v6.sh observability
./ops/audit-ea-plan-v6.sh security
./ops/audit-ea-plan-v6.sh automation
./ops/audit-ea-plan-v6.sh health
./ops/audit-ea-plan-v6.sh sprint
```

### 2. YAML Audit Prompt Kullanımı

`docs/EA_PLAN_V6_AUDIT_PROMPT.yaml` dosyasını Cursor veya ChatGPT'e yapıştırarak proje durumunu analiz edebilirsiniz:

```
# Prompt'u yapıştır ve istek yap:
"Bu prompt'a göre projeyi denetle"
"ConfigMaps bölümünü kontrol et"
"Observability stack durumunu göster"
```

## 📊 Audit Bölümleri

### ConfigMaps

Kontrol edilen ConfigMaps:
- `ea-plan-v6-4` (ea-web): Sprint metadata
- `adaptive-tuning-config` (ea-web): Adaptive resource optimization
- `security-hardening-config` (ea-web): Security policies
- `self-healing-config` (ea-web): Self-healing rules
- `predictive-scaling-config` (monitoring): Auto-scaling config
- `final-optimization-config` (ea-web): Final optimization settings

**Kontrol Komutu:**
```bash
kubectl get configmap -A | grep -E "ea-plan|adaptive|security|self-healing|predictive|final-optimization"
```

### Manifests

Kontrol edilen Kubernetes kaynakları:
- **HPA**: `ea-web-autoscaler` (2-8 replicas, latency_p95 metric)
- **CronJob**: `seo-observer` (her 30 dakika)
- **Jobs**: `aiops-tuning`, `aiops-predictive-train`

**Kontrol Komutu:**
```bash
kubectl get hpa,cronjob,job -A
```

### Observability Stack

Kontrol edilen servisler:
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **Jaeger**: Distributed tracing (Tempo migration'dan sonra)

**Kontrol Komutu:**
```bash
kubectl get pods -n monitoring -l app=prometheus,app=grafana
kubectl get pods -n monitoring | grep jaeger
```

### Security Policies

Kontrol edilen güvenlik önlemleri:
- **Network Policies**: Default deny + monitoring ingress exceptions
- **Pod Security Standards**: Baseline enforce, Restricted audit
- **RBAC**: Service account bindings
- **Admission Control**: Prevent privileged, require non-root

**Kontrol Komutu:**
```bash
kubectl get networkpolicy -n ea-web
kubectl get ns ea-web monitoring -o jsonpath='{range .items[*]}{.metadata.name}{": "}{.metadata.labels.pod-security\.kubernetes\.io/enforce}{"\n"}{end}'
```

### Automation

Kontrol edilen otomasyonlar:
- **Self-Healing**: Auto-restart, circuit breaker, pod replacement
- **Adaptive Tuning**: CPU/memory/latency optimization
- **Predictive Scaling**: Forecast-based auto-scaling

**Kontrol Komutu:**
```bash
kubectl get configmap self-healing-config adaptive-tuning-config predictive-scaling-config -A
```

### Health Status

Kontrol edilen sistem metrikleri:
- Pod durumları (Running, Completed, Failed)
- Deployment replica durumları
- CrashLoopBackOff pod'ları

**Kontrol Komutu:**
```bash
kubectl get pods -A
kubectl get deployments -A
kubectl get pods -A --field-selector=status.phase!=Running
```

### Sprint Status

Kontrol edilen sprint bilgileri:
- Version (v6.5.1)
- Stage (final-optimization)
- Phase (predictive-autoscaling)

**Kontrol Komutu:**
```bash
kubectl get configmap ea-plan-v6-4 -n ea-web -o jsonpath='{.data}'
```

## 🔧 Master Control Script

EA Plan Master Control script'i tüm sistemi yönetmek için kullanılabilir:

```bash
# PowerShell (Windows)
./ea-plan-master-control.ps1

# Bash (Linux/Mac)
bash ./ea-plan-master-control.sh

# Alias kullanımı (eğer yapılandırıldıysa)
ea-master
```

**Özellikler:**
- GitOps sync (ArgoCD)
- Deploy operations (AIOps, SEO Observer, Auto-Remediation)
- AIOps job control
- SEO Observer CronJob control
- Observability/Security checks
- Git commit and push
- Sprint metadata update

## 📝 Sync Komutları

EA Plan sync komutları:

```bash
# Drift Monitoring
ea plan v6.4.1 sync --stage=drift-monitoring --auto

# Adaptive Tuning
ea plan v6.4.2 sync --stage=adaptive-tuning --auto

# Predictive Auto-Scaling
ea plan v6.4.3 sync --stage=predictive-autoscaling --auto

# Self-Healing
ea plan v6.4.4 sync --stage=self-healing --auto

# Security Hardening
ea plan v6.5.0 sync --stage=security-hardening --auto

# Final Optimization
ea plan v6.5.1 sync --stage=final-optimization --auto
```

## 🔍 Troubleshooting

### Yaygın Sorunlar

1. **ConfigMap bulunamadı:**
   ```bash
   kubectl get configmap <name> -n <namespace>
   # Eğer yoksa, Master Control script'i çalıştır
   ./ea-plan-master-control.ps1
   ```

2. **Pod CrashLoopBackOff:**
   ```bash
   kubectl logs <pod-name> -n <namespace> --previous
   # Self-healing mekanizması otomatik ele alacak
   ```

3. **Network Policy sorunları:**
   ```bash
   kubectl describe networkpolicy <policy-name> -n ea-web
   ```

### Dokümantasyon

- `ops/KUBECTL_TROUBLESHOOTING.md`: kubectl sorun giderme
- `ops/README_VALIDATION.md`: Deployment validation
- `CICD_GUIDE.md`: CI/CD pipeline rehberi
- `README.md`: Genel proje dokümantasyonu

## 📈 Sprint Durumu Özeti

### Tamamlanan Sprintler

| Version | Stage | Status |
|---------|-------|--------|
| v6.4.1 | Drift Monitoring | ✅ Complete |
| v6.4.2 | Adaptive Tuning | ✅ Complete |
| v6.4.3 | Predictive Auto-Scaling | ✅ Complete |
| v6.4.4 | Self-Healing | ✅ Complete |
| v6.5.0 | Security Hardening | ✅ Complete |
| v6.5.1 | Final Optimization | ✅ Complete |

### Aktif Sistem Özellikleri

- ✅ Observability: Prometheus + Grafana + Jaeger
- ✅ Auto-Scaling: HPA + Predictive Scaling
- ✅ Self-Healing: Auto-Remediation + Circuit Breaker
- ✅ Security: Network Policies + Pod Security Standards
- ✅ Adaptive Tuning: Resource Optimization

## 📚 Referanslar

- [EA Plan v6.x Audit Prompt](./EA_PLAN_V6_AUDIT_PROMPT.yaml)
- [Master Control Script](../ea-plan-master-control.ps1)
- [Audit Script](../ops/audit-ea-plan-v6.sh)
- [Kubectl Troubleshooting](../ops/KUBECTL_TROUBLESHOOTING.md)

## ✅ Son Kontrol

Audit script'i çalıştırarak tüm sistemin durumunu görebilirsiniz:

```bash
./ops/audit-ea-plan-v6.sh all
```

Çıktıda yeşil ✅ işaretleri başarılı kontrolleri, kırmızı ❌ işaretleri sorunları, sarı ⚠️ işaretleri uyarıları gösterir.

## 🚀 Production Go-Live

EA Plan v6.5.1 production activation için:

### Kullanım

**Detaylı Script Versiyonu:**
```bash
# Bash (Linux/Mac/WSL)
./ops/production-go-live.sh

# PowerShell (Windows)
.\ops\production-go-live.ps1
```

**Tek Komut Versiyonu (Copy-Paste Ready):**
```bash
# Bash - Tek satır komut
bash ops/production-go-live-one-liner.sh

# PowerShell - Tek satır komut
.\ops\production-go-live-one-liner.ps1

# Veya doğrudan ops/production-go-live-commands.txt dosyasından kopyala-yapıştır
```

**Remote Execution (GitHub'dan direkt çalıştırma):**
```bash
# GitHub'dan script'i indirip çalıştır (token ile)
CF_API_TOKEN="your_cloudflare_token" && \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/CPTSystems/ea-plan/main/ops/production-go-live.sh)"

# Güvenlik Notu: Script'i incelemeden remote execution yapmayın!
# Alternatif: Önce script'i indirin, inceleyin, sonra çalıştırın:
curl -fsSL https://raw.githubusercontent.com/CPTSystems/ea-plan/main/ops/production-go-live.sh -o /tmp/go-live.sh
# Script'i incele...
bash /tmp/go-live.sh
```

### Özellikler

1. **Pre-Prod Health Check**: Pod durumları ve staging endpoint kontrolü
2. **CDN Cache Purge**: Cloudflare cache temizleme (CF_API_TOKEN gerekli)
3. **Production Ingress**: Kubernetes Ingress yapılandırması
4. **ConfigMap Update**: Phase=production, GoLive=true
5. **GitHub Sync**: Docura pipeline tetikleme ve Git push
6. **Health Validation**: Production endpoint doğrulama

### Gereksinimler

- `kubectl` yapılandırılmış olmalı
- `CF_API_TOKEN` environment variable (Cloudflare için opsiyonel)
- `gh` CLI (GitHub Actions için opsiyonel)
- Production namespace ve service mevcut olmalı

### Sonraki Adımlar

Production go-live sonrası:
1. DNS propagation kontrolü (5-15 dakika)
2. SSL sertifika kontrolü (cert-manager)
3. Monitoring dashboard kontrolü
4. Production load test

## 🤖 FinBot Quick Inspect

FinBot servisini hızlıca incelemek ve port-forward kurmak için:

### Kullanım

```bash
# Bash
./ops/finbot-quick-inspect.sh

# PowerShell
.\ops\finbot-quick-inspect.ps1
```

### Özellikler

1. **Auto-Discovery**: FinBot pod, service, deployment'ları otomatik bulur
2. **Pod Details**: Pod durumu ve detayları
3. **Logs**: Son 300 satır log gösterimi
4. **Port-Forward**: FinBot service için otomatik port-forward (8080)
5. **Prometheus**: Prometheus port-forward (9090) - metrics sorguları için
6. **Grafana Hint**: Grafana dashboard port-forward talimatları

### Port-Forwards

Script çalıştırıldığında:
- **FinBot**: http://localhost:8080
- **Prometheus**: http://localhost:9090
- **Grafana**: Talimat verilir (manuel başlatma)

### Prometheus Queries

Port-forward sonrası Prometheus UI'da kullanılabilecek sorgular:
```
up{job=~".*finbot.*"}
finbot_failure_probability
finbot_predictive_score
```

### Grafana Dashboards

Grafana'da şu dashboard'ları arayın:
- "EA Plan - FinBot"
- "Predictive Maintenance"

