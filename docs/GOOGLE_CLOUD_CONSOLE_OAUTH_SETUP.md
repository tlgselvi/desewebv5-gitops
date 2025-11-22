# 🔐 Google Cloud Console OAuth Yapılandırması

**Tarih:** 2025-11-22  
**Durum:** ✅ Redirect URI doğru, JavaScript origins güncellenmeli

---

## 📋 Mevcut Durum

### ✅ Doğru Yapılandırılmış

**Authorized redirect URIs (Web server requests):**
- ✅ `https://api.poolfab.com.tr/api/v1/auth/google/callback`

### ⚠️ Güncellenmesi Gereken

**Authorized JavaScript origins (Browser requests):**
- ❌ `http://localhost:3001` (Production'da kaldırılmalı)
- ❌ `http://localhost:3000` (Production'da kaldırılmalı)

---

## ✅ Önerilen Production Yapılandırması

### 1. Authorized JavaScript origins

**Mevcut:**
```
http://localhost:3001
http://localhost:3000
```

**Olması Gereken (Production):**
```
https://app.poolfab.com.tr
https://api.poolfab.com.tr
```

**Açıklama:**
- `https://app.poolfab.com.tr` - Frontend origin (Google login butonu burada)
- `https://api.poolfab.com.tr` - Backend API origin (OAuth endpoint'leri burada)

### 2. Authorized redirect URIs

**Mevcut (Doğru ✅):**
```
https://api.poolfab.com.tr/api/v1/auth/google/callback
```

**Opsiyonel (Development için):**
```
http://localhost:3000/api/v1/auth/google/callback
```

**Açıklama:**
- Production callback URL doğru yapılandırılmış
- Development için localhost callback URL eklenebilir (opsiyonel)

---

## 🔧 Güncelleme Adımları

### Adım 1: JavaScript Origins Güncelle

1. Google Cloud Console > APIs & Services > Credentials
2. OAuth 2.0 Client ID'yi aç
3. **Authorized JavaScript origins** bölümüne gidin
4. **Mevcut localhost URL'lerini sil veya değiştir:**
   - ❌ `http://localhost:3001` → Sil veya Değiştir
   - ❌ `http://localhost:3000` → Sil veya Değiştir
5. **Production URL'lerini ekle:**
   - ✅ `https://app.poolfab.com.tr` → Ekle
   - ✅ `https://api.poolfab.com.tr` → Ekle

### Adım 2: Redirect URIs Kontrol Et

1. **Authorized redirect URIs** bölümüne gidin
2. **Mevcut production URL'i kontrol et:**
   - ✅ `https://api.poolfab.com.tr/api/v1/auth/google/callback` (Zaten var ✅)
3. **Development için (opsiyonel) localhost ekle:**
   - `http://localhost:3000/api/v1/auth/google/callback` (Opsiyonel)

### Adım 3: Kaydet

1. Sayfanın altındaki **"SAVE"** butonuna tıkla
2. Değişikliklerin etkili olması 5 dakika - birkaç saat sürebilir

---

## 📊 Yapılandırma Özeti

### Production (Önerilen)

**Authorized JavaScript origins:**
```
https://app.poolfab.com.tr
https://api.poolfab.com.tr
```

**Authorized redirect URIs:**
```
https://api.poolfab.com.tr/api/v1/auth/google/callback
```

### Development (Opsiyonel - Ayrı OAuth Client ID önerilir)

**Authorized JavaScript origins:**
```
http://localhost:3001
http://localhost:3000
```

**Authorized redirect URIs:**
```
http://localhost:3000/api/v1/auth/google/callback
```

---

## ⚠️ Notlar

1. **Production ve Development Ayrı Client ID:**
   - Production için bir OAuth Client ID
   - Development için ayrı bir OAuth Client ID kullanılması önerilir
   - Bu şekilde production ve development ortamları birbirinden ayrılır

2. **Değişikliklerin Etkili Olması:**
   - Google Cloud Console'da yapılan değişiklikler 5 dakika - birkaç saat içinde etkili olur
   - Hemen test edilebilir, ancak ilk denemede çalışmazsa birkaç dakika bekleyin

3. **Güvenlik:**
   - Production'da localhost URL'leri bırakılmamalı
   - HTTPS kullanılmalı (production için)
   - Client secret güvenli saklanmalı

---

## ✅ Beklenen Sonuç

Yapılandırma güncellendikten sonra:

1. **Frontend (https://app.poolfab.com.tr/login):**
   - Google login butonuna tıklandığında
   - `https://api.poolfab.com.tr/api/v1/auth/google` adresine yönlendirir
   - Google OAuth consent screen açılır

2. **Backend (https://api.poolfab.com.tr/api/v1/auth/google):**
   - Google OAuth consent screen'e yönlendirir
   - Kullanıcı Google hesabıyla giriş yapar
   - Callback: `https://api.poolfab.com.tr/api/v1/auth/google/callback`

3. **Callback (https://api.poolfab.com.tr/api/v1/auth/google/callback):**
   - Google authentication tamamlandıktan sonra
   - JWT token ile frontend'e redirect
   - Frontend: `https://app.poolfab.com.tr/` (ana sayfa)

---

## 🧪 Test

Yapılandırma güncellendikten sonra test edin:

1. **Frontend test:**
   ```
   https://app.poolfab.com.tr/login
   → Google login butonuna tıkla
   → Google OAuth consent screen açılmalı
   ```

2. **Backend test:**
   ```
   https://api.poolfab.com.tr/api/v1/auth/google
   → 302 Redirect döndürmeli
   → Location header: Google OAuth URL
   ```

---

## 📝 Özet

**Mevcut Durum:**
- ✅ Redirect URI: Doğru (`https://api.poolfab.com.tr/api/v1/auth/google/callback`)
- ❌ JavaScript Origins: Localhost (production için güncellenmeli)

**Yapılması Gerekenler:**
1. JavaScript origins'e production URL'leri ekle
2. Localhost URL'lerini sil (veya development için ayrı client ID kullan)
3. Kaydet ve test et

**Durum:** Redirect URI hazır, JavaScript origins güncellenmeli.

