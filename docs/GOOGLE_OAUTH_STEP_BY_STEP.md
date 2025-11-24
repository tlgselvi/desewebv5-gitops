# Google OAuth Client ID Oluşturma - Adım Adım Rehber

Bu rehber, Google Cloud Console'da OAuth Client ID oluşturmayı hiç bilmeyen birine anlatır gibi detaylı açıklar.

## 📋 Ön Hazırlık

1. **Google Hesabınız**: Google hesabınızla giriş yapmış olmanız gerekiyor
2. **Proje Oluşturulmuş**: Google Cloud Console'da bir proje oluşturmuş olmanız gerekiyor
   - Eğer yoksa: [Google Cloud Console](https://console.cloud.google.com/) → Üstteki proje seçici → "New Project" → Proje adı girin → "Create"

---

## 🎯 Adım 1: OAuth Consent Screen'i Yapılandırma (İlk Kez Yapıyorsanız)

**Not:** Eğer daha önce OAuth Consent Screen'i yapılandırdıysanız, bu adımı atlayabilirsiniz.

1. Google Cloud Console'da sol menüden **"APIs & Services"** (API'ler ve Hizmetler) → **"OAuth consent screen"** (OAuth izin ekranı) seçin
2. **"User Type"** (Kullanıcı türü) seçin:
   - **"Internal"** (Dahili) → Sadece kendi organizasyonunuzdaki kullanıcılar için (Geliştirme için önerilen)
   - **"External"** (Dış) → Herkes için (Üretim için)
3. **"Create"** butonuna tıklayın
4. **"App information"** (Uygulama bilgileri) bölümünü doldurun:
   - **App name** (Uygulama adı): `Dese EA Plan` (veya istediğiniz bir isim)
   - **User support email** (Kullanıcı destek e-postası): Kendi e-posta adresinizi seçin
   - **App logo** (Uygulama logosu): İsteğe bağlı, şimdilik atlayabilirsiniz
   - **App domain** (Uygulama etki alanı): Şimdilik boş bırakabilirsiniz
   - **Developer contact information** (Geliştirici iletişim bilgileri): E-posta adresinizi girin
5. **"Save and Continue"** (Kaydet ve Devam Et) butonuna tıklayın
6. **"Scopes"** (Kapsamlar) sayfasında **"Save and Continue"** butonuna tıklayın (varsayılan kapsamlar yeterli)
7. **"Test users"** (Test kullanıcıları) sayfasında:
   - Eğer "Internal" seçtiyseniz: Bu adımı atlayabilirsiniz
   - Eğer "External" seçtiyseniz: Test için kullanmak istediğiniz Google e-posta adreslerini ekleyin
