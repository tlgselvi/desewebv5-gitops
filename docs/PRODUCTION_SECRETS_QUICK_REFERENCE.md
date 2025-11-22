# 🔐 Production Secrets Hızlı Referans

**Tarih:** 2025-01-27  
**Hedef:** GitHub Actions secrets ekleme için hızlı referans

---

## 📋 GitHub Secrets Listesi (11 adet)

### ✅ Hazır Olanlar (Oluşturuldu)

1. ✅ **JWT_SECRET** - Oluşturuldu: `QzCVMG<e(9@$1[z]NWn50=9c4;])0G9WrM1MfGtbf{LbM-nJxp-ru;oMq@bk<9:$`
2. ✅ **COOKIE_KEY** - Oluşturuldu: `k|>b#jvi*@l^k?J.F}S?]ovl7;.*[mc3<JYQX4lR:|]v.I#r23P}L)#)BNW}<nfB`
3. ✅ **KUBECONFIG_PRODUCTION** - Konum: `C:\Users\tlgse\.kube\config`

### ⚠️ Bulunması/İstenmesi Gerekenler

4. ⚠️ **KUBECONFIG_STAGING** - Production ile aynı veya ayrı staging kubeconfig
5. ⚠️ **DATABASE_URL** - Sistem yöneticisinden alınacak
6. ⚠️ **REDIS_URL** - Sistem yöneticisinden alınacak
7. ⚠️ **GOOGLE_CLIENT_ID** - Google Cloud Console'dan
8. ⚠️ **GOOGLE_CLIENT_SECRET** - Google Cloud Console'dan
9. ⚠️ **GOOGLE_CALLBACK_URL** - Production callback URL
10. ⚠️ **PROMETHEUS_URL** - veya `MCP_PROMETHEUS_BASE_URL`

---

## 🛠️ Yardımcı Script'ler

### Secret Oluşturma
```powershell
# JWT_SECRET oluştur (✅ yapıldı)
.\scripts\generate-secret.ps1 JWT_SECRET

# COOKIE_KEY oluştur (✅ yapıldı)
.\scripts\generate-secret.ps1 COOKIE_KEY
```

### Bulma Script'leri
```powershell
# Kubeconfig bul
.\scripts\get-kubeconfig-path.ps1

# DATABASE_URL bul
.\scripts\find-database-url.ps1

# REDIS_URL bul
.\scripts\find-redis-url.ps1
```

### Oluşturma Script'leri
```powershell
# DATABASE_URL oluştur
.\scripts\build-database-url.ps1

# REDIS_URL oluştur
.\scripts\build-redis-url.ps1
```

### Kontrol Script'leri
```powershell
# GitHub Secrets kontrolü
.\scripts\check-github-secrets.ps1 -Environment production
```

---

## 📝 Hızlı Ekleme Adımları

### 1. GitHub'a Git
```
https://github.com/[OWNER]/dese-ea-plan-v5/settings/secrets/actions
```

### 2. Secret Ekleme
Her secret için:
1. "New repository secret" → Tıkla
2. **Name:** Secret adı (örn: `JWT_SECRET`)
3. **Secret:** Secret değeri (yukarıdaki değerleri kopyalayın)
4. "Add secret" → Tıkla

### 3. Kontrol
```powershell
.\scripts\check-github-secrets.ps1 -Environment production
```

---

## 📚 Detaylı Rehberler

- `docs/GITHUB_SECRETS_ADD_GUIDE.md` - Adım adım detaylı rehber
- `docs/FIND_DATABASE_URL.md` - DATABASE_URL bulma rehberi
- `docs/FIND_REDIS_URL.md` - REDIS_URL bulma rehberi
- `docs/PRODUCTION_ENV_CHECKLIST.md` - Production environment checklist

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 1.0

