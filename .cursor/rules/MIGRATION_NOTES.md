# 🔄 Migration Notes: .cursorrules → .cursor/rules/

## Yapılan Değişiklikler

### Eski Format: `.cursorrules`
- ❌ Tek dosya
- ❌ Metadata desteği yok
- ❌ Glob patterns yok
- ❌ Deprecated

### Yeni Format: `.cursor/rules/`
- ✅ Modüler dosya yapısı
- ✅ Metadata desteği (YAML front matter)
- ✅ Glob patterns ile dosya bazlı kurallar
- ✅ Priority sistemi
- ✅ Cursor AI tarafından resmi olarak destekleniyor

## Dosya Eşleştirmeleri

| Eski Bölüm | Yeni Dosya |
|------------|-----------|
| Genel Kurallar | `00-general.md` |
| AI Direktifleri | `01-ai-directives.md` |
| Dosya Bazlı Kurallar | `02-file-structure.md` |
| Frontend Kuralları | `03-frontend.md` |
| Backend Kuralları | `04-backend.md` |
| Testing Kuralları | `05-testing.md` |
| Security Kuralları | `06-security.md` |
| Logging Kuralları | `07-logging.md` |
| Performance Kuralları | `08-performance.md` |

## Metadata Özellikleri

### alwaysApply
- `true`: Her dosya için geçerli
- `false`: Sadece belirtilen globs pattern'ine uyan dosyalar için

### priority
- `critical`: Mutlaka uyulmalı (Security, AI Directives)
- `high`: Yüksek öncelik (Backend, General)
- `medium`: Orta öncelik
- `low`: Düşük öncelik

### globs
Hangi dosyalarda bu kuralın geçerli olacağını belirler:
```yaml
globs:
  - "src/routes/**/*.ts"
  - "src/services/**/*.ts"
```

## Sonraki Adımlar

1. ✅ Yeni format oluşturuldu
2. ⏳ Eski `.cursorrules` dosyası backup olarak tutulabilir
3. ⏳ Cursor AI'ın yeni formatı algılaması için restart gerekebilir
4. ⏳ Test edilmesi önerilir

## Not

Eski `.cursorrules` dosyası şu an hala çalışıyor olabilir, ancak yeni format'a geçiş önerilir.

## 📚 İlgili Dokümantasyon

- **`.cursor/rules/README.md`** - Rules dizini kullanım kılavuzu
- **`DOCUMENTATION_ANALYSIS.md`** - Tüm dokümantasyon dosyalarının analizi
- **`CODING_STANDARDS.md`** - İnsanlar için detaylı kod standartları (`.cursor/rules/` farklı amaç)
- **`CONTRIBUTING.md`** - Katkıda bulunma rehberi ve PR süreci

---

**Migration Tarihi:** 2025-11-03  
**Versiyon:** 6.7.0

