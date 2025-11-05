# 🔄 Projede Güncellenmesi Gerekenler

**Tarih:** 2025-11-05  
**Proje:** Dese EA Plan v6.8.0  
**Durum:** Güncelleme Öncelik Listesi

---

## 🚨 Öncelik 1: Kritik Güncellemeler

### 1. Deprecated Paketler (Güvenlik Riski)

#### ⚠️ `multer@1.4.5-lts.2` - **KRİTİK**
- **Durum:** Deprecated (v1.x güvenlik açıkları var)
- **Önerilen:** `multer@2.x` veya alternatif
- **Güvenlik:** Yüksek öncelikli güncelleme gerekiyor
- **Etki:** File upload işlemleri etkilenebilir

**Güncelleme:**
```bash
npx pnpm@8.15.0 remove multer
npx pnpm@8.15.0 add multer@latest
```

#### ⚠️ `supertest@6.3.4` - **DEPRECATED**
- **Durum:** Deprecated (v7.1.3+ öneriliyor)
- **Önerilen:** `supertest@7.1.3+`
- **Etki:** Test dosyaları güncellenebilir

**Güncelleme:**
```bash
npx pnpm@8.15.0 add -D supertest@latest
```

#### ⚠️ `eslint@8.57.1` - **ARTIK DESTEKLENMİYOR**
- **Durum:** ESLint 8 artık desteklenmiyor
- **Önerilen:** `eslint@9.39.1`
- **Not:** ESLint 9 major breaking changes içeriyor, config güncellemesi gerekebilir

**Güncelleme:**
```bash
npx pnpm@8.15.0 add -D eslint@latest
# .eslintrc.json güncellemesi gerekebilir
```

---

## 📦 Öncelik 2: Paket Güncellemeleri

### Güncellenebilir Paketler (pnpm outdated)

#### Dependencies (Production)

| Paket | Mevcut | Güncel | Öncelik |
|-------|--------|--------|---------|
| `axios` | 1.12.2 | 1.13.2 | Orta |
| `bcryptjs` | 2.4.3 | 3.0.3 | Orta |
| `dotenv` | 16.6.1 | 17.2.3 | Düşük |

#### DevDependencies

| Paket | Mevcut | Güncel | Öncelik |
|-------|--------|--------|---------|
| `@types/node` | 20.19.23 | 24.10.0 | Orta |
| `@typescript-eslint/eslint-plugin` | 6.21.0 | 8.46.3 | Yüksek |
| `@typescript-eslint/parser` | 6.21.0 | 8.46.3 | Yüksek |
| `eslint-config-prettier` | 9.1.2 | 10.1.8 | Orta |
| `@types/bcryptjs` | 2.4.6 | 3.0.0 | Orta |
| `@types/express` | 4.17.24 | 5.0.5 | Düşük |
| `@types/multer` | 1.4.13 | 2.0.0 | Yüksek (multer ile birlikte) |

**Güncelleme Komutu:**
```bash
# Tek tek güncelleme (önerilen)
npx pnpm@8.15.0 update axios@latest
npx pnpm@8.15.0 update -D @types/node@latest

# Veya tümünü güncelle (dikkatli olunmalı)
npx pnpm@8.15.0 update --latest
```

---

## 📝 Öncelik 3: Dokümantasyon Güncellemeleri

