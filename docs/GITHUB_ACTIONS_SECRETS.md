# GitHub Actions Secrets Yapılandırma Rehberi

Bu dokümanda, Dese EA Plan v6.8.2 için GitHub Actions secrets yapılandırması açıklanmaktadır.

## 📋 Gerekli Secrets Listesi

### 🔐 Kubernetes Kubeconfig Secrets (Zorunlu)

#### Production Environment
- **`KUBECONFIG_PRODUCTION`** ✅ **ZORUNLU**
  - Production Kubernetes cluster kubeconfig dosyası
  - Base64 encoded veya raw kubeconfig içeriği
  - Deployment workflow'u production environment seçildiğinde kullanılır

#### Staging Environment
- **`KUBECONFIG_STAGING`** ✅ **ZORUNLU**
  - Staging Kubernetes cluster kubeconfig dosyası
  - Base64 encoded veya raw kubeconfig içeriği
  - Deployment workflow'u staging environment seçildiğinde kullanılır

**Not:** En az biri (production için `KUBECONFIG_PRODUCTION`, staging için `KUBECONFIG_STAGING`) tanımlı olmalıdır.

---

### 🏭 Production Environment Secrets (Production için Zorunlu)

Production environment seçildiğinde aşağıdaki secrets **mutlaka** tanımlanmalıdır:

#### Security Secrets
- **`JWT_SECRET`** ✅ **ZORUNLU (Production)**
  - JWT token imzalama için kullanılan secret key
  - Minimum 32 karakter olmalı
  - Örnek: `ea-plan-master-control-v6.8.1-super-secret-jwt-key-min-32-chars`

- **`COOKIE_KEY`** ✅ **ZORUNLU (Production)**
  - Cookie session imzalama için kullanılan secret key
  - Minimum 32 karakter olmalı
  - Örnek: `ea-plan-master-control-v6.8.2-cookie-session-secret-key-min-32-chars`

#### Google OAuth Secrets
- **`GOOGLE_CLIENT_ID`** ✅ **ZORUNLU (Production)**
  - Google OAuth 2.0 Client ID
  - Format: `xxxxx.apps.googleusercontent.com`

- **`GOOGLE_CLIENT_SECRET`** ✅ **ZORUNLU (Production)**
  - Google OAuth 2.0 Client Secret
  - Format: `GOCSPX-xxxxx`

- **`GOOGLE_CALLBACK_URL`** ✅ **ZORUNLU (Production)**
  - Google OAuth callback URL
  - Production: `https://api.poolfab.com.tr/api/v1/auth/google/callback`
  - Staging: `https://api-staging.poolfab.com.tr/api/v1/auth/google/callback`

#### Database & Cache Secrets
- **`DATABASE_URL`** ✅ **ZORUNLU (Production)**
  - PostgreSQL database connection string
  - Format: `postgresql://user:password@host:port/database`
  - Örnek: `postgresql://dese:dese123@db-host:5432/dese_ea_plan_v5`

- **`REDIS_URL`** ✅ **ZORUNLU (Production)**
  - Redis connection string
  - Format: `redis://host:port` veya `redis://:password@host:port`
  - Örnek: `redis://redis-host:6379` veya `redis://:password@redis-host:6379`

#### Monitoring Secrets (En Az Biri Zorunlu)
- **`PROMETHEUS_URL`** ⚠️ **KOŞULLU (Production)**
  - Prometheus base URL
  - Örnek: `http://prometheus-service.monitoring:9090`
  - **VEYA** `MCP_PROMETHEUS_BASE_URL` tanımlı olmalı

- **`MCP_PROMETHEUS_BASE_URL`** ⚠️ **KOŞULLU (Production)**
  - MCP Dashboard için Prometheus base URL
  - Örnek: `http://prometheus-service.monitoring:9090`
  - **VEYA** `PROMETHEUS_URL` tanımlı olmalı

**Not:** `PROMETHEUS_URL` veya `MCP_PROMETHEUS_BASE_URL` en az biri tanımlı olmalıdır.

---

### 📋 Opsiyonel Secrets

#### Notification Secrets
- **`SLACK_WEBHOOK`** (Opsiyonel)
  - Slack webhook URL for deployment notifications
  - Rollback işlemlerinde bildirim göndermek için kullanılır

#### External API Keys (Opsiyonel)
- **`OPENAI_API_KEY`** (Opsiyonel)
  - OpenAI API key for AI features

- **`AHREFS_API_KEY`** (Opsiyonel)
  - Ahrefs API key for SEO analysis

- **`LIGHTHOUSE_CI_TOKEN`** (Opsiyonel)
  - Lighthouse CI token for performance testing

---

## 🔧 Secrets Ayarlama

### GitHub Repository Secrets Ekleme

1. **Repository'ye gidin:**
   - GitHub repository sayfanızı açın
   - Örnek: `https://github.com/your-org/dese-ea-plan-v5`

