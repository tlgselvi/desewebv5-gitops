# 🚀 Docker Quick Start - Google Cloud Entegrasyonu

**Proje:** Dese EA Plan v6.8.2  
**Tarih:** 2025-01-27

---

## ⚡ Hızlı Başlangıç

### 1. Google Cloud Console'dan Credentials Alın

Detaylı adımlar için: [DOCKER_GOOGLE_CLOUD_SETUP.md](./DOCKER_GOOGLE_CLOUD_SETUP.md)

**Özet:**
1. Google Cloud Console: https://console.cloud.google.com
2. Service Account oluşturun ve JSON key indirin
3. JSON key'i `gcp-credentials.json` olarak proje root'una kaydedin

### 2. Environment Variables Ayarlayın

```bash
# .env dosyasını oluşturun
cp env.example .env

# .env dosyasını düzenleyin ve Google Cloud değişkenlerini doldurun:
# - GSC_PROJECT_ID
# - GSC_CLIENT_EMAIL
# - GSC_PRIVATE_KEY (JSON key'den private_key değeri)
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET
# - GOOGLE_MAPS_API_KEY
# - GOOGLE_BUSINESS_API_KEY
```

### 3. Docker Compose ile Başlatın

```bash
# Tüm servisleri başlat
docker compose up --build -d

# Veritabanı migration'ını çalıştırın (ilk kurulumda)
docker compose exec app pnpm db:migrate

# Servisleri kontrol edin
docker compose ps
```

### 4. Doğrulama

```bash
# Container loglarını kontrol edin
docker compose logs app

# Container içinde credentials kontrolü
docker compose exec app ls -la /app/gcp-credentials.json
docker compose exec app env | grep GOOGLE
```

---

## 📋 Gerekli Dosyalar

Proje root dizininde şu dosyalar olmalı:

```
desewebv5/
├── gcp-credentials.json          # ✅ GSC Service Account JSON key
├── .env                          # ✅ Environment variables
└── docker-compose.yml            # ✅ Docker Compose config
```

---

## 🔧 Yapılandırma Detayları

### Google Cloud Credentials

**Dosya:** `gcp-credentials.json`

```json
{
  "type": "service_account",
  "project_id": "ea-plan-seo-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "service-account@ea-plan-seo-project.iam.gserviceaccount.com",
  ...
}
```

### Environment Variables (.env)

```bash
# Google Search Console
GSC_PROJECT_ID=ea-plan-seo-project
GSC_CLIENT_EMAIL=service-account@ea-plan-seo-project.iam.gserviceaccount.com
GSC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GSC_PROPERTY_URL=https://poolfab.com.tr

# Google OAuth
GOOGLE_CLIENT_ID=725504779947-gsn3f877ho3qj77e581qjm29auaecb84.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# Google Maps & Business
GOOGLE_MAPS_API_KEY=your-maps-api-key
GOOGLE_BUSINESS_API_KEY=your-business-api-key
```

---

## 🐛 Sorun Giderme

### Hata: "gcp-credentials.json: no such file or directory"

**Çözüm:**
- `gcp-credentials.json` dosyasının proje root'unda olduğundan emin olun
- Dosya adının tam olarak `gcp-credentials.json` olduğunu kontrol edin

### Hata: "Could not load the default credentials"

**Çözüm:**
- `GOOGLE_APPLICATION_CREDENTIALS` environment variable'ının `/app/gcp-credentials.json` olarak ayarlandığını kontrol edin
- Container içinde dosyanın var olduğunu kontrol edin: `docker compose exec app ls -la /app/gcp-credentials.json`

### Hata: "Invalid credentials"

**Çözüm:**
- Service Account JSON key'inin geçerli olduğundan emin olun
- Service Account email'inin GSC property'ye eklendiğini kontrol edin
- API'lerin etkinleştirildiğini kontrol edin

---

## 📚 Daha Fazla Bilgi

- **Detaylı Setup:** [DOCKER_GOOGLE_CLOUD_SETUP.md](./DOCKER_GOOGLE_CLOUD_SETUP.md)
- **API Integration:** [seo/API_INTEGRATION_GUIDE.md](../seo/API_INTEGRATION_GUIDE.md)

---

**Son Güncelleme:** 2025-01-27

