# 🔐 GitHub Actions Secrets Ekleme Rehberi - Adım Adım

**Tarih:** 2025-01-27  
**Hedef:** Production deployment için gerekli secrets'ları GitHub'a eklemek

---

## 📋 Ön Hazırlık

### 1. Gerekli Bilgileri Toplayın

Aşağıdaki bilgileri hazırlayın:
- ✅ Kubernetes kubeconfig dosyaları (production ve staging)
- ✅ JWT secret (güçlü random string)
- ✅ Cookie key (güçlü random string)
- ✅ Google OAuth credentials (Client ID, Client Secret)
- ✅ Database connection string
- ✅ Redis connection string
- ✅ Prometheus URL

**Not:** Eğer bu bilgileri bilmiyorsanız, ilgili sistem yöneticisi veya devops ekibinden alın.

---

## 🎯 Adım 1: GitHub Repository'ye Giriş

1. **GitHub'a giriş yapın:**
   - Tarayıcınızı açın
   - `https://github.com` adresine gidin
   - Giriş yapın

2. **Repository'yi açın:**
   - `https://github.com/[OWNER]/dese-ea-plan-v5` adresine gidin
   - Veya GitHub ana sayfasından repository'nizi bulun

---

## 🔑 Adım 2: Secrets Sayfasına Gidin

1. **Repository sayfasında:**
   - Üst menüden **"Settings"** sekmesine tıklayın

2. **Sol menüde:**
   - **"Secrets and variables"** seçeneğini bulun
   - Alt seçenekler açılacak

3. **"Actions"** seçeneğine tıklayın

4. **Secrets sayfası açılacak:**
   - Burada mevcut secrets'ları görebilirsiniz
   - Sağ üstte **"New repository secret"** butonunu göreceksiniz

---

## ➕ Adım 3: Secret Ekleme Ekranı

**"New repository secret"** butonuna tıkladığınızda bir form açılacak:

```
┌─────────────────────────────────────────┐
│  New secret                             │
├─────────────────────────────────────────┤
│                                         │
│  Name*                                  │
│  ┌───────────────────────────────────┐ │
│  │                                   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Secret*                                │
│  ┌───────────────────────────────────┐ │
│  │                                   │ │
│  │  (Çok satırlı metin girebilir)   │ │
│  │                                   │ │
│  └───────────────────────────────────┘ │
│                                         │
│         [Cancel]  [Add secret]         │
└─────────────────────────────────────────┘
```

**Form alanları:**
- **Name:** Secret'ın adı (büyük/küçük harf duyarlı)
- **Secret:** Secret'ın değeri (çok satırlı metin girebilirsiniz)

---

## 📝 Adım 4: Secret'ları Tek Tek Ekleyin

Aşağıdaki secret'ları **sırayla** ekleyin. Her birini ekledikten sonra "Add secret" butonuna basın.

### 4.1. KUBECONFIG_PRODUCTION

**Name:** `KUBECONFIG_PRODUCTION`

**Secret:** Production cluster'ın kubeconfig dosyasının tam içeriği

**Nasıl alınır:**
1. Kubernetes cluster'a erişiminiz olmalı
2. Kubeconfig dosyasını açın (genellikle `~/.kube/config` veya `C:\Users\YourName\.kube\config`)
3. **Tüm içeriği kopyalayın** (YAML formatında)

**Örnek format:**
```yaml
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTi...
    server: https://production-k8s.example.com
  name: production-cluster
contexts:
- context:
    cluster: production-cluster
    user: admin
  name: production-context
current-context: production-context
kind: Config
users:
- name: admin
  user:
    client-certificate-data: LS0tLS1CRUdJTi...
    client-key-data: LS0tLS1CRUdJTi...
```

**⚠️ Dikkat:**
- Tüm içeriği kopyalayın (baştan sona)
- Boşluk ve girintilere dikkat edin
- Kubeconfig çok uzun olabilir, tüm içeriği ekleyin

**"Add secret" butonuna basın.**

---

### 4.2. KUBECONFIG_STAGING

**Name:** `KUBECONFIG_STAGING`

**Secret:** Staging cluster'ın kubeconfig dosyasının tam içeriği

**Eğer staging yoksa:** Production kubeconfig'i aynen ekleyebilirsiniz.