2. **Settings > Secrets and variables > Actions:**
   - Repository sayfasında **Settings** sekmesine tıklayın
   - Sol menüden **Secrets and variables** > **Actions** seçeneğine gidin

3. **New repository secret:**
   - **New repository secret** butonuna tıklayın
   - **Name:** Secret adını girin (örn: `KUBECONFIG_PRODUCTION`)
   - **Secret:** Secret değerini girin veya yapıştırın
   - **Add secret** butonuna tıklayın

### Kubeconfig Secret Hazırlama

```bash
# Kubeconfig dosyanızı base64 encode edin
cat ~/.kube/config | base64 -w 0

# Veya raw olarak kopyalayın
cat ~/.kube/config

# GitHub Actions secrets'a ekleyin
```

**Not:** Kubeconfig secret'ı base64 encoded veya raw formatında olabilir. GitHub Actions workflow her iki formatı da destekler.

---

## ✅ Doğrulama

### Workflow'da Otomatik Doğrulama

Deployment workflow'u (`deploy.yml`) aşağıdaki validasyonları otomatik olarak yapar:

1. **Kubeconfig Secret Validation:**
   - Her job başlamadan önce kubeconfig secret'ının varlığını kontrol eder
   - Eksikse fail-fast hatası verir ve açıklayıcı mesaj gösterir

2. **Production Environment Validation:**
   - Production environment seçildiğinde tüm gerekli secrets'ı kontrol eder
   - Eksik secrets için detaylı hata mesajı gösterir
   - Validasyon adımları:
     - JWT_SECRET ✓
     - COOKIE_KEY ✓
     - GOOGLE_CLIENT_ID ✓
     - GOOGLE_CLIENT_SECRET ✓
     - GOOGLE_CALLBACK_URL ✓
     - DATABASE_URL ✓
     - REDIS_URL ✓
     - PROMETHEUS_URL veya MCP_PROMETHEUS_BASE_URL ✓

### Manuel Doğrulama

Workflow'u çalıştırarak secrets'ların doğru tanımlandığını kontrol edebilirsiniz:

1. **Actions** sekmesine gidin
2. **🚀 Automated Deployment** workflow'unu seçin
3. **Run workflow** butonuna tıklayın
4. **Environment:** seçin (staging veya production)
5. **Strategy:** seçin (rolling, canary, blue-green)
6. **Run workflow** butonuna tıklayın

Workflow çalıştığında:
- ✅ Secrets doğruysa: Validation step'leri geçer, deployment başlar
- ❌ Secrets eksikse: Açıklayıcı hata mesajı gösterilir ve workflow fail eder

---

## 🔍 Troubleshooting

### Kubeconfig Secret Sorunları

**Problem:** `Kubeconfig secret is missing or empty!`

**Çözüm:**
1. GitHub Actions secrets'da `KUBECONFIG_PRODUCTION` veya `KUBECONFIG_STAGING` tanımlı mı kontrol edin
2. Secret'ın boş olmadığından emin olun
3. Workflow'daki environment input'unun doğru olduğunu kontrol edin

### Production Secrets Sorunları

**Problem:** `Missing required production secrets!`

**Çözüm:**
1. Production environment için tüm zorunlu secrets'ları kontrol edin:
   - JWT_SECRET
   - COOKIE_KEY
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - GOOGLE_CALLBACK_URL
   - DATABASE_URL
   - REDIS_URL
   - PROMETHEUS_URL veya MCP_PROMETHEUS_BASE_URL

2. Secret'ların doğru yazıldığından emin olun (case-sensitive)
3. Secret değerlerinin boş olmadığından emin olun

### Prometheus URL Sorunları

**Problem:** `PROMETHEUS_URL or MCP_PROMETHEUS_BASE_URL` eksik

**Çözüm:**
- `PROMETHEUS_URL` veya `MCP_PROMETHEUS_BASE_URL` en az birini tanımlayın
- İkisi de tanımlıysa, `PROMETHEUS_URL` önceliklidir

---

## 📚 İlgili Dokümantasyon

- [Deployment Workflow](./DEPLOYMENT_STATUS.md) - Deployment durumu ve adımları
- [API Validation Commands](./API_VALIDATION_COMMANDS.md) - API endpoint test komutları
- [Google OAuth Setup](./GOOGLE_OAUTH_SETUP.md) - Google OAuth yapılandırması

---

## 🔒 Güvenlik Notları

- ⚠️ **Secrets asla** kod repository'sine commit edilmemelidir
- ⚠️ **Secrets asla** loglarda veya console output'ta görüntülenmemelidir
- ⚠️ **Secrets rotation:** Düzenli olarak secrets'ları rotate edin
- ⚠️ **Access control:** Sadece gerekli kişilere secret erişimi verin
- ⚠️ **Backup:** Secrets'ları güvenli bir şekilde backup alın

---

**Son Güncelleme:** 2025-01-27

