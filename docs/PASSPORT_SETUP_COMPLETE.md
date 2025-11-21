# Passport.js Google OAuth Kurulumu Tamamlandı ✅

## Yapılan Değişiklikler

### 1. Paketler Kuruldu
- ✅ `passport` - Authentication middleware
- ✅ `passport-google-oauth20` - Google OAuth strategy
- ✅ `cookie-session` - Session management
- ✅ Type definitions (@types/passport, @types/passport-google-oauth20, @types/cookie-session)

### 2. Dosyalar Oluşturuldu/Güncellendi

#### Yeni Dosyalar:
- ✅ `src/services/passport.ts` - Passport Google OAuth strategy (veritabanı entegrasyonu ile)

#### Güncellenen Dosyalar:
- ✅ `src/config/index.ts` - Cookie key eklendi (`config.security.cookieKey`)
- ✅ `src/routes/v1/auth.ts` - Passport ile Google OAuth route'ları
- ✅ `src/index.ts` - Passport ve cookie-session middleware'leri eklendi

### 3. Environment Variables

`.env` dosyasına aşağıdaki değişkenler eklendi (değerleri doldurmanız gerekiyor):

```env
# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your-google-client-id-goes-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-goes-here
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# Session Cookie Secret
COOKIE_KEY=ea-plan-master-control-v6.8.2-cookie-session-secret-key-min-32-chars

# Frontend URL
CLIENT_URL=http://localhost:3001
```

## Sonraki Adımlar

### 1. Google Cloud Console'da OAuth Credentials Oluşturun

Detaylı rehber için: `docs/GOOGLE_OAUTH_SETUP.md`

**Kısa Özet:**
1. [Google Cloud Console](https://console.cloud.google.com/) → Proje oluşturun
2. OAuth izin ekranı → "Dahili" seçin
3. Kimlik Bilgileri → "OAuth istemci kimliği" oluşturun:
   - Uygulama türü: **Web uygulaması**
   - Yetkilendirilmiş JavaScript kaynakları:
     - `http://localhost:3001`
     - `http://localhost:3000`
   - Yetkilendirilmiş yönlendirme URI'leri:
     - `http://localhost:3000/api/v1/auth/google/callback`
4. Client ID ve Client Secret'ı kopyalayın

### 2. `.env` Dosyasını Doldurun

Google Cloud Console'dan aldığınız değerleri `.env` dosyasına ekleyin:

```env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

### 3. Backend'i Yeniden Başlatın

```powershell
# Backend'i durdurun (Ctrl+C) ve tekrar başlatın:
pnpm dev
```

### 4. Test Edin

1. Frontend'i açın: `http://localhost:3001/login`
2. **"Continue with Google"** butonuna tıklayın
3. Google hesabınızla giriş yapın
4. İzin ekranında **"İzin Ver"** butonuna tıklayın
5. Başarılı giriş sonrası ana sayfaya yönlendirilmelisiniz

## Nasıl Çalışıyor?

### Authentication Flow:

1. **Frontend** → Kullanıcı "Continue with Google" butonuna tıklar
2. **Backend** (`/api/v1/auth/google`) → Google OAuth sayfasına yönlendirir
3. **Google** → Kullanıcı giriş yapar ve izin verir
4. **Google** → Backend callback URL'ine yönlendirir (`/api/v1/auth/google/callback`)
5. **Backend** → Passport Google strategy ile kullanıcıyı doğrular
6. **Backend** → Veritabanında kullanıcıyı bulur/oluşturur
7. **Backend** → Session cookie oluşturur (Passport)
8. **Backend** → JWT token oluşturur (frontend uyumluluğu için)
9. **Backend** → Frontend'e yönlendirir (`/auth/callback?token=...`)
10. **Frontend** → Token'ı localStorage'a kaydeder ve ana sayfaya yönlendirir

### Özellikler:

- ✅ **Session Management**: Passport + cookie-session ile güvenli session yönetimi
- ✅ **JWT Token**: Frontend uyumluluğu için JWT token da döndürülüyor
- ✅ **Database Integration**: Kullanıcılar veritabanında saklanıyor
- ✅ **Auto User Creation**: Google ile ilk giriş yapan kullanıcılar otomatik oluşturuluyor
- ✅ **Role Management**: Kullanıcılar varsayılan olarak "user" rolü ile oluşturuluyor

## Sorun Giderme

### "redirect_uri_mismatch" Hatası
- Google Cloud Console'da **"Yetkilendirilmiş yönlendirme URI'leri"** bölümünde `http://localhost:3000/api/v1/auth/google/callback` olduğundan emin olun

### "access_denied" Hatası
- OAuth Consent Screen'i yayınladığınızdan emin olun
- Test kullanıcıları eklediğinizden emin olun

### "invalid_client" Hatası
- `GOOGLE_CLIENT_ID` ve `GOOGLE_CLIENT_SECRET` değerlerinin doğru olduğundan emin olun
- `.env` dosyasını kaydettiğinizden ve backend'i yeniden başlattığınızdan emin olun

### Backend Başlamıyor
- Port 3000'in kullanılabilir olduğundan emin olun
- Docker `app` container'ının durdurulduğundan emin olun (Hybrid Mode)
- `.env` dosyasındaki değerlerin doğru olduğundan emin olun

## Güvenlik Notları

- ✅ **Geliştirme ortamında**: `http://localhost` kullanılabilir
- ✅ **Üretim ortamında**: Mutlaka `https://` kullanılmalı
- ✅ **Client Secret**: Asla frontend kodunda veya public repository'de paylaşılmamalı
- ✅ **Cookie Security**: Production'da `secure: true` ve `sameSite: "strict"` kullanılmalı
- ✅ **Session Timeout**: 24 saat (configurable)

## Ek Kaynaklar

- [Passport.js Dokümantasyonu](http://www.passportjs.org/)
- [Google OAuth 2.0 Dokümantasyonu](https://developers.google.com/identity/protocols/oauth2)
- [Cookie Session Dokümantasyonu](https://github.com/expressjs/cookie-session)

