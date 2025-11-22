# 🔐 Google OAuth Secret Güncelleme Rehberi

**Tarih:** 2025-11-22  
**Durum:** ⚠️ Secret'a Google OAuth credentials eklenmeli

---

## 📋 Durum Özeti

### ✅ Tamamlanan
- ✅ Frontend URL düzeltmesi
- ✅ Deployment environment variables eklendi
- ✅ Google Cloud Console JavaScript origins güncellendi
- ✅ Google Cloud Console redirect URI doğru

### ❌ Eksik
- ❌ `dese-secrets` Secret'ında `GOOGLE_CLIENT_ID` eksik
- ❌ `dese-secrets` Secret'ında `GOOGLE_CLIENT_SECRET` eksik

---

## 🔧 Secret Güncelleme Adımları

### Adım 1: Google Cloud Console'dan Credentials Al

1. **Google Cloud Console'a git:**
   ```
   https://console.cloud.google.com/apis/credentials
   ```

2. **OAuth 2.0 Client ID'yi aç:**
   - Project: EA Plan SEO Project
   - OAuth 2.0 Client ID'yi seç

3. **Client ID ve Secret'ı kopyala:**
   - **Client ID:** `725504779947-gsn3f877ho3qj77e581qjm29auaecb84.apps.googleusercontent.com`
   - **Client Secret:** `****yoE1` (Maskelenmiş, ancak Client secrets bölümünden alınabilir)
   - **Not:** Eğer secret görünmüyorsa, yeni bir secret oluşturmanız gerekebilir

### Adım 2: Secret'ı Güncelle (PowerShell)

**Seçenek A: Patch ile Güncelle (Önerilen)**

```powershell
# Google OAuth credentials
$clientId = "725504779947-gsn3f877ho3qj77e581qjm29auaecb84.apps.googleusercontent.com"
$clientSecret = "YOUR_CLIENT_SECRET_BURAYA"  # Google Console'dan alın

# Base64 encode
$clientIdBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($clientId))
$clientSecretBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($clientSecret))

# Patch secret
$patch = "[{\"op\":\"add\",\"path\":\"/data/GOOGLE_CLIENT_ID\",\"value\":\"$clientIdBase64\"},{\"op\":\"add\",\"path\":\"/data/GOOGLE_CLIENT_SECRET\",\"value\":\"$clientSecretBase64\"}]"
kubectl patch secret dese-secrets -n default --type="json" -p=$patch
```

**Seçenek B: Secret'ı Sil ve Yeniden Oluştur**

```bash
# 1. Secret'ı sil
kubectl delete secret dese-secrets -n default

# 2. Yeni secret oluştur (TÜM değerlerle)
kubectl create secret generic dese-secrets \
  --from-literal=SLACK_WEBHOOK="YOUR_WEBHOOK_URL" \
  --from-literal=GOOGLE_CLIENT_ID="725504779947-gsn3f877ho3qj77e581qjm29auaecb84.apps.googleusercontent.com" \
  --from-literal=GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET" \
  -n default
```

### Adım 3: Deployment Restart

```bash
kubectl rollout restart deployment dese-api-deployment -n default
kubectl rollout status deployment dese-api-deployment -n default
```

### Adım 4: Doğrulama

```bash
# Secret kontrolü
kubectl get secret dese-secrets -n default -o jsonpath='{.data.GOOGLE_CLIENT_ID}' | base64 -d

# Pod log kontrolü
kubectl logs -n default -l app=dese-api --tail=50 | grep -i "google\|oauth"
```

---

## 🧪 Test

### 1. Browser Test

1. **Frontend login sayfası:**
   ```
   https://app.poolfab.com.tr/login
   ```

2. **Google login butonuna tıkla:**
   - Google OAuth consent screen açılmalı
   - URL: `https://accounts.google.com/o/oauth2/v2/auth?...`

3. **Google hesabıyla giriş yap:**
   - Consent screen'de izin ver
   - Callback: `https://api.poolfab.com.tr/api/v1/auth/google/callback`
   - Frontend'e redirect: `https://app.poolfab.com.tr/`

### 2. API Test

```bash
# Google OAuth URL test
curl -I https://api.poolfab.com.tr/api/v1/auth/google

# Beklenen: 302 Redirect
# Location: https://accounts.google.com/o/oauth2/v2/auth?...
```

---

## ⚠️ Notlar

1. **Client Secret Görünmüyorsa:**
   - Google Cloud Console > OAuth 2.0 Client ID > Client secrets bölümü
   - Yeni secret oluştur gerekirse
   - Eski secret'ı disable et

2. **Secret Güncellendikten Sonra:**
   - Deployment restart gerekli
   - Pod'lar yeni secret değerlerini alacak
   - Değişiklikler hemen etkili olacak

3. **Google Cloud Console Değişiklikleri:**
   - JavaScript origins güncellendi ✅
   - Redirect URI doğru ✅
   - 5 dakika - birkaç saat içinde etkili olabilir

---

## ✅ Beklenen Sonuç

Secret güncellendikten ve deployment restart edildikten sonra:

1. **Frontend (https://app.poolfab.com.tr/login):**
   - Google login butonuna tıklandığında
   - `https://api.poolfab.com.tr/api/v1/auth/google` adresine yönlendirir
   - Google OAuth consent screen açılır

2. **Backend (https://api.poolfab.com.tr/api/v1/auth/google):**
   - Google OAuth consent screen'e yönlendirir
   - 302 Redirect döndürür

3. **Callback (https://api.poolfab.com.tr/api/v1/auth/google/callback):**
   - Google authentication tamamlandıktan sonra
   - JWT token ile frontend'e redirect
   - Frontend: `https://app.poolfab.com.tr/`

---

## 📝 Özet

**Durum:** Kod ve yapılandırma hazır, Secret'a credentials eklenmeli.

**Yapılması Gerekenler:**
1. ✅ Google Cloud Console credentials al
2. ⚠️ Secret'a credentials ekle
3. ⚠️ Deployment restart et
4. ⚠️ Test et

**Sonuç:** Secret güncellendikten sonra Google OAuth çalışacak.