### 1. README.md Versiyonu
- **Mevcut:** v6.7.0
- **Güncel:** v6.8.0 (package.json'da)
- **Düzeltme:** README.md'deki versiyonu güncelle

```markdown
# Dese EA Plan v6.8.0  # v6.7.0 yerine
```

### 2. Untracked Dosyalar
- `TAMAMLANDI_OZET.md` - Commit edilmeli
- `reports/efficiency_report_20251105.md` - Commit edilmeli veya .gitignore'a eklenmeli

**Aksiyon:**
```bash
# Commit et
git add TAMAMLANDI_OZET.md reports/efficiency_report_20251105.md
git commit -m "docs: add completion summary and efficiency report"

# Veya .gitignore'a ekle (eğer geçici rapor ise)
echo "reports/efficiency_report_*.md" >> .gitignore
```

---

## 🧪 Öncelik 4: Test Düzeltmeleri

### Başarısız Testler

#### `src/routes/aiops.test.ts` - 4 Test Başarısız
1. `should return telemetry data`
2. `should detect drift when threshold exceeded`
3. `should return 400 when threshold is missing`
4. `should handle error when drift detection fails`

#### `src/routes/metrics.test.ts` - 2 Test Başarısız
1. `should return 400 when action is missing`
2. `should return 400 when action is empty string`

**Aksiyon:**
- Test dosyalarını incele
- Mock'ları kontrol et
- Request body validation'ı düzelt

---

## 🎨 Öncelik 5: Code Quality

### 1. Prettier Formatlama
- `src/bus/audit-proxy.ts` ve diğer dosyalarda formatlama uyarıları var
- CRLF/LF line ending sorunları var

**Aksiyon:**
```bash
# Otomatik düzelt
npx pnpm@8.15.0 lint:fix

# Prettier formatla
npx prettier --write "src/**/*.{ts,tsx}"
```

### 2. ESLint Config Güncellemesi
- ESLint 9'a geçiş yapılırsa config güncellenmeli
- Flat config formatına geçiş gerekebilir

---

## 📊 Öncelik 6: Versiyon Güncellemeleri

### Major Version Güncellemeleri (Dikkatli Olunmalı)

#### TypeScript ESLint 6 → 8
- **Breaking Changes:** Var
- **Öncelik:** Yüksek (ESLint 9 ile uyumlu)
- **Not:** Config güncellemesi gerekebilir

#### bcryptjs 2 → 3
- **Breaking Changes:** Var
- **Öncelik:** Orta
- **Not:** API değişiklikleri olabilir

#### dotenv 16 → 17
- **Breaking Changes:** Muhtemelen yok
- **Öncelik:** Düşük

---

## 🔧 Öncelik 7: Script Güncellemeleri

### 1. JARVIS MCP Health Check
- MCP endpoint'leri güncellenmeli
- `/finbot/health`, `/mubot/health`, `/dese/health` olarak düzelt

**Dosya:** `scripts/jarvis-efficiency-chain.ps1`

### 2. Health Check Script
- ✅ Düzeltildi (zaten yapıldı)

---

## 📋 Güncelleme Planı

### Faz 1: Güvenlik Güncellemeleri (Hemen)

1. ⚠️ **multer 2.x'e güncelle** (Güvenlik)
2. ⚠️ **supertest 7.x'e güncelle** (Deprecated)
3. ✅ **ESLint 9'a geçiş** (Desteklenmiyor)

**Süre:** 1-2 saat  
**Risk:** Orta (Test gerekli)

### Faz 2: Paket Güncellemeleri (Bu Hafta)

1. **TypeScript ESLint 8.x'e güncelle**
2. **Type definitions güncelle**
3. **Diğer patch/minor güncellemeler**

**Süre:** 2-3 saat  
**Risk:** Düşük-Orta

### Faz 3: Test & Code Quality (Bu Hafta)

1. **Başarısız testleri düzelt**
2. **Prettier formatlama**
3. **ESLint config güncelle (ESLint 9 için)**

**Süre:** 3-4 saat  
**Risk:** Düşük

### Faz 4: Dokümantasyon (Bugün)

1. **README.md versiyonunu güncelle**
2. **Untracked dosyaları commit et**
3. **CHANGELOG.md güncelle**

**Süre:** 30 dakika  
**Risk:** Yok

---

## 🎯 Önerilen Güncelleme Sırası

### Hemen Yapılacaklar (Bugün)

1. ✅ **README.md versiyonunu güncelle** (5 dk)
2. ✅ **Untracked dosyaları commit et** (5 dk)
3. ⚠️ **multer 2.x'e güncelle** (30 dk + test)
4. ⚠️ **supertest 7.x'e güncelle** (15 dk + test)

### Bu Hafta Yapılacaklar

1. **TypeScript ESLint 8.x'e güncelle** (1 saat)
2. **Başarısız testleri düzelt** (2 saat)
3. **Prettier formatlama** (30 dk)
4. **Diğer paket güncellemeleri** (1 saat)

### Bu Ay Yapılacaklar

1. **ESLint 9'a geçiş** (2-3 saat)
2. **Test coverage artırma** (sürekli)
3. **CI/CD iyileştirmeleri** (4-6 saat)

---

## 📊 Güncelleme Özet Tablosu

| Kategori | Öncelik | Durum | Tahmini Süre |
|----------|---------|-------|--------------|
| **Güvenlik (multer)** | 🔴 Kritik | ⚠️ Bekliyor | 30 dk |
| **Deprecated (supertest)** | 🟠 Yüksek | ⚠️ Bekliyor | 15 dk |
| **ESLint 8 → 9** | 🟠 Yüksek | ⚠️ Bekliyor | 2-3 saat |
| **TypeScript ESLint 6 → 8** | 🟡 Orta | ⚠️ Bekliyor | 1 saat |
| **Test Düzeltmeleri** | 🟡 Orta | ⚠️ Bekliyor | 2 saat |
| **Prettier Formatlama** | 🟢 Düşük | ⚠️ Bekliyor | 30 dk |
| **README.md Versiyon** | 🟢 Düşük | ⚠️ Bekliyor | 5 dk |
| **Untracked Dosyalar** | 🟢 Düşük | ⚠️ Bekliyor | 5 dk |

---

## 🚀 Hızlı Başlangıç Komutları

### Güvenlik Güncellemeleri
```bash
# multer 2.x'e güncelle
npx pnpm@8.15.0 remove multer
npx pnpm@8.15.0 add multer@latest
npx pnpm@8.15.0 add -D @types/multer@latest

# supertest 7.x'e güncelle
npx pnpm@8.15.0 add -D supertest@latest

# Test et
npx pnpm@8.15.0 test
```

### TypeScript ESLint Güncelleme
```bash
# TypeScript ESLint 8.x'e güncelle
npx pnpm@8.15.0 add -D @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest

# Config güncelle (gerekirse)
# .eslintrc.json'ı kontrol et
```

### Dokümantasyon
```bash
# README.md versiyonunu güncelle
# Manuel: v6.7.0 → v6.8.0

# Untracked dosyaları commit et
git add TAMAMLANDI_OZET.md reports/efficiency_report_20251105.md
git commit -m "docs: add completion summary and efficiency report"
```

### Code Quality
```bash
# Prettier formatla
npx prettier --write "src/**/*.{ts,tsx}"

# Lint düzelt
npx pnpm@8.15.0 lint:fix
```

---

## ⚠️ Dikkat Edilmesi Gerekenler

### 1. Breaking Changes
- **multer 2.x:** API değişiklikleri olabilir
- **ESLint 9:** Flat config formatı gerekebilir
- **TypeScript ESLint 8:** Config güncellemesi gerekebilir

### 2. Test Gerekli
- Her major güncellemeden sonra test çalıştırılmalı
- Özellikle multer ve supertest güncellemeleri sonrası

### 3. Git Commit
- Her güncelleme öncesi branch oluştur
- Test geçtikten sonra commit et

---

## 📝 Sonraki Adımlar

1. **Bugün:** README.md versiyonu + Untracked dosyalar
2. **Bu Hafta:** Güvenlik güncellemeleri (multer, supertest)
3. **Bu Ay:** ESLint 9 + TypeScript ESLint 8 + Test düzeltmeleri

---

**Hazırlayan:** Cursor AI Assistant  
**Tarih:** 2025-11-05  
**Son Güncelleme:** 2025-11-05  
**Durum:** Güncelleme Planı Hazır

