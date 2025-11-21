# Google OAuth 2.0 Yapılandırma Rehberi

Bu rehber, Dese EA Plan v6.8.2 için Google OAuth 2.0 yapılandırmasını açıklar.

> **💡 Yeni Başlayanlar İçin:** Eğer Google Cloud Console'u ilk kez kullanıyorsanız, daha detaylı adım adım rehber için **[GOOGLE_OAUTH_STEP_BY_STEP.md](./GOOGLE_OAUTH_STEP_BY_STEP.md)** dosyasına bakın.

## Adım 1: Google Cloud Console'da Proje Oluşturma

1. [Google Cloud Console](https://console.cloud.google.com/) adresine gidin
2. Yeni bir proje oluşturun veya mevcut bir projeyi seçin
3. Proje adını not edin (örn: "Dese EA Plan Dev")

## Adım 2: OAuth İzin Ekranını Yapılandırma

1. Sol menüden **"API'ler ve Hizmetler"** > **"OAuth izin ekranı"** sekmesine gidin
2. **"Dış"** veya **"Dahili"** seçeneğini seçin (geliştirme için "Dahili" yeterli)
3. Aşağıdaki bilgileri doldurun:
   - **Uygulama adı**: `Dese EA Plan`
   - **Kullanıcı destek e-postası**: Kendi e-posta adresiniz
   - **Geliştirici iletişim bilgileri**: E-posta adresiniz
4. **"Kaydet ve Devam Et"** butonuna tıklayın
5. Kapsamlar (Scopes) ekranında **"Kaydet ve Devam Et"** butonuna tıklayın
6. Test kullanıcıları ekleyin (isteğe bağlı, geliştirme için)
7. **"Ana Panola Dön"** butonuna tıklayın

## Adım 3: OAuth 2.0 Kimlik Bilgileri Oluşturma

1. Sol menüden **"API'ler ve Hizmetler"** > **"Kimlik Bilgileri"** sekmesine gidin
2. Üstteki **"+ KİMLİK BİLGİLERİ OLUŞTUR"** butonuna tıklayın
3. **"OAuth istemci kimliği"** seçeneğini seçin
4. **"Uygulama türü"** olarak **"Web uygulaması"** seçin
5. **"Ad"** alanına `Dese EA Plan - Local Dev` yazın
6. **"Yetkilendirilmiş JavaScript kaynakları"** bölümüne ekleyin:
   ```
   http://localhost:3001
   http://localhost:3000
   ```
7. **"Yetkilendirilmiş yönlendirme URI'leri"** bölümüne ekleyin:
   ```
   http://localhost:3000/api/v1/auth/google/callback
   ```
8. **"Oluştur"** butonuna tıklayın
9. **ÖNEMLİ**: Açılan pencerede gösterilen bilgileri kopyalayın:
   - **İstemci Kimliği (Client ID)**: `xxxxx.apps.googleusercontent.com` formatında
   - **İstemci gizli anahtarı (Client Secret)**: `GOCSPX-xxxxx` formatında

## Adım 4: OAuth Consent Screen'i Yayınlama (Geliştirme için)

1. **"OAuth izin ekranı"** sekmesine geri dönün
2. **"YAYINLA"** butonuna tıklayın (geliştirme için gerekli)
3. Onay verin

## Adım 5: Environment Variables Ekleme

Proje kök dizinindeki `.env` dosyasına aşağıdaki satırları ekleyin:

```dotenv
# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID="your-google-client-id-goes-here"
GOOGLE_CLIENT_SECRET="your-google-client-secret-goes-here"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/v1/auth/google/callback"

# Session Cookie Secret (minimum 32 karakter olmalı)
COOKIE_KEY="ea-plan-master-control-v6.8.2-cookie-session-secret-key-min-32-chars"

# Frontend URL (OAuth sonrası yönlendirme için)
CLIENT_URL="http://localhost:3001"
```

**ÖNEMLİ**: 
- `GOOGLE_CLIENT_ID` ve `GOOGLE_CLIENT_SECRET` değerlerini Google Cloud Console'dan aldığınız değerlerle değiştirin
- `.env` dosyasını asla Git'e commit etmeyin (`.gitignore`'da olmalı)

## Adım 6: Backend'i Yeniden Başlatma

Environment variables'ları ekledikten sonra backend'i yeniden başlatın:

```powershell
# Backend'i durdurun (Ctrl+C) ve tekrar başlatın:
pnpm dev
```

## Adım 7: Test Etme

1. Frontend'i açın: `http://localhost:3001/login`
2. **"Continue with Google"** butonuna tıklayın
3. Google hesabınızla giriş yapın
4. İzin ekranında **"İzin Ver"** butonuna tıklayın
5. Başarılı giriş sonrası ana sayfaya yönlendirilmelisiniz

## Sorun Giderme

### "redirect_uri_mismatch" Hatası
- Google Cloud Console'da **"Yetkilendirilmiş yönlendirme URI'leri"** bölümünde `http://localhost:3000/api/v1/auth/google/callback` olduğundan emin olun
- URI'deki port numarasının doğru olduğundan emin olun (3000)

### "access_denied" Hatası
- OAuth Consent Screen'de test kullanıcıları eklediğinizden emin olun
- Veya Consent Screen'i yayınladığınızdan emin olun

### "invalid_client" Hatası
- `GOOGLE_CLIENT_ID` ve `GOOGLE_CLIENT_SECRET` değerlerinin doğru olduğundan emin olun
- `.env` dosyasını kaydettiğinizden ve backend'i yeniden başlattığınızdan emin olun

## Güvenlik Notları

- **Geliştirme ortamında**: `http://localhost` kullanabilirsiniz
- **Üretim ortamında**: Mutlaka `https://` kullanmalısınız
- **Client Secret'ı asla** frontend kodunda veya public repository'de paylaşmayın
- `.env` dosyasını `.gitignore`'a eklediğinizden emin olun

## Ek Kaynaklar

- [Google OAuth 2.0 Dokümantasyonu](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
