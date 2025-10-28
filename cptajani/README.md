# CPT Ajanı v1.0 - Sistem Uyumlu Web/API Ajanı

## 📋 Genel Bakış

CPT Ajanı v1.0, EA Plan v6.2 ile tam uyumlu bir web/API ajanı sistemidir. FastAPI backend ve React TypeScript frontend ile Kubernetes, GitOps, AIOps, Security ve Observability katmanlarını entegre eder.

## 🏗️ Mimari

### Monorepo Yapısı
```
cptajani/
├── backend/                 # FastAPI Backend
│   ├── app/
│   │   ├── main.py         # Ana uygulama
│   │   ├── routers/        # API endpoint'leri
│   │   ├── core/           # Ajan karar döngüsü
│   │   ├── adapters/       # Dış sistem entegrasyonları
│   │   └── schemas/        # Pydantic modelleri
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # React TypeScript Frontend
│   ├── src/
│   │   ├── pages/         # Sayfa bileşenleri
│   │   ├── components/    # UI bileşenleri
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
└── ops/                   # Operasyonel Dosyalar
    ├── k8s/              # Kubernetes manifestleri
    ├── gitops/           # ArgoCD uygulamaları
    └── policies/         # Güvenlik politikaları
```

## 🚀 Hızlı Başlangıç

### Lokal Geliştirme

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

### Kubernetes Dağıtımı

```bash
# Namespace oluştur
kubectl apply -f ops/k8s/namespace.yaml

# Tüm manifestleri uygula
kubectl apply -f ops/k8s/

# ArgoCD uygulamasını ekle
kubectl apply -f ops/gitops/argocd-app.yaml
```

## 📡 API Endpoint'leri

### Ana Endpoint'ler
- `GET /` - Servis durumu
- `GET /api/v1/health` - Sağlık kontrolü
- `POST /api/v1/act` - Ajan aksiyonları
- `POST /api/v1/train` - Model eğitimi
- `POST /api/v1/metrics` - Metrik sorguları

### Desteklenen Intent'ler
- `k8s.logs` - Kubernetes logları
- `prophet.tune` - Prophet model ayarları
- `metrics.query` - Prometheus sorguları
- `argo.sync` - ArgoCD senkronizasyonu
- `data.ingest` - Veri girişi
- `anomaly.detect` - Anomali tespiti

## 🎯 KPI Hedefleri

- **Accuracy:** ≥ 90%
- **False Positive Rate:** ≤ 3%
- **Correlation:** ≥ 0.9
- **Latency:** < 6s

## 🔧 Konfigürasyon

### Environment Variables
```bash
ENVIRONMENT=production
LOG_LEVEL=info
API_ENDPOINT=http://localhost:8080
```

### Secrets
Kubernetes secret'ları `ops/k8s/servicemonitor.yaml` dosyasında tanımlanmıştır.

## 📊 Monitoring

### Prometheus Metrikleri
- CPU/Memory kullanımı
- API response time
- Error rate
- Custom business metrics

### Grafana Dashboard
- KPI metrikleri
- Sistem performansı
- Anomali tespiti
- SEO skorları

## 🔒 Güvenlik

### Kyverno Politikaları
- Privileged container yasağı
- Resource limit zorunluluğu
- Non-root user zorunluluğu
- Read-only filesystem

### Network Policies
- Pod-to-pod iletişim kısıtlamaları
- Egress/Ingress kontrolü
- Namespace izolasyonu

## 🚀 Roadmap

### v1.0 (Mevcut)
- ✅ API + Dashboard iskeleti
- ✅ K8s deploy
- ✅ RBAC read-only

### v1.1 (Planlanan)
- 🔄 Git commit üzerinden config yazma
- 🔄 Argo sync
- 🔄 OAuth2 (Keycloak)

### v1.2 (Gelecek)
- 🔄 SEO/GSC entegrasyonu
- 🔄 Alerting kuralları
- 🔄 Mobil API optimizasyonları

## 🧪 Test

### API Test
```bash
curl -X POST http://localhost:8080/api/v1/act \
  -H 'Content-Type: application/json' \
  -d '{"intent":"prophet.tune","params":{"changepoint_prior_scale":0.2}}'
```

### Health Check
```bash
curl http://localhost:8080/api/v1/health
```

## 📝 Notlar

- Ajan "mutation" işlemlerini sadece intent açıkça izin verdiğinde yapar
- Tüm aksiyonlar audit-log'a yazılır
- Prod ortamında secrets → External Secrets / Vault kullanılmalıdır
- Adapter'lar şu an stub; gerçek API entegrasyonları eklenmelidir

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
