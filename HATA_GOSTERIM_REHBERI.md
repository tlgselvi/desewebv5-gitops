# 🐛 Hata Gösterim Rehberi

**Tarih:** 2025-11-05  
**Durum:** Otomatik hata gösterimi aktif

---

## ✅ Yapılan İyileştirmeler

### 1. Next.js Error Overlay (Otomatik Aktif)
- **Durum:** ✅ Etkin
- **Açıklama:** Next.js development modunda hatalar otomatik olarak ekranda gösterilir
- **Nasıl Çalışır:** Bir hata oluştuğunda ekranda kırmızı bir overlay görünür

### 2. Global Error Handler
- **Dosya:** `frontend/src/components/GlobalErrorHandler.tsx`
- **Durum:** ✅ Eklendi
- **Özellikler:**
  - JavaScript hatalarını yakalar
  - Unhandled promise rejection'ları yakalar
  - Console'da detaylı hata logları gösterir

### 3. Error Boundary
- **Dosya:** `frontend/src/components/ErrorBoundary.tsx`
- **Durum:** ✅ Zaten mevcut, layout'a entegre edildi
- **Özellikler:**
  - React component hatalarını yakalar
  - Kullanıcı dostu hata mesajı gösterir
  - Development modunda stack trace gösterir

### 4. TypeScript Type Checking (Watch Mode)
- **Script:** `npm run type-check:watch`
- **Durum:** ✅ Eklendi
- **Özellikler:**
  - TypeScript hatalarını gerçek zamanlı gösterir
  - Dosya değişikliklerini izler

### 5. ESLint Watch Mode
- **Script:** `npm run lint:watch`
- **Durum:** ✅ Eklendi
- **Özellikler:**
  - Kod kalitesi hatalarını gerçek zamanlı gösterir
  - Dosya değişikliklerini izler

---

## 🚀 Kullanım

### Normal Geliştirme (Sadece Frontend)
```bash
cd frontend
npm run dev
```
- Next.js error overlay otomatik aktif
- Browser console'da hatalar görünür
- Terminal'de compilation hataları görünür

### Tam Hata Takibi (Önerilen)
```bash
cd frontend
npm run dev:full
```
Bu komut 3 şeyi aynı anda çalıştırır:
1. **Next.js dev server** - Frontend çalışır
2. **ESLint watch** - Kod kalitesi hatalarını gösterir
3. **TypeScript watch** - Type hatalarını gösterir

### DESE Web için
```bash
cd dese-web
npm run dev:full
```

---

## 📊 Hataları Nerede Görebilirsiniz?

### 1. Browser Console (F12)
- **Açılış:** F12 → Console sekmesi
- **Gösterir:**
  - JavaScript runtime hataları
  - API hataları
  - Console.log/error mesajları
  - Global error handler logları

### 2. Next.js Error Overlay (Ekranda)
- **Otomatik:** Hata oluştuğunda ekranda kırmızı overlay görünür
- **Gösterir:**
  - Component hataları
  - Build hataları
  - Runtime hataları
- **Özellikler:**
  - Hata mesajı
  - Stack trace
  - Hata dosyası ve satır numarası
  - "Dismiss" butonu ile kapatılabilir

### 3. Terminal (Development Server)
- **Gösterir:**
  - Compilation hataları
  - TypeScript hataları
  - Build hataları
  - Server-side hatalar

### 4. Error Boundary (UI'da)
- **Gösterir:**
  - React component hataları
  - Kullanıcı dostu hata mesajı
  - "Try Again" butonu
  - Development modunda stack trace

### 5. ESLint Watch Terminal
- **Gösterir:**
  - Kod kalitesi hataları
  - Best practice uyarıları
  - Lint hataları

### 6. TypeScript Watch Terminal
- **Gösterir:**
  - Type hataları
  - Type mismatch'ler
  - Interface/type tanım hataları

---

## 🎯 Hata Türleri

### 1. JavaScript Runtime Hataları
- **Yakalanır:** GlobalErrorHandler
- **Gösterilir:** Browser console + Error overlay
- **Örnek:** `undefined is not a function`

### 2. React Component Hataları
- **Yakalanır:** ErrorBoundary
- **Gösterilir:** UI'da hata mesajı + Error overlay
- **Örnek:** Component render hatası

### 3. API/Network Hataları
- **Yakalanır:** API client + try/catch
- **Gösterilir:** Browser console + UI (bazı componentlerde)
- **Örnek:** 404, 500, network error

