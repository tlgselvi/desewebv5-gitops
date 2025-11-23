# 🔧 Google OAuth Callback URL Ekleme - Basit Adımlar

## 📋 Yapılacaklar

Google Cloud Console'da OAuth client'ınıza production callback URL'lerini eklemeniz gerekiyor.

### 🚀 Hızlı Başlangıç

1. **Google Cloud Console'u açın:**
   - Tarayıcınızda şu linke gidin: https://console.cloud.google.com/apis/credentials
   - OAuth 2.0 Client ID'yi seçin ve açın

2. **"Authorized redirect URIs" bölümünü bulun:**
   - Sayfayı aşağı kaydırın
   - "Authorized redirect URIs" başlığını bulun
   - "ADD URI" butonuna tıklayın

3. **Production callback URL'ini ekleyin:**
   ```
   https://YOUR_API_DOMAIN/api/v1/auth/google/callback
   ```
   - `YOUR_API_DOMAIN` yerine kendi API domain'inizi yazın
   - Bu URL'i kopyalayıp yapıştırın
   - Enter'a basın veya başka bir URI eklemek istiyorsanız "ADD URI" butonuna tekrar tıklayın

4. **"Authorized JavaScript origins" bölümüne gidin:**
   - Sayfayı biraz daha aşağı kaydırın
   - "Authorized JavaScript origins" başlığını bulun
   - "ADD URI" butonuna tıklayın

5. **Production JavaScript origins'leri ekleyin:**
   ```
   https://YOUR_FRONTEND_DOMAIN
   ```
   - `YOUR_FRONTEND_DOMAIN` yerine kendi frontend domain'inizi yazın
   - Bu URL'i ekleyin
   - Gerekirse ana domain'inizi de ekleyin

6. **Kaydedin:**
   - Sayfanın en altındaki "SAVE" (Kaydet) butonuna tıklayın
   - Başarılı mesajını göreceksiniz

7. **Bekleyin:**
   - Değişikliklerin aktif olması 1-2 dakika sürebilir
   - Sonra Google OAuth'u test edebilirsiniz

## ✅ Kontrol

İşlem tamamlandıktan sonra, şu URL'lerin listede olduğundan emin olun:

**Authorized redirect URIs:**
- ✅ `http://localhost:3000/api/v1/auth/google/callback` (development)
- ✅ `https://YOUR_API_DOMAIN/api/v1/auth/google/callback` (production)

**Authorized JavaScript origins:**
- ✅ `http://localhost:3001` (development frontend)
- ✅ `http://localhost:3000` (development backend)
- ✅ `https://YOUR_FRONTEND_DOMAIN` (production)

## 🎯 Sonraki Adım

İşlem tamamlandıktan sonra Google OAuth'u test edin!

## 📝 Notlar

- Production URL'lerini eklemeden önce `.env` dosyanızdaki `GOOGLE_CALLBACK_URL` değişkenini güncelleyin
- Tüm domain'lerin HTTPS kullandığından emin olun
- Localhost URL'leri sadece development için kullanılmalıdır