8. **"Back to Dashboard"** (Ana Pano'ya Dön) butonuna tıklayın

---

## 🔑 Adım 2: OAuth Client ID Oluşturma

### 2.1. Kimlik Bilgileri Sayfasına Gitme

1. Sol menüden **"APIs & Services"** (API'ler ve Hizmetler) → **"Credentials"** (Kimlik Bilgileri) seçin
2. Üstteki **"+ CREATE CREDENTIALS"** (+ KİMLİK BİLGİLERİ OLUŞTUR) butonuna tıklayın
3. Açılan menüden **"OAuth client ID"** seçin

### 2.2. OAuth Client ID Formunu Doldurma

Şimdi ekranda gördüğünüz formu dolduralım:

#### **Application type** (Uygulama türü) *
- Dropdown menüden **"Web application"** seçin
- Bu, web uygulamanız için OAuth kullanacağınızı belirtir

#### **Name** (İsim) *
- **"Web client 1"** yazısını silin
- Yerine şunu yazın: **`Dese EA Plan - Local Dev`**
- Bu isim sadece Google Cloud Console'da göreceğiniz bir etikettir, kullanıcılara gösterilmez

#### **Authorized JavaScript origins** (Yetkilendirilmiş JavaScript kaynakları)

Bu bölüm, frontend'inizin hangi adreslerden çalışacağını belirtir.

1. **"+ Add URI"** (+ URI Ekle) butonuna tıklayın
2. Açılan input kutusuna şunu yazın: **`http://localhost:3001`**
3. Tekrar **"+ Add URI"** butonuna tıklayın
4. İkinci input kutusuna şunu yazın: **`http://localhost:3000`**

**Önemli Notlar:**
- `http://` ile başlamalı (geliştirme için)
- Port numaralarını doğru yazın (3001 ve 3000)
- Sonunda `/` (slash) olmamalı
- Her URI'yi ayrı satıra ekleyin

#### **Authorized redirect URIs** (Yetkilendirilmiş yönlendirme URI'leri)

Bu bölüm, Google'ın kullanıcıyı doğruladıktan sonra nereye yönlendireceğini belirtir.

1. **"+ Add URI"** (+ URI Ekle) butonuna tıklayın
2. Açılan input kutusuna şunu yazın: **`http://localhost:3000/api/v1/auth/google/callback`**

**Önemli Notlar:**
- Bu URI, backend'inizin callback endpoint'idir
- Tam olarak bu şekilde yazılmalı: `http://localhost:3000/api/v1/auth/google/callback`
- Port numarası 3000 olmalı (backend portu)
- `/api/v1/auth/google/callback` kısmı değiştirilmemeli

### 2.3. Client ID'yi Oluşturma

1. Formun altındaki **"CREATE"** (OLUŞTUR) butonuna tıklayın
2. Birkaç saniye bekleyin
3. Açılan popup pencerede şunları göreceksiniz:
   - **Your Client ID** (İstemci Kimliğiniz): `xxxxx-xxxxx.apps.googleusercontent.com` formatında bir değer
   - **Your Client Secret** (İstemci Gizli Anahtarınız): `GOCSPX-xxxxx` formatında bir değer

### 2.4. Client ID ve Secret'ı Kopyalama

**⚠️ ÇOK ÖNEMLİ:** Bu bilgileri hemen kopyalayın! Client Secret'ı bir daha göremeyebilirsiniz.

1. **Client ID**'yi seçin ve kopyalayın (Ctrl+C)
2. **Client Secret**'ı seçin ve kopyalayın (Ctrl+C)
3. Bu bilgileri güvenli bir yere kaydedin (not defteri, text dosyası vb.)
4. Popup penceresini kapatın (OK butonuna tıklayın)

---

## 📝 Adım 3: .env Dosyasına Değerleri Ekleme

1. Projenizin ana dizininde `.env` dosyasını açın (Notepad, VS Code, veya herhangi bir metin editörü ile)
2. Aşağıdaki satırları bulun:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

3. Eşittir işaretinden (`=`) sonra, Google Cloud Console'dan kopyaladığınız değerleri yapıştırın:

```env
GOOGLE_CLIENT_ID=xxxxx-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

**Örnek:**
```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-1234567890abcdefghijklmnop
```

4. Dosyayı kaydedin (Ctrl+S)

**Önemli Notlar:**
- Değerlerin etrafında tırnak işareti (`"`) olmamalı
- Eşittir işaretinden sonra boşluk olmamalı
- Her satırda sadece bir değişken olmalı

---

## ✅ Adım 4: Backend'i Yeniden Başlatma

1. Backend servisini yeniden başlatın:

```powershell
docker compose restart app
```

2. Backend'in başladığını görmek için logları izleyin:

```powershell
docker compose logs -f app
```

3. `Server is running on port 3000` mesajını görmelisiniz.

---

## 🧪 Adım 5: Test Etme

1. Tarayıcınızda şu adresi açın: **`http://localhost:3001/login`**
2. **"Continue with Google"** (Google ile Devam Et) butonuna tıklayın
3. Google hesabınızla giriş yapın
4. İzin ekranında **"Allow"** (İzin Ver) butonuna tıklayın
5. Başarılı giriş sonrası ana sayfaya yönlendirilmelisiniz

---

## ❌ Sorun Giderme

### "redirect_uri_mismatch" Hatası

**Sorun:** Google, yönlendirme URI'sinin eşleşmediğini söylüyor.

**Çözüm:**
1. Google Cloud Console'a geri dönün
2. **"Credentials"** → Oluşturduğunuz OAuth client ID'ye tıklayın
3. **"Authorized redirect URIs"** bölümünde şu URI'nin olduğundan emin olun:
   - `http://localhost:3000/api/v1/auth/google/callback`
4. Eğer yoksa ekleyin ve **"Save"** (Kaydet) butonuna tıklayın
5. 5 dakika bekleyin (Google'ın ayarları güncellemesi için)
6. Tekrar deneyin

### "access_denied" Hatası

**Sorun:** Google, erişim izni vermiyor.

**Çözüm:**
1. OAuth Consent Screen'in yayınlandığından emin olun
2. Eğer "External" seçtiyseniz, test kullanıcıları eklediğinizden emin olun
3. Google hesabınızın test kullanıcıları listesinde olduğundan emin olun

### "invalid_client" Hatası

**Sorun:** Client ID veya Secret yanlış.

**Çözüm:**
1. `.env` dosyasını açın
2. `GOOGLE_CLIENT_ID` ve `GOOGLE_CLIENT_SECRET` değerlerinin doğru kopyalandığından emin olun
3. Değerlerin etrafında tırnak işareti olmamalı
4. Dosyayı kaydedin
5. Backend'i yeniden başlatın

### Backend Başlamıyor

**Sorun:** Backend çalışmıyor veya hata veriyor.

**Çözüm:**
1. Port 3000'in kullanılabilir olduğundan emin olun
2. Docker `app` container'ının çalıştığından emin olun
3. `.env` dosyasındaki tüm değerlerin doğru olduğundan emin olun
4. Terminal'deki hata mesajlarını okuyun: `docker compose logs app`

---

## 📸 Görsel Referans

Formu doldurduktan sonra şöyle görünmeli:

```
Application type: Web application
Name: Dese EA Plan - Local Dev

Authorized JavaScript origins:
  http://localhost:3001
  http://localhost:3000

Authorized redirect URIs:
  http://localhost:3000/api/v1/auth/google/callback
```

---

## 🎉 Başarı!

Tüm adımları tamamladıysanız, Google OAuth artık çalışıyor olmalı! 

Eğer herhangi bir sorunla karşılaşırsanız, yukarıdaki "Sorun Giderme" bölümüne bakın veya hata mesajını kontrol edin.

