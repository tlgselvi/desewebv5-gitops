# 📋 Cursor Rules - Dese EA Plan v6.8.0

**Versiyon:** 6.8.0  
**Son Güncelleme:** 2025-01-27

---

## 📁 Rules Dosyaları

Bu klasör Cursor AI için organize edilmiş rules dosyalarını içerir.

### Ana Rules Dosyası

- **`.cursorrules`** (kök dizinde) - Ana Cursor AI kuralları
  - Tüm kod standartları
  - MCP server kuralları
  - Odaklanma rehberi
  - Şu anki aktif görev

### Organize Rules (Bu Klasör)

1. **`CODING_STANDARDS.md`** - Kod standartları detayları
2. **`MCP_RULES.md`** - MCP server özel kuralları
3. **`FRONTEND_RULES.md`** - Frontend (Next.js) kuralları
4. **`BACKEND_RULES.md`** - Backend (Express) kuralları
5. **`TESTING_RULES.md`** - Testing kuralları

---

## 🔗 Referanslar

- `.cursorrules` - Ana rules dosyası
- `.cursor/memory/ONEMLI_DOSYALAR.md` - Önemli dosyalar listesi
- `DESE_JARVIS_CONTEXT.md` - Proje context

---

---

## ⚠️ ÖNEMLİ NOT

**Cursor AI sadece `.cursorrules` dosyasını okur!**

- ✅ **`.cursorrules`** (kök dizinde) = **GERÇEK RULES DOSYASI** - Cursor AI bunu otomatik okur
- ❌ **`.cursor/rules/`** klasörü = Sadece organizasyon için - Cursor AI bunu otomatik okumaz

Bu klasördeki dosyalar sadece organize etmek ve referans için. Eğer Cursor AI'ın bu dosyaları okumasını istiyorsanız, içeriklerini `.cursorrules` dosyasına kopyalamanız gerekir.

---

## 📝 Format Bilgisi

**`.cursorrules` dosyası formatı:**
- ✅ **Markdown formatı** desteklenir (şu anki format)
- ✅ Düz metin formatı da çalışır
- ✅ Cursor AI markdown syntax'ını anlar:
  - `#` Başlıklar
  - `##` Alt başlıklar
  - `-` Listeler
  - `**bold**` Kalın yazı
  - `` `code` `` Kod blokları
  - `---` Ayırıcılar

**Mevcut `.cursorrules` dosyası:** ✅ Markdown formatında (doğru format)

---

**Not:** Ana rules dosyası `.cursorrules` (kök dizinde) olarak kalır. Bu klasördeki dosyalar organize edilmiş referanslardır ve Cursor AI tarafından otomatik olarak okunmaz.

