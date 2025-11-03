# 📚 Aktif Dokümantasyon

Bu klasör aktif ve güncel dokümantasyon dosyalarını içerir.

## 📁 Yapı

- **docs/active/** - Bu klasör: Güncel dokümantasyon
- **docs/archive/** - Eski/geçersiz dokümantasyon (AI tarafından ignore edilir)

## ✅ Organizasyon Kuralları

### Buraya Ekle (docs/active/):
- ✅ Güncel README dosyaları
- ✅ Aktif API dokümantasyonu
- ✅ Mevcut proje rehberleri
- ✅ Şu anda kullanılan dokümantasyon

### Archive'a Taşı (docs/archive/):
- ❌ Eski sprint planları
- ❌ Tamamlanmış versiyon geçmişi
- ❌ Geçersiz/eski dokümantasyon
- ❌ Kullanılmayan rehberler

### Sil:
- 🗑️ Duplicate dosyalar
- 🗑️ Tamamen gereksiz dosyalar
- 🗑️ Test/demo dosyaları

## 🔧 Cursor AI Ayarları

`.cursorignore` dosyası şu şekilde yapılandırılmıştır:
- `docs/archive/**/*.md` → Ignore edilir
- `docs/active/**/*.md` → AI tarafından işlenir
- `node_modules/**/*.md` → Ignore edilir

Bu sayede sadece aktif dokümantasyon AI tarafından görülür.

---

**Son Güncelleme:** 2025-01-27

