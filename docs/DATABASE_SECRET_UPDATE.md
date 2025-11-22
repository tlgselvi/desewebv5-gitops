# Database Secret Güncelleme Kılavuzu

## 🎯 Amaç

Bu doküman, Cloud SQL instance'ındaki postgres kullanıcısının şifresini güncellemek ve Kubernetes Secret'ını bu şifre ile senkronize etmek için gerekli adımları açıklar.

## 📋 Ön Gereksinimler

- `gcloud` CLI kurulu ve yapılandırılmış
- `kubectl` CLI kurulu ve cluster'a bağlı
- Cloud SQL instance: `dese-ea-plan-db`
- Kubernetes Secret: `dese-db-secret`

## 🔧 Adım 1: Cloud SQL'de Şifreyi Reset Etme

### Seçenek A: Mevcut Şifreyi Biliyorsanız
Eğer mevcut şifreyi biliyorsanız, bu adımı atlayabilirsiniz ve doğrudan **Adım 2**'ye geçebilirsiniz.

### Seçenek B: Yeni Şifre Oluşturma (Önerilen)

```powershell
# Güvenli bir şifre oluşturun (min 8 karakter, özel karakter içermeli)
$NEW_PASSWORD = "GüvenliYeniŞifre123!"

# Cloud SQL'de postgres kullanıcısının şifresini güncelleyin
gcloud sql users set-password postgres `
  --instance=dese-ea-plan-db `
  --password=$NEW_PASSWORD
```

## 🔧 Adım 2: Kubernetes Secret'ı Güncelleme

```powershell
# Şifreyi değişkene alın (yukarıdaki $NEW_PASSWORD veya mevcut şifre)
$DB_PASSWORD = "YENİ_VEYA_MEVCUT_ŞİFRE"

# DATABASE_URL'i oluşturun (Cloud SQL Proxy üzerinden bağlantı için 127.0.0.1 kullanın)
$DB_URL = "postgresql://postgres:$DB_PASSWORD@127.0.0.1:5432/dese_db"

# Kubernetes Secret'ı güncelleyin
kubectl create secret generic dese-db-secret `
  --from-literal=password=$DB_PASSWORD `
  --from-literal=DATABASE_URL=$DB_URL `
  --dry-run=client -o yaml | kubectl apply -f -
```

## ✅ Adım 3: Pod'ların Yeniden Başlamasını Bekleme

Secret güncellendikten sonra Kubernetes, pod'ları otomatik olarak yeniden başlatacaktır:

```powershell
# Pod durumunu kontrol edin
kubectl get pods -n default -l app=dese-api -w

# Beklenen durum: Pod'ların "Running" ve "2/2 Ready" olması
# Örnek: dese-api-deployment-xxxxx   2/2   Running   0   1m
```

## 🔍 Adım 4: Bağlantıyı Doğrulama

```powershell
# Backend log'larını kontrol edin
$POD_NAME = kubectl get pods -n default -l app=dese-api --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}'

# Database bağlantısı başarılı mı?
kubectl logs $POD_NAME -n default -c dese-api --tail=50 | Select-String -Pattern "database|Database|connection|Connection|connected|Connected|error|Error"

# Health check endpoint'i test edin
kubectl exec $POD_NAME -n default -c dese-api -- curl -f http://localhost:3001/health/ready
```

## 🚨 Sorun Giderme

### Problem: "password authentication failed"

**Çözüm:**
- Cloud SQL'deki şifre ile Secret'taki şifrenin eşleştiğinden emin olun
- Secret'ı tekrar güncelleyin ve pod'ların yeniden başladığını kontrol edin

### Problem: Pod'lar READY durumuna geçmiyor

**Çözüm:**
```powershell
# Pod events'lerini kontrol edin
kubectl describe pod <POD_NAME> -n default

# Cloud SQL Proxy log'larını kontrol edin
kubectl logs <POD_NAME> -n default -c cloud-sql-proxy --tail=50

# Backend log'larını kontrol edin
kubectl logs <POD_NAME> -n default -c dese-api --tail=50
```

## 📝 Notlar

- Secret güncellemesi atomik olarak yapılır (--dry-run ile test edilir)
- Pod'lar Secret güncellendikten sonra otomatik olarak yeniden başlar
- Cloud SQL Proxy bağlantıları `127.0.0.1:5432` üzerinden yapılır
- DATABASE_URL formatı: `postgresql://postgres:PASSWORD@127.0.0.1:5432/dese_db`

## 🔐 Güvenlik

- Şifreler Kubernetes Secret'larında base64 encoded olarak saklanır
- Secret'lar cluster içinde güvenli bir şekilde yönetilir
- Şifreleri kod içinde veya log'larda görünür hale getirmeyin
