# 📁 Workspace Yapısı Rehberi

## 🎯 Önemli Klasörler (Dokunmayın)

```
desewebv5/
├── src/                    # ✅ Ana backend kodu (141 dosya)
│   ├── modules/           # Modüller (CRM, Finance, HR, IoT, vb.)
│   ├── mcp/               # MCP sunucuları
│   ├── db/                # Veritabanı şemaları
│   └── services/          # İş mantığı servisleri
│
├── frontend/              # ✅ Next.js frontend
│   └── src/              # React component'leri
│
├── docs/                  # ✅ Dokümantasyon
├── tests/                 # ✅ Test dosyaları
├── drizzle/               # ✅ DB migration'ları
├── docker-compose.yml     # ✅ Docker config
└── package.json           # ✅ Bağımlılıklar
```

## 🗑️ Temizlenebilir (Git'te Yok)

Bu klasörler `.gitignore`'da, Git'e commit edilmiyorlar:

- `node_modules/` - Bağımlılıklar (pnpm install ile yeniden oluşur)
- `coverage/` - Test coverage raporları
- `test-results/`, `playwright-report/` - Test raporları
- `logs/` - Log dosyaları
- `frontend/.next/` - Next.js build çıktıları

**Temizlemek için:**
```powershell
.\scripts\cleanup-workspace.ps1
```

## 📦 Arşiv Klasörü (İsteğe Bağlı)

`archive/` klasöründe 49 eski dokümantasyon dosyası var:
- `archive/old-docs/` - v5.x versiyon dokümantasyonları
- `archive/v6.8.1-sprint-end/` - v6.8.1 sprint dokümantasyonları

**Öneri:** Referans için tutabilirsiniz veya ayrı bir repo'ya taşıyabilirsiniz.

## 🔍 PC Manager'daki Dosyalar

PC Manager'da gördüğünüz Python ve Node.js cache dosyaları:
- ✅ **Sistem cache dosyaları** - Projenizi etkilemez
- ✅ **Güvenle silebilirsiniz** - Gerektiğinde otomatik yeniden oluşur
- ✅ **Proje klasörünüzde değil** - Sistem genelinde

### npm Cache Klasörü

`C:\Users\tlgse\AppData\Local\npm-cache\_cacache\content-v2\sha512\94\df` gibi uzun yollar:
- ✅ **npm'in global cache klasörü** - Sistem genelinde
- ✅ **Projede kullanılmıyor** - Proje **pnpm** kullanıyor (npm değil)
- ✅ **Güvenle temizlenebilir** - `npm cache clean --force` veya script ile

**Temizlemek için:**
```powershell
.\scripts\cleanup-npm-cache.ps1
```

### pip Cache Klasörü

`C:\Users\tlgse\AppData\Local\pip\cache\http-v2\a\b\2\d\1` gibi uzun yollar:
- ✅ **pip'in global cache klasörü** - Sistem genelinde
- ✅ **Projede kullanılıyor** - FinBot, MuBot, AIOps Python servisleri var
- ⚠️ **Dikkat:** Docker build'lerde `--no-cache-dir` kullanılıyor, local development için virtualenv öneriliyor
- ✅ **Güvenle temizlenebilir** - `pip cache purge` veya script ile

**Projede Python kullanılan yerler:**
- `deploy/finbot-v2/` - FinBot servisi (FastAPI, Prophet)
- `deploy/mubot-v2/` - MuBot servisi (FastAPI, Pandas)
- `aiops/` - AIOps scriptleri
- `scripts/*.py` - Çeşitli Python scriptleri

**Temizlemek için:**
```powershell
.\scripts\cleanup-pip-cache.ps1
```

## 📊 Dosya İstatistikleri

- **Toplam Dosya:** ~500+ (node_modules hariç)
- **Kaynak Kod:** ~141 dosya (`src/`)
- **Test:** ~38 dosya (`tests/`)
- **Dokümantasyon:** ~70+ dosya (`docs/`)

## 💡 İpuçları

1. **IDE'de Görünürlük:** `.gitignore`'daki dosyalar IDE'de görünebilir ama Git'e commit edilmez
2. **Temizlik:** Düzenli olarak `cleanup-workspace.ps1` çalıştırın
3. **Arama:** IDE'de arama yaparken `node_modules` ve `coverage` klasörlerini exclude edin

