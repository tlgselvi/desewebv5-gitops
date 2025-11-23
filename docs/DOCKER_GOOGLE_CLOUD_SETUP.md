# 🐳 Docker ile Google Cloud Yapılandırması

**Proje:** Dese EA Plan v6.8.2  
**Tarih:** 2025-01-27  
**Durum:** ✅ Docker Local Setup

---

## 📋 Google Cloud Console'dan Alınması Gerekenler

### 1. Google Search Console (GSC) Service Account

1. **Google Cloud Console'a gidin:**
   - https://console.cloud.google.com
   - Proje: `ea-plan-seo-project` (veya kendi projeniz)

2. **Service Account Oluşturun:**
   - **APIs & Services** > **Credentials**
   - **Create Credentials** > **Service Account**
   - **Service Account Name:** `dese-gsc-service-account`
   - **Role:** `Viewer` (veya `Search Console API User`)

3. **JSON Key İndirin:**
   - Service Account'a tıklayın
   - **Keys** sekmesi > **Add Key** > **Create new key**
   - **Key type:** JSON
   - İndirilen dosyayı `gcp-credentials.json` olarak kaydedin

4. **GSC Property'ye Erişim Verin:**
   - Google Search Console'a gidin: https://search.google.com/search-console
   - Property Settings > **Users and permissions**
   - Service Account email'ini ekleyin (örn: `dese-gsc-service-account@ea-plan-seo-project.iam.gserviceaccount.com`)

### 2. Google OAuth 2.0 Credentials (Zaten Mevcut)

- **Client ID:** `725504779947-gsn3f877ho3qj77e581qjm29auaecb84.apps.googleusercontent.com`
- **Client Secret:** Google Cloud Console'dan alın
- **Callback URL:** `http://localhost:3000/api/v1/auth/google/callback`

### 3. Google Maps API Key

1. **Google Cloud Console:**
   - **APIs & Services** > **Credentials**
   - **Create Credentials** > **API Key**
   - Key'i kopyalayın

### 4. Google Business Profile API Key

1. **Google Cloud Console:**
   - **APIs & Services** > **Library**
   - **Google Business Profile API**'yi etkinleştirin
   - **Credentials** > **Create Credentials** > **API Key**

---

## 🔧 Docker Yapılandırması

### 1. Credentials Dosyalarını Yerleştirin

Proje root dizininde şu dosyalar olmalı:

```
desewebv5/
├── gcp-credentials.json          # GSC Service Account JSON key
├── client_secret_*.json          # Google OAuth credentials (opsiyonel)
└── .env                          # Environment variables
```

### 2. Environment Variables (.env)

`.env` dosyanıza şu değişkenleri ekleyin:

```bash
# Google Search Console (GSC)
GSC_PROJECT_ID=ea-plan-seo-project
GSC_CLIENT_EMAIL=dese-gsc-service-account@ea-plan-seo-project.iam.gserviceaccount.com
GSC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GSC_PROPERTY_URL=https://poolfab.com.tr

# Google OAuth
GOOGLE_CLIENT_ID=725504779947-gsn3f877ho3qj77e581qjm29auaecb84.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# Google Maps API
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Google Business Profile API
GOOGLE_BUSINESS_API_KEY=your-google-business-api-key
```

**Not:** `GSC_PRIVATE_KEY` için JSON key dosyasından `private_key` değerini alın ve `\n` karakterlerini koruyun.

### 3. Docker Compose Yapılandırması

`docker-compose.yml` dosyası otomatik olarak:
- `gcp-credentials.json` dosyasını container'a mount eder
- `GOOGLE_APPLICATION_CREDENTIALS` environment variable'ını ayarlar
- Tüm Google API environment variable'larını container'a geçirir

---

## 🚀 Kullanım

### 1. Credentials Dosyalarını Hazırlayın

```bash
# GSC Service Account JSON key'i indirin ve proje root'a koyun
# Dosya adı: gcp-credentials.json
```

### 2. Environment Variables'ı Ayarlayın

```bash
# .env dosyasını düzenleyin
cp env.example .env
# .env dosyasındaki Google Cloud değişkenlerini doldurun
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

---

## 🔍 Doğrulama

### 1. Container İçinde Credentials Kontrolü

```bash
# Container'a girin
docker compose exec app sh

# Credentials dosyasını kontrol edin
ls -la /app/gcp-credentials.json
cat /app/gcp-credentials.json | head -5

# Environment variable'ları kontrol edin
echo $GOOGLE_APPLICATION_CREDENTIALS
echo $GSC_PROJECT_ID
echo $GOOGLE_CLIENT_ID
```

### 2. Google API Bağlantı Testi

```bash
# Container içinde
node -e "
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
});
auth.getClient().then(client => {
  console.log('✅ Google Auth başarılı!');
}).catch(err => {
  console.error('❌ Google Auth hatası:', err.message);
});
"
```

---

## 📝 Notlar

### GSC_PRIVATE_KEY Formatı

JSON key dosyasından `private_key` değerini alırken:

```json
{
  "type": "service_account",
  "project_id": "ea-plan-seo-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  ...
}
```

`.env` dosyasında:

```bash
GSC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**Önemli:** `\n` karakterlerini koruyun, tek satıra çevirmeyin!

### Alternatif: JSON Key Dosyası Kullanımı

Eğer `GSC_PRIVATE_KEY` yerine doğrudan JSON key dosyası kullanmak isterseniz:

```bash
# .env dosyasında
GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-credentials.json
```

Bu durumda `GSC_CLIENT_EMAIL` ve `GSC_PRIVATE_KEY` gerekmez, JSON dosyasından otomatik okunur.

---

## 🔒 Güvenlik

1. ✅ `gcp-credentials.json` `.gitignore`'da
2. ✅ `client_secret_*.json` `.gitignore`'da
3. ✅ `.env` dosyası `.gitignore`'da
4. ⚠️ Production'da secrets management kullanın (Kubernetes Secrets, etc.)

---

## 🐛 Sorun Giderme

### Hata: "Could not load the default credentials"

**Çözüm:**
- `gcp-credentials.json` dosyasının container içinde `/app/gcp-credentials.json` yolunda olduğundan emin olun
- `GOOGLE_APPLICATION_CREDENTIALS` environment variable'ının doğru ayarlandığını kontrol edin

### Hata: "Invalid credentials"

**Çözüm:**
- Service Account JSON key'inin geçerli olduğundan emin olun
- Service Account email'inin GSC property'ye eklendiğini kontrol edin
- API'lerin etkinleştirildiğini kontrol edin (Search Console API, Maps API, etc.)

### Hata: "Permission denied"

**Çözüm:**
- Service Account'a gerekli IAM rollerini verin
- GSC property'de Service Account email'ine erişim verin

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 1.0

