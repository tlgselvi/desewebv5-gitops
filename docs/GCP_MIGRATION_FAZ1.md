# Google Cloud Migration - Faz 1: Cloud SQL PostgreSQL Instance

**Proje:** Dese EA Plan v6.8.0  
**Tarih:** 2025-01-27  
**Versiyon:** 6.8.0  
**Durum:** ⏳ Hazırlık Aşaması

---

## 🎯 Amaç

PostgreSQL 15+ veritabanını Google Cloud SQL'de barındırmak için yeni bir instance oluşturmak.

---

## 📋 Gereksinimler

### Instance Bilgileri

| Parametre | Değer |
|-----------|-------|
| **Instance Adı** | `dese-ea-plan-db` |
| **Veritabanı Versiyonu** | `POSTGRES_15` |
| **Bölge (Region)** | `europe-west3` (Frankfurt) |
| **Makine Tipi (Tier)** | `db-g1-small` |
| **Storage Type** | SSD |
| **Storage Size** | 20GB (auto-increase) |
| **Backup** | Enabled (03:00 UTC) |
| **Binary Logging** | Enabled |
| **Maintenance Window** | Pazar 04:00 UTC |
| **Deletion Protection** | Enabled |

### Neden `europe-west3` (Frankfurt)?

- ✅ Türkiye'ye düşük gecikme süresi (~30-40ms)
- ✅ GDPR uyumlu (EU bölgesi)
- ✅ Yüksek performans
- ✅ Güvenilir altyapı

### Neden `db-g1-small`?

- ✅ ₺41.569 krediyi verimli kullanım
- ✅ Düşük maliyetli başlangıç
- ✅ Gerektiğinde scale-up yapılabilir
- ✅ Development ve test için yeterli

---

## 🚀 Komutlar

### 1. Google Cloud Proje Ayarlama

```bash
# Önce projenizi ayarlayın
gcloud config set project [481605933519]

# Proje ID'nizi kontrol edin
gcloud config get-value project
```

### 2. Instance Oluşturma (Manuel Komut)

```bash
gcloud sql instances create dese-ea-plan-db \
  --database-version=POSTGRES_15 \
  --region=europe-west3 \
  --tier=db-g1-small \
  --root-password="<GUVENLI_BIR_SIFRE_YAZIN>" \
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

### 3. Script ile Oluşturma

#### Windows PowerShell (Parametreli - Önerilen)

```powershell
.\scripts\gcp-cloud-sql-create-direct.ps1 -Password "GüvenliŞifre123!"
```

#### Windows PowerShell (İnteraktif)

```powershell
.\scripts\gcp-cloud-sql-create-ready.ps1
```

#### Linux/Mac (Bash)

```bash
chmod +x scripts/gcp-cloud-sql-create.sh
./scripts/gcp-cloud-sql-create.sh
```

---

## ✅ Şifre Güvenliği

**⚠️ ÖNEMLİ:** Komutta `<Topr@k2580>` yerine güçlü bir şifre kullanın:

### Şifre Gereksinimleri:
- ✅ Minimum 12 karakter
- ✅ Büyük harf, küçük harf, rakam ve özel karakter içermeli
- ✅ Yaygın kelimeler kullanmayın
- ✅ Şifreyi güvenli bir şekilde saklayın (password manager)

### Örnek Şifre Oluşturma:

```bash
# Linux/Mac
openssl rand -base64 32

# PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString()))
```

---

## 🔍 Doğrulama Adımları

### 1. Instance Durumunu Kontrol Et

```bash
gcloud sql instances describe dese-ea-plan-db
```

**Beklenen Çıktı:**
- `state: RUNNABLE`
- `backendType: SECOND_GENERATION`
- `databaseVersion: POSTGRES_15`

### 2. IP Adresini Al

```bash
gcloud sql instances describe dese-ea-plan-db \
  --format='value(ipAddresses[0].ipAddress)'
```

### 3. Connection String'i Al

```bash
gcloud sql instances describe dese-ea-plan-db \
  --format='value(connectionName)'
```

**Çıktı Formatı:** `[PROJE_ID]:[REGION]:[INSTANCE_NAME]`

---

## 📝 Sonraki Adımlar

### 1. Veritabanı Oluşturma (Opsiyonel)

```bash
gcloud sql databases create dese_db --instance=dese-ea-plan-db
```

### 2. Kullanıcı Oluşturma (Opsiyonel)

```bash
gcloud sql users create app_user \
  --instance=dese-ea-plan-db \
  --password="<GUVENLI_BIR_SIFRE_YAZIN>"
```

### 3. Environment Variable Güncelleme

```bash
# .env dosyasına ekleyin
DATABASE_URL=postgresql://postgres:<GUVENLI_BIR_SIFRE_YAZIN>@<IP_ADRESI>:5432/dese_db
```

### 4. Connection Test

```bash
# PostgreSQL client ile test
psql "postgresql://postgres:<GUVENLI_BIR_SIFRE_YAZIN>@<IP_ADRESI>:5432/dese_db"
```

---

## 💰 Maliyet Tahmini

### db-g1-small (Frankfurt)

- **CPU:** 1 vCPU (shared)
- **RAM:** 1.7 GB
- **Fiyat:** ~$25-30/ay (₺750-900/ay)
- **Storage:** 20GB SSD (auto-increase)
- **Backup:** Dahil (20GB'a kadar)

### Kredi Kullanımı

₺41.569 kredi ile yaklaşık **46-55 ay** ücretsiz kullanım mümkün (sadece Cloud SQL için).

---

## 🔒 Güvenlik Notları

1. **✅ Deletion Protection:** Instance yanlışlıkla silinemez
2. **✅ Backups:** Otomatik backup aktif (03:00 UTC)
3. **✅ Binary Logging:** Point-in-time recovery için aktif
4. **✅ Maintenance Window:** Production için optimize edildi
5. **⚠️ Şifre:** Güçlü şifre kullanın ve güvenli saklayın

---

## 📚 İlgili Dokümanlar

- [Google Cloud SQL Dokümantasyonu](https://cloud.google.com/sql/docs/postgres)
- [Cloud SQL Pricing](https://cloud.google.com/sql/pricing)
- [Cloud SQL Best Practices](https://cloud.google.com/sql/docs/postgres/best-practices)

---

## 🎯 Checklist

- [ ] Google Cloud proje ID'si ayarlandı
- [ ] Güçlü root şifresi belirlendi
- [ ] Instance oluşturuldu
- [ ] Instance durumu kontrol edildi (RUNNABLE)
- [ ] IP adresi alındı
- [ ] Connection string hazırlandı
- [ ] Environment variable güncellendi
- [ ] Connection test edildi

---

**Son Güncelleme:** 2025-01-27  
**Hazırlayan:** Cursor AI Assistant  
**Versiyon:** 6.8.0

