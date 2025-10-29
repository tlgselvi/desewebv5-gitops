# Prometheus Query Guide

## 🎯 Nasıl Kullanılır

1. Prometheus UI'ya gidin: `http://localhost:9090/graph`
2. Query kutusuna query yazın
3. "Execute" butonuna tıklayın
4. Sonuçları tablo veya grafik olarak görün

## 📋 Query Örnekleri

### Tüm Aktif Job'lar
```
up
```

### Namespace Bazlı
```
up{namespace="aiops"}
up{namespace="monitoring"}
```

### Instance & Job Bazlı
```
up{instance="localhost:9090", job="prometheus"}
up{job="prometheus"}
```

### Pod/Service İsmi Bazlı (Namespace ile birlikte)
```
up{pod=~".*finbot.*", namespace="aiops"}
up{service="finbot", namespace="aiops"}
up{service="mubot", namespace="aiops"}
```

### FinBot Metrics
```
finbot_cost_prediction
finbot_cost_prediction{period="30d"}
finbot_roi_score
finbot_predictive_score
finbot_cost_correlation
finbot_budget_variance
```

### MuBot Metrics
```
mubot_data_sources_count
mubot_data_quality
mubot_ingestion_success_rate
mubot_failure_probability
mubot_data_freshness_seconds
mubot_ingestion_errors_total
```

### Kombinasyon Query'leri
```
# FinBot predictive score ve ROI birlikte
finbot_predictive_score > 80 and finbot_roi_score > 70

# MuBot başarısızlık riski yüksek kaynaklar
mubot_failure_probability > 0.1

# AIOps namespace'deki tüm özel metrics
{__name__=~"finbot_.*|mubot_.*", namespace="aiops"}
```

## ⚠️ Sorun Giderme

**Query kutusu görünmüyorsa:**
- Sayfayı yenileyin (F5)
- Port-forward'un çalıştığını kontrol edin
- Doğru URL: `http://localhost:9090/graph`

**Query boş dönüyorsa:**
- Pod'ların Running olduğundan emin olun
- Metrics export ediliyor mu kontrol edin
- Alternatif query'leri deneyin

**`label_values()` hatası:**
- Bu fonksiyon Grafana'ya özeldir, Prometheus'da çalışmaz
- Alternatif: `up` query'sini kullanın (tablo sonuçlarında `job` kolonuna bakın)
- Veya API kullanın: `Invoke-RestMethod -Uri "http://localhost:9090/api/v1/label/job/values"`

**Metrics görünmüyorsa:**
1. Pod'ları kontrol edin: `kubectl get pods -n aiops`
2. Metrics endpoint'i test edin: `kubectl exec <pod-name> -n aiops -- curl http://localhost:8080/metrics`
3. Prometheus scrape config kontrol edin (ServiceMonitor veya annotations)

## 🔗 İlgili Dosyalar

- `ops/prometheus-query-examples.md` - Detaylı query örnekleri
- `ops/finbot-quick-inspect.ps1` - FinBot test script'i
