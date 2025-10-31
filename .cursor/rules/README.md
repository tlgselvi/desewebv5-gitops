# 📚 Cursor AI Rules - Dese EA Plan v5.0

Bu dizin Cursor AI için proje özel kuralları içerir.

## 📁 Dosya Yapısı

- `00-general.md` - Genel kurallar ve proje özeti (alwaysApply: true)
- `01-ai-directives.md` - AI asistanı için zorunlu direktifler (alwaysApply: true)
- `02-file-structure.md` - Dosya/glob bazlı kurallar (alwaysApply: true)
- `03-frontend.md` - Frontend kuralları (React + TypeScript)
- `04-backend.md` - Backend kuralları (Node.js + Express)
- `05-testing.md` - Testing standartları
- `06-security.md` - Security kuralları (alwaysApply: true)
- `07-logging.md` - Logging kuralları (alwaysApply: true)
- `08-performance.md` - Performance optimizasyon kuralları

## 🔧 Metadata Formatı

Her dosya front matter metadata içerir:

```yaml
---
alwaysApply: true/false    # Her zaman uygulanmalı mı?
priority: critical/high/medium/low
globs:                     # Hangi dosyalarda geçerli?
  - "src/**/*.ts"
version: 5.0.0
lastUpdated: 2025-01-27
---
```

## 📋 Kullanım

Cursor AI bu kuralları otomatik olarak okur ve kod önerilerinde kullanır.

### Öncelik Sıralaması:
1. **critical** - Mutlaka uyulmalı (Security, AI Directives)
2. **high** - Yüksek öncelik (Backend, General)
3. **medium** - Orta öncelik (Frontend, Testing, Performance)
4. **low** - Düşük öncelik (Özel durumlar)

## 🔄 Güncelleme

Kuralları güncellerken:
1. İlgili dosyayı düzenleyin
2. `lastUpdated` tarihini güncelleyin
3. Versiyon numarasını gerekirse artırın
4. `alwaysApply` ve `globs` değerlerini kontrol edin

---

**Versiyon:** 5.0.0  
**Son Güncelleme:** 2025-01-27

