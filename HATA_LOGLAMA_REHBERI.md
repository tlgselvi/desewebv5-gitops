# 🐛 Hata Loglama Rehberi

**Tarih:** 2025-11-05  
**Durum:** Otomatik hata loglama aktif

---

## ✅ Otomatik Hata Gösterimi

**Hayır, kopyala-yapıştır yapmanıza gerek yok!** 

Next.js error overlay zaten hataları otomatik olarak gösteriyor. Ayrıca API client'ı iyileştirdik, artık hatalar daha detaylı ve otomatik olarak loglanıyor.

---

## 🎯 Hatalar Nerede Görünüyor?

### 1. **Next.js Error Overlay (Ekranda) - OTOMATIK**
- ✅ Hatalar otomatik olarak ekranda gösterilir
- ✅ Kopyala-yapıştır yapmanıza gerek yok
- ✅ Detaylı stack trace gösterilir
- ✅ Dosya ve satır numarası gösterilir

### 2. **Browser Console (F12) - OTOMATIK**
- ✅ Network hataları otomatik loglanır
- ✅ Detaylı hata bilgileri gösterilir
- ✅ Troubleshooting ipuçları gösterilir

### 3. **Terminal - OTOMATIK**
- ✅ Compilation hataları
- ✅ TypeScript hataları
- ✅ ESLint hataları (dev:full kullanıyorsanız)

---

## 📊 İyileştirilmiş Hata Loglama

### Network Hataları

Artık network hataları şu şekilde gösterilir:

```javascript
🚨 Network Error Details
  Type: Network Error
  Message: Network Error
  Code: ECONNREFUSED
  URL: http://localhost:3001/api/v1/projects
  Method: GET
  Timestamp: 2025-11-05T13:30:00.000Z
  Stack: [stack trace]

💡 Troubleshooting Tips
  - Backend server may be down. Please check:
  - Backend is running on http://localhost:3001
  - Docker containers (PostgreSQL, Redis) are running
  - CORS is configured correctly
  - NEXT_PUBLIC_API_URL is set correctly
  - Current baseURL: http://localhost:3001/api/v1
```

### Server Hataları (500+)

```javascript
🚨 Server Error 500
  Message: Internal server error
  URL: http://localhost:3001/api/v1/projects
  Method: GET
  Timestamp: 2025-11-05T13:30:00.000Z
  Response Data: { error details }
```

### Authentication Hataları (401)

```javascript
🔐 Authentication Error: Token expired or invalid. Redirecting to login...
```

---

## 🎨 Next.js Error Overlay Özellikleri

Error overlay zaten şunları gösteriyor:

1. **Error Type** - Hata türü (Console Error, Runtime Error, vb.)
2. **Error Message** - Hata mesajı
3. **Code Frame** - Hatanın olduğu kod satırı
4. **Stack Trace** - Hata zinciri
5. **File Location** - Dosya yolu ve satır numarası

**Kopyala-yapıştır yapmanıza gerek yok!** Overlay zaten tüm bilgileri gösteriyor.

---

## 🔧 Geliştirme Modu vs Production

### Development Modu
- ✅ Detaylı hata logları
- ✅ Stack trace gösterilir
- ✅ Troubleshooting ipuçları
- ✅ Next.js error overlay aktif

### Production Modu
- ✅ Basit hata mesajları
- ✅ Hassas bilgiler gizlenir
- ✅ Kullanıcı dostu mesajlar

---

## 📝 Örnek Hata Senaryoları

### Senaryo 1: Backend Çalışmıyor

**Görünen:**
- Next.js error overlay (ekranda)
- Browser console'da detaylı log
- Troubleshooting ipuçları

**Yapmanız Gereken:**
- ❌ Kopyala-yapıştır yok
- ✅ Console'u okuyun (F12)
- ✅ Backend'i başlatın

### Senaryo 2: API Hatası

**Görünen:**
- Next.js error overlay
- Server error detayları
- Response data

**Yapmanız Gereken:**
- ❌ Kopyala-yapıştır yok
- ✅ Error overlay'deki bilgileri okuyun
- ✅ Backend loglarını kontrol edin

---

## 🚀 Kullanım

### Normal Geliştirme
```bash
npm run dev
```
- Hatalar otomatik gösterilir
- Error overlay aktif
- Console'da detaylı loglar

### Tam Hata Takibi
```bash
npm run dev:full
```
- Frontend + ESLint + TypeScript
- Tüm hatalar gerçek zamanlı gösterilir

---

## ✅ Sonuç

**Kopyala-yapıştır yapmanıza gerek yok!**

1. ✅ Next.js error overlay otomatik gösterir
2. ✅ Browser console otomatik loglar
3. ✅ API client detaylı loglar ekler
4. ✅ Troubleshooting ipuçları gösterilir

Sadece:
- **Error overlay'i okuyun** (ekranda)
- **Console'u kontrol edin** (F12)
- **Terminal'i kontrol edin** (compilation hataları için)

---

**Hazırlayan:** Cursor AI Assistant  
**Tarih:** 2025-11-05  
**Durum:** ✅ Otomatik Hata Loglama Aktif