**Nasıl alınır:** Yukarıdaki gibi (staging cluster kubeconfig'i)

**"Add secret" butonuna basın.**

---

### 4.3. JWT_SECRET

**Name:** `JWT_SECRET`

**Secret:** Güçlü random string (en az 32 karakter)

**Nasıl oluşturulur:**
- PowerShell script'i kullanabilirsiniz: `.\scripts\generate-secret.ps1 JWT_SECRET`
- Veya manuel olarak:
  - En az 32 karakter uzunluğunda
  - Rastgele harfler, sayılar ve özel karakterler içermeli
  - Güvenli bir şekilde saklanmalı

**Örnek (kullanmayın, kendi üretin):**
```
dese-ea-plan-v6.8.2-jwt-secret-key-2025-01-27-random-xyz123!@#
```

**"Add secret" butonuna basın.**

---

### 4.4. COOKIE_KEY

**Name:** `COOKIE_KEY`

**Secret:** Güçlü random string (en az 32 karakter)

**Nasıl oluşturulur:** JWT_SECRET ile aynı (farklı bir değer olmalı)

**Örnek (kullanmayın, kendi üretin):**
```
dese-ea-plan-v6.8.2-cookie-session-key-2025-01-27-random-abc456!@#
```

**"Add secret" butonuna basın.**

---

### 4.5. GOOGLE_CLIENT_ID

**Name:** `GOOGLE_CLIENT_ID`

**Secret:** Google OAuth Client ID

**Nasıl alınır:**
1. Google Cloud Console'a gidin: `https://console.cloud.google.com`
2. **APIs & Services** > **Credentials**
3. OAuth 2.0 Client ID'nizi bulun
4. **Client ID** değerini kopyalayın

**Örnek format:**
```
123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
```

**"Add secret" butonuna basın.**

---

### 4.6. GOOGLE_CLIENT_SECRET

**Name:** `GOOGLE_CLIENT_SECRET`

**Secret:** Google OAuth Client Secret

**Nasıl alınır:**
1. Google Cloud Console'da aynı OAuth 2.0 Client ID'ye gidin
2. **Client secret** değerini kopyalayın
3. **⚠️ Dikkat:** Bu değer gizli tutulmalı

**Örnek format:**
```
GOCSPX-1234567890abcdefghijklmnopqrstuv
```

**"Add secret" butonuna basın.**

---

### 4.7. GOOGLE_CALLBACK_URL

**Name:** `GOOGLE_CALLBACK_URL`

**Secret:** Production callback URL

**Format:**
```
https://api.poolfab.com.tr/api/v1/auth/google/callback
```

**⚠️ Dikkat:**
- Production domain'inizi kullanın
- URL tam olmalı (https:// ile başlamalı)
- `/api/v1/auth/google/callback` path'i eklenmiş olmalı

**"Add secret" butonuna basın.**

---

### 4.8. DATABASE_URL

**Name:** `DATABASE_URL`

**Secret:** PostgreSQL connection string

**Format:**
```
postgresql://username:password@host:5432/database_name
```

**Örnek:**
```
postgresql://dese_user:secure_password_123@db.poolfab.com.tr:5432/dese_ea_plan_v5
```

**⚠️ Dikkat:**
- `username:password@host:port/database` formatında
- Şifre özel karakterler içerebilir, URL encoding gerekebilir
- Production database bilgilerinizi kullanın

**"Add secret" butonuna basın.**

---

### 4.9. REDIS_URL

**Name:** `REDIS_URL`

**Secret:** Redis connection string

**Format:**
```
redis://:password@host:6379
```

**veya şifre yoksa:**
```
redis://host:6379
```

**Örnek:**
```
redis://:redis_password_123@redis.poolfab.com.tr:6379
```

**⚠️ Dikkat:**
- Şifre varsa `:` ile başlar (username yoksa)
- Production Redis bilgilerinizi kullanın

**"Add secret" butonuna basın.**

---

### 4.10. PROMETHEUS_URL (veya MCP_PROMETHEUS_BASE_URL)

**Name:** `PROMETHEUS_URL` (veya `MCP_PROMETHEUS_BASE_URL`)

**Secret:** Prometheus base URL

**Format:**
```
http://prometheus-service.monitoring:9090
```

**veya external URL:**
```
https://prometheus.poolfab.com.tr
```

**⚠️ Dikkat:**
- Internal URL kullanıyorsanız (Kubernetes içinden erişilecek) `http://prometheus-service.monitoring:9090` formatını kullanın
- External URL kullanıyorsanız `https://` ile başlayan tam URL'i kullanın
- Port numarası varsa ekleyin

**"Add secret" butonuna basın.**

---

## ✅ Adım 5: Secret'ları Doğrulayın

Tüm secret'ları ekledikten sonra doğrulayın:

### 5.1. GitHub UI'dan Kontrol

1. **Secrets sayfasında** tüm secret'ları görebilmelisiniz:
   - `KUBECONFIG_PRODUCTION` ✅
   - `KUBECONFIG_STAGING` ✅
   - `JWT_SECRET` ✅
   - `COOKIE_KEY` ✅
   - `GOOGLE_CLIENT_ID` ✅
   - `GOOGLE_CLIENT_SECRET` ✅
   - `GOOGLE_CALLBACK_URL` ✅
   - `DATABASE_URL` ✅
   - `REDIS_URL` ✅
   - `PROMETHEUS_URL` (veya `MCP_PROMETHEUS_BASE_URL`) ✅

2. **Her secret'ın yanında:**
   - ✅ Yeşil tick işareti görünecek
   - Değerleri göremezsiniz (güvenlik için masked)

### 5.2. PowerShell Script ile Kontrol

PowerShell'de şu komutu çalıştırın:

```powershell
.\scripts\check-github-secrets.ps1 -Environment production
```

**Beklenen çıktı:**
```
✅ KUBECONFIG_PRODUCTION: MEVCUT
✅ KUBECONFIG_STAGING: MEVCUT
✅ JWT_SECRET: MEVCUT
✅ COOKIE_KEY: MEVCUT
✅ GOOGLE_CLIENT_ID: MEVCUT
✅ GOOGLE_CLIENT_SECRET: MEVCUT
✅ GOOGLE_CALLBACK_URL: MEVCUT
✅ DATABASE_URL: MEVCUT
✅ REDIS_URL: MEVCUT
✅ PROMETHEUS_URL: MEVCUT

✅ Tüm gerekli secrets tanımlı!
```

**⚠️ Eğer hata varsa:**
- Secret adlarının tam olarak yazıldığından emin olun (büyük/küçük harf duyarlı)
- GitHub CLI'nin authenticated olduğundan emin olun: `gh auth status`

---

## 🔧 Yardımcı Script'ler

### Secret Üretme Script'i

Güçlü random secret oluşturmak için:

```powershell
.\scripts\generate-secret.ps1 JWT_SECRET
.\scripts\generate-secret.ps1 COOKIE_KEY
```

### Kubeconfig Kontrol Script'i

Kubeconfig dosyasını kontrol etmek için:

```powershell
.\scripts\validate-kubeconfig.ps1 -Path ~/.kube/config
```

---

## ⚠️ Önemli Notlar

1. **Güvenlik:**
   - Secret'ları asla kod içinde göstermeyin
   - Secret'ları log'lara yazdırmayın
   - Secret'ları paylaşmayın

2. **Secret Adları:**
   - Büyük/küçük harf duyarlıdır
   - Tam olarak yazın (KUBECONFIG_PRODUCTION, JWT_SECRET, vb.)

3. **Secret Değerleri:**
   - Çok uzun değerler olabilir (özellikle kubeconfig)
   - Çok satırlı değerler girebilirsiniz
   - Boşluk ve özel karakterler kullanılabilir

4. **Düzenleme:**
   - Secret'ları düzenlemek için secret'ın yanındaki "Edit" butonuna tıklayın
   - Secret'ları silmek için "Delete" butonuna tıklayın

---

## 📚 İlgili Dokümanlar

- `docs/GITHUB_ACTIONS_SECRETS.md` - Secrets yapılandırma rehberi
- `docs/WORKFLOW_EXECUTION_GUIDE.md` - Workflow detayları
- `docs/DEPLOYMENT_CHECKLIST.md` - Hızlı checklist

---

## 🆘 Sorun Giderme

### Secret göremiyorum

- **Sebep:** Secret adı yanlış yazılmış olabilir
- **Çözüm:** Secret adını kontrol edin (büyük/küçük harf duyarlı)

### GitHub CLI hatası

- **Sebep:** GitHub CLI authenticated değil
- **Çözüm:** `gh auth login` komutu ile giriş yapın

### Kubeconfig çok uzun

- **Sebep:** Normal, kubeconfig dosyaları uzun olabilir
- **Çözüm:** Tüm içeriği kopyalayın, GitHub UI çok uzun metinleri destekler

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 1.0

