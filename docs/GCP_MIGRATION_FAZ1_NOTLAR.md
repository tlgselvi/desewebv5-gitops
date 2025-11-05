# Google Cloud SQL Migration - Önemli Notlar

**Proje:** Dese EA Plan v6.8.0  
**Tarih:** 2025-01-27

---

## ⚠️ Önemli Düzeltmeler

### 1. Binary Logging (PostgreSQL'de Desteklenmiyor)

**Sorun:** `--enable-bin-log` parametresi yalnızca MySQL için çalışır.

**Çözüm:** PostgreSQL için bu parametre kaldırılmalı.

**Etki:** PostgreSQL'de point-in-time recovery için otomatik backup kullanılır (zaten aktif).

---

### 2. Labels Parametresi

**Sorun:** `--labels` parametresi normal gcloud komutunda desteklenmiyor.

**Çözüm:** Labels kaldırıldı veya `gcloud alpha/beta` kullanılabilir.

**Not:** Production için labels zorunlu değil, instance adı ve metadata yeterli.

---

### 3. Billing Hesabı Kontrolü

**Sorun:** "The billing account is not in good standing" hatası.

**Çözüm:** 
1. Google Cloud Console'da billing hesabını kontrol edin
2. Billing hesabının aktif olduğundan emin olun
3. Kredi limiti kontrol edin
4. Billing hesabı ekleyin veya güncelleyin

**Kontrol Komutları:**
```bash
# Billing hesabını kontrol et
gcloud billing accounts list

# Projeye billing hesabı ekle
gcloud billing projects link powerful-genre-466023-e1 --billing-account=BILLING_ACCOUNT_ID
```

---

## ✅ Düzeltilmiş Komut

### Windows PowerShell (Tek Satır)

```powershell
gcloud sql instances create dese-ea-plan-db --database-version=POSTGRES_15 --region=europe-west3 --tier=db-g1-small --root-password="GüvenliŞifre123!" --storage-type=SSD --storage-size=20GB --storage-auto-increase --backup-start-time=03:00 --maintenance-window-day=SUN --maintenance-window-hour=4 --maintenance-release-channel=production --deletion-protection
```

### Windows PowerShell (Çok Satır)

```powershell
gcloud sql instances create dese-ea-plan-db `
  --database-version=POSTGRES_15 `
  --region=europe-west3 `
  --tier=db-g1-small `
  --root-password="GüvenliŞifre123!" `
  --storage-type=SSD `
  --storage-size=20GB `
  --storage-auto-increase `
  --backup-start-time=03:00 `
  --maintenance-window-day=SUN `
  --maintenance-window-hour=4 `
  --maintenance-release-channel=production `
  --deletion-protection
```

### Linux/Mac (Bash)

```bash
gcloud sql instances create dese-ea-plan-db \
  --database-version=POSTGRES_15 \
  --region=europe-west3 \
  --tier=db-g1-small \
  --root-password="GüvenliŞifre123!" \
  --storage-type=SSD \
  --storage-size=20GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4 \
  --maintenance-release-channel=production \
  --deletion-protection
```

---

## 🔧 Önce Yapılması Gerekenler

### 1. Billing Hesabı Kontrolü

```bash
# Billing hesabı listesi
gcloud billing accounts list

# Projeye billing hesabı ekle (eğer yoksa)
gcloud billing projects link powerful-genre-466023-e1 --billing-account=BILLING_ACCOUNT_ID
```

### 2. API'lerin Aktif Olduğundan Emin Olun

```bash
# Cloud SQL Admin API'yi aktif et
gcloud services enable sqladmin.googleapis.com
```

---

## 📋 Kaldırılan Parametreler

1. ❌ `--enable-bin-log` - PostgreSQL'de desteklenmiyor (MySQL için)
2. ❌ `--labels=...` - Normal gcloud komutunda desteklenmiyor (alpha/beta gerekli)

---

## ✅ Aktif Parametreler

- ✅ `--database-version=POSTGRES_15`
- ✅ `--region=europe-west3`
- ✅ `--tier=db-g1-small`
- ✅ `--root-password="..."` (güvenli şifre)
- ✅ `--storage-type=SSD`
- ✅ `--storage-size=20GB`
- ✅ `--storage-auto-increase`
- ✅ `--backup-start-time=03:00`
- ✅ `--maintenance-window-day=SUN`
- ✅ `--maintenance-window-hour=4`
- ✅ `--maintenance-release-channel=production`
- ✅ `--deletion-protection`

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 6.8.0

