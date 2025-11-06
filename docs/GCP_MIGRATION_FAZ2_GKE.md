# Google Cloud Migration - Faz 2: Google Kubernetes Engine (GKE)

**Proje:** Dese EA Plan v6.8.0  
**Tarih:** 2025-01-27  
**Versiyon:** 6.8.0  
**Durum:** ✅ Başarıyla Tamamlandı

---

## 🎯 Amaç

Projenin çalışacağı ana Google Kubernetes Engine (GKE) cluster'ını oluşturmak.

---

## ✅ Cluster Oluşturuldu

### Cluster Bilgileri

| Özellik | Değer |
|---------|-------|
| **Cluster Adı** | `dese-ea-plan-cluster` |
| **Proje ID** | `ea-plan-seo-project` |
| **Region** | `europe-west3` (Frankfurt) |
| **Machine Type** | `e2-small` ⚠️ (Quota nedeniyle e2-medium yerine) |
| **Node Count** | `3` (Quota nedeniyle 2 yerine) |
| **Disk Size** | `50 GB` |
| **Master Version** | `1.33.5-gke.1162000` |
| **Node Version** | `1.33.5-gke.1162000` |
| **Release Channel** | `regular` |
| **Status** | `RUNNING` ✅ |

---

## ⚠️ Önemli Not: Quota Sorunu

**Sorun:** İlk denemede `e2-medium` ve `2 node` ile quota yetersizdi:
- Gereken: `600 GB SSD_TOTAL_GB`
- Mevcut quota: `500 GB SSD_TOTAL_GB`

**Çözüm:** Daha küçük bir yapıyla başladık:
- Machine Type: `e2-small` (e2-medium yerine)
- Disk Size: `50 GB` (default 100 GB yerine)

**Sonuç:** Cluster başarıyla oluşturuldu, ancak daha sonra quota artırılarak `e2-medium` ve `2 node`'a yükseltilebilir.

---

## 📋 Gereksinimler

### 1. API Aktifleştirme

```bash
gcloud services enable container.googleapis.com
```

**Durum:** ✅ API aktif edildi

### 2. Cluster Oluşturma Komutu (İdeal)

```bash
gcloud container clusters create dese-ea-plan-cluster \
  --region=europe-west3 \
  --num-nodes=2 \
  --machine-type=e2-medium \
  --release-channel=regular \
  --disk-size=100
```

**Durum:** ⚠️ Quota yetersiz (e2-small ile oluşturuldu)

### 3. Cluster Oluşturma Komutu (Quota Yetersizse)

```bash
gcloud container clusters create dese-ea-plan-cluster \
  --region=europe-west3 \
  --num-nodes=1 \
  --machine-type=e2-small \
  --release-channel=regular \
  --disk-size=50
```

**Durum:** ✅ Bu komutla oluşturuldu

---

## 🔗 Cluster Bağlantısı

### kubectl Context Ayarlama

```bash
gcloud container clusters get-credentials dese-ea-plan-cluster --region=europe-west3
```

### Cluster Durumunu Kontrol

```bash
kubectl get nodes
kubectl get pods --all-namespaces
```

---

## 📝 Environment Variable

`.env` dosyanıza ekleyin (gerekirse):

```env
GKE_CLUSTER_NAME=dese-ea-plan-cluster
GKE_REGION=europe-west3
GKE_PROJECT=ea-plan-seo-project
```

---

## 🎯 Neden `europe-west3` (Frankfurt)?

- ✅ Cloud SQL instance ile aynı bölgede (düşük latency)
- ✅ Memorystore Redis ile aynı bölgede (düşük latency)
- ✅ Türkiye'ye yakın (düşük gecikme süresi)
- ✅ Yüksek performans için aynı region'da

---

## 💰 Maliyet

- **Machine Type:** e2-small (~$15-20/ay per node)
- **Node Count:** 3 nodes
- **Tahmini Maliyet:** ~$45-60/ay (3 node için)

**Not:** Quota artırıldıktan sonra `e2-medium` ve `2 node`'a yükseltilebilir (maliyet yaklaşık aynı kalır).

---

## 🔧 Quota Artırma

Quota'yı artırmak için:

1. Google Cloud Console'a gidin:
   https://console.cloud.google.com/iam-admin/quotas?usage=USED&project=ea-plan-seo-project

2. `SSD_TOTAL_GB` quota'sını bulun

3. "EDIT QUOTAS" butonuna tıklayın

4. Yeni limit: `1000 GB` (veya daha fazla)

5. İsteği gönderin (onay genellikle 24 saat içinde)

---

## 📋 Sonraki Adımlar

1. ✅ GKE API aktif edildi
2. ✅ Cluster oluşturuldu
3. ⏳ kubectl context ayarla
4. ⏳ Cluster'ı test et
5. ⏳ Application deployment
6. ⏳ Ingress controller kurulumu
7. ⏳ Monitoring ve logging setup

---

## 🔒 Güvenlik Notları

1. **Network:** Default VPC network kullanılıyor
2. **Access Control:** RBAC aktif
3. **Secrets:** Kubernetes secrets kullanılabilir
4. **Firewall:** GKE otomatik firewall kuralları oluşturur

---

## ⚠️ Önemli Notlar

1. **Quota:** SSD_TOTAL_GB quota'sı kontrol edilmeli
2. **Machine Type:** e2-small ile başladık, quota artırıldıktan sonra e2-medium'a yükseltilebilir
3. **Node Count:** 3 node oluştu (quota nedeniyle)
4. **Region:** `europe-west3` (Cloud SQL ve Redis ile aynı)

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 6.8.0