### 4. TypeScript Hataları
- **Yakalanır:** TypeScript compiler
- **Gösterilir:** Terminal (type-check:watch) + Editor
- **Örnek:** Type mismatch, missing property

### 5. ESLint Hataları
- **Yakalanır:** ESLint
- **Gösterilir:** Terminal (lint:watch) + Editor
- **Örnek:** Unused variable, console.log

### 6. Build/Compilation Hataları
- **Yakalanır:** Next.js compiler
- **Gösterilir:** Terminal + Error overlay
- **Örnek:** Syntax error, import error

---

## 🔧 Yapılandırma

### Next.js Config (frontend/next.config.mjs)
```javascript
// Development error overlay
onDemandEntries: {
  maxInactiveAge: 25 * 1000,
  pagesBufferLength: 2,
},

// Better error reporting
webpack: (config, { dev, isServer }) => {
  if (dev && !isServer) {
    config.optimization = {
      ...config.optimization,
      minimize: false, // Better error messages
    };
  }
  return config;
},
```

### Error Boundary (Zaten Mevcut)
- Layout'a entegre edildi
- Development modunda detaylı stack trace gösterir
- Production'da kullanıcı dostu mesaj gösterir

### Global Error Handler (Yeni)
- Layout'a entegre edildi
- Tüm JavaScript hatalarını yakalar
- Console'da detaylı log gösterir

---

## 📝 Örnekler

### Hata Oluştuğunda Ne Olur?

1. **Next.js Error Overlay** ekranda görünür
2. **Browser Console** hata detaylarını gösterir
3. **Terminal** (eğer dev:full kullanıyorsanız) ESLint/TypeScript hatalarını gösterir
4. **Error Boundary** (eğer component hatası ise) UI'da hata mesajı gösterir

### Hata Mesajı Örneği

**Browser Console:**
```
🚨 Global Error: {
  message: "Cannot read property 'map' of undefined",
  filename: "http://localhost:3000/_next/static/chunks/app/page.js",
  lineno: 42,
  colno: 15,
  error: TypeError: ...
}
```

**Terminal (TypeScript):**
```
src/app/page.tsx:42:15 - error TS2339: Property 'map' does not exist on type 'undefined'.
```

**Terminal (ESLint):**
```
src/app/page.tsx:42:15 - error: 'items' is possibly 'undefined'
```

---

## 🎨 Görsel Gösterim

### Error Overlay (Ekranda)
```
┌─────────────────────────────────────────┐
│  ⚠️  Unhandled Runtime Error            │
├─────────────────────────────────────────┤
│  TypeError: Cannot read property...     │
│                                          │
│  Stack trace:                           │
│  at PageComponent (page.tsx:42:15)      │
│  ...                                    │
│                                          │
│  [Dismiss]  [Reload]                    │
└─────────────────────────────────────────┘
```

### Error Boundary (UI'da)
```
┌─────────────────────────────────────────┐
│         ⚠️                              │
│   Something went wrong                  │
│   An unexpected error occurred...       │
│                                          │
│   [Try Again]  [Reload Page]            │
└─────────────────────────────────────────┘
```

---

## ✅ Kontrol Listesi

- [x] Next.js error overlay aktif
- [x] Global error handler eklendi
- [x] Error boundary layout'a entegre edildi
- [x] TypeScript watch mode eklendi
- [x] ESLint watch mode eklendi
- [x] dev:full script eklendi
- [x] Config dosyaları güncellendi

---

## 🚨 Önemli Notlar

1. **Error Overlay** sadece development modunda çalışır
2. **Global Error Handler** her zaman aktif (production'da da)
3. **Error Boundary** production'da da çalışır ama stack trace göstermez
4. **TypeScript/ESLint watch** sadece `dev:full` komutunda çalışır

---

## 📚 İlgili Dosyalar

- `frontend/src/components/GlobalErrorHandler.tsx` - Global error handler
- `frontend/src/components/ErrorBoundary.tsx` - React error boundary
- `frontend/src/app/layout.tsx` - Layout (error handler entegre edildi)
- `frontend/next.config.mjs` - Next.js config (error overlay ayarları)
- `frontend/package.json` - Scripts (dev:full, lint:watch, type-check:watch)

---

**Hazırlayan:** Cursor AI Assistant  
**Tarih:** 2025-11-05  
**Durum:** ✅ Otomatik Hata Gösterimi Aktif

