# Google Cloud SQL Instance Oluşturma - Direkt Komut

**Proje:** Dese EA Plan v6.8.0  
**Tarih:** 2025-01-27  
**Proje ID:** `powerful-genre-466023-e1`

---

## 🚀 Tek Komut ile Oluşturma

### Windows PowerShell (Tek Satır)

```powershell
gcloud sql instances create dese-ea-plan-db --database-version=POSTGRES_15 --region=europe-west3 --tier=db-g1-small --root-password="GUVENLI_SIFRENIZ_BURAYA" --storage-type=SSD --storage-size=20GB --storage-auto-increase --backup-start-time=03:00 --enable-bin-log --maintenance-window-day=SUN --maintenance-window-hour=4 --maintenance-release-channel=production --deletion-protection --labels=project=dese-ea-plan,version=v6.8.0,environment=production
```

### Windows PowerShell (Çok Satır - Okunabilir)

```powershell
gcloud sql instances create dese-ea-plan-db `
  --database-version=POSTGRES_15 `
  --region=europe-west3 `
  --tier=db-g1-small `
  --root-password="GUVENLI_SIFRENIZ_BURAYA" `
  --storage-type=SSD `
  --storage-size=20GB `
  --storage-auto-increase `
  --backup-start-time=03:00 `
  --enable-bin-log `
  --maintenance-window-day=SUN `
  --maintenance-window-hour=4 `
  --maintenance-release-channel=production `
  --deletion-protection `
  --labels=project=dese-ea-plan,version=v6.8.0,environment=production
```

### Linux/Mac (Bash)

```bash
gcloud sql instances create dese-ea-plan-db \
  --database-version=POSTGRES_15 \
  --region=europe-west3 \
  --tier=db-g1-small \
  --root-password="GUVENLI_SIFRENIZ_BURAYA" \
  --storage-type=SSD \
  --storage-size=20GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4 \
  --maintenance-release-channel=production \
  --deletion-protection \
  --labels=project=dese-ea-plan,version=v6.8.0,environment=production
```

---

## 📝 Parametreli Script Kullanımı

### Windows PowerShell

```powershell
.\scripts\gcp-cloud-sql-create-direct.ps1 -Password "GüvenliŞifre123!"
```

---

## ⚠️ ÖNEMLİ: Şifre Değiştirme

**`GUVENLI_SIFRENIZ_BURAYA`** yerine güçlü bir şifre kullanın:

### Şifre Gereksinimleri:
- ✅ Minimum 12 karakter
- ✅ Büyük harf (A-Z)
- ✅ Küçük harf (a-z)
- ✅ Rakam (0-9)
- ✅ Özel karakter (!@#$%^&*)

### Örnek Güçlü Şifre:
```
Topr@k2580!Secure
```

---

## ✅ Instance Oluşturulduktan Sonra

### 1. Durum Kontrolü

```bash
gcloud sql instances describe dese-ea-plan-db
```

### 2. IP Adresini Al

```bash
gcloud sql instances describe dese-ea-plan-db --format='value(ipAddresses[0].ipAddress)'
```

### 3. Veritabanı Oluştur

```bash
gcloud sql databases create dese_db --instance=dese-ea-plan-db
```

### 4. Connection String

```
postgresql://postgres:GUVENLI_SIFRENIZ_BURAYA@<IP_ADRESI>:5432/dese_db
```

---

**Not:** Terminal interaktif çalışmıyorsa, şifreyi doğrudan komut içine yazın veya parametreli script kullanın.

