# 📍 DATABASE_URL Nasıl Bulunur?

**Tarih:** 2025-01-27  
**Hedef:** Production deployment için DATABASE_URL'i bulma rehberi

---

## 🔍 DATABASE_URL Nedir?

`DATABASE_URL` PostgreSQL veritabanına bağlanmak için kullanılan connection string'idir.

**Format:**
```
postgresql://username:password@host:port/database_name
```

**Örnek:**
```
postgresql://dese_user:secure_password_123@db.poolfab.com.tr:5432/dese_ea_plan_v5
```

---

## 📋 DATABASE_URL'i Nereden Bulabilirsiniz?

### 1️⃣ **Production Database Bilgilerini Sistem Yöneticisinden İsteyin**

**En güvenli yöntem:** Production database bilgileri genellikle sistem yöneticisi veya DevOps ekibi tarafından yönetilir.

**İstemeniz gerekenler:**
- Database host (IP veya domain)
- Database port (genellikle 5432)
- Database name
- Database username
- Database password

**Sonra formatı şöyle oluşturun:**
```
postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE_NAME]
```

---

### 2️⃣ **Kubernetes Secrets'tan Alın**

Eğer production cluster'a erişiminiz varsa:

**Komut:**
```bash
kubectl get secret dese-ea-plan-v5-secrets -n dese-ea-plan-v5 -o jsonpath='{.data.DATABASE_URL}' | base64 -d
```

**PowerShell:**
```powershell
kubectl get secret dese-ea-plan-v5-secrets -n dese-ea-plan-v5 -o jsonpath='{.data.DATABASE_URL}' | ForEach-Object { [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_)) }
```

---

### 3️⃣ **Mevcut .env Dosyasından Kontrol Edin**

**Dikkat:** `.env` dosyası genellikle **development** ortamı için yapılandırılmıştır, **production** bilgileri içermez.

**Yine de kontrol edebilirsiniz:**
```powershell
# .env dosyası varsa kontrol edin
if (Test-Path .env) {
    Get-Content .env | Select-String "DATABASE_URL"
}
```

**Not:** `.env` dosyasındaki DATABASE_URL genellikle local development için yapılandırılmıştır (örn: `localhost` veya `db` hostname).

---

### 4️⃣ **Production Database Yöneticisinden Bilgi Alın**

**Sorulması gereken sorular:**

1. **Database nerede çalışıyor?**
   - Cloud (GCP, AWS, Azure)?
   - Self-hosted?
   - Kubernetes içinde mi?

2. **Connection bilgileri nedir?**
   - Host: `db.poolfab.com.tr` veya IP adresi
   - Port: Genellikle `5432`
   - Database name: `dese_ea_plan_v5` veya farklı bir isim
   - Username: Database kullanıcı adı
   - Password: Database şifresi

3. **Network erişimi:**
   - Database public erişime açık mı?
   - VPC/Private network içinde mi?
   - Whitelist/IP kısıtlaması var mı?

---

## 🛠️ DATABASE_URL Oluşturma Yardımcı Script'i

Bilgileri aldıktan sonra DATABASE_URL'i oluşturmak için:

```powershell
.\scripts\build-database-url.ps1
```

Bu script size sorular soracak ve DATABASE_URL'i oluşturacak.

---

## 📝 Örnek Senaryolar

### Senaryo 1: Cloud SQL (GCP)

Eğer Google Cloud SQL kullanıyorsanız:

**Cloud SQL Instance Connection Name:**
```
project-id:region:instance-name
```

**DATABASE_URL:**
```
postgresql://username:password@/database_name?host=/cloudsql/project-id:region:instance-name
```

**veya TCP üzerinden:**
```
postgresql://username:password@CLOUD_SQL_IP:5432/database_name
```

---

### Senaryo 2: Kubernetes İçinde PostgreSQL

Eğer PostgreSQL Kubernetes içinde çalışıyorsa:

**Service name ve namespace:**
```
postgresql://username:password@postgres-service.namespace:5432/database_name
```

**Örnek:**
```
postgresql://dese:dese123@postgres-service.dese-ea-plan-v5:5432/dese_ea_plan_v5
```

---

### Senaryo 3: External Database Server

Eğer harici bir PostgreSQL sunucusu kullanıyorsanız:

**External IP veya domain:**
```
postgresql://username:password@db.poolfab.com.tr:5432/dese_ea_plan_v5
```

**⚠️ Dikkat:** Password özel karakterler içeriyorsa URL encoding gerekebilir.

---

## 🔐 Güvenlik Notları

1. **Password Encoding:**
   - Eğer password özel karakterler içeriyorsa (örn: `@`, `:`, `/`), URL encoding yapmalısınız
   - Örnek: `password@123` → `password%40123`

2. **Production Password:**
   - Production password'u asla kod içinde göstermeyin
   - Asla log'lara yazdırmayın
   - Sadece GitHub Secrets'da saklayın

3. **Connection Security:**
   - Production'da SSL bağlantı kullanın:
   ```
   postgresql://user:pass@host:5432/db?sslmode=require
   ```

---

## 🆘 Yardım

**DATABASE_URL'i bulamıyorsanız:**

1. **Sistem Yöneticisine sorun:**
   - Production database connection bilgilerini isteyin
   - DevOps ekibi ile iletişime geçin

2. **Mevcut deployment'ı kontrol edin:**
   - Kubernetes secrets'ı kontrol edin
   - Production environment variable'ları kontrol edin

3. **Database yönetim paneli:**
   - Eğer bir database yönetim aracı varsa (phpPgAdmin, pgAdmin, vb.), connection bilgilerini oradan kontrol edin

---

## 📚 İlgili Dokümanlar

- `docs/GITHUB_SECRETS_ADD_GUIDE.md` - Secrets ekleme rehberi
- `env.example` - Environment variable örnekleri
- `k8s/secret.yaml` - Kubernetes secret örneği

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 1.0

