# 📊 Deploy Workflow Çalıştırma Raporu

**Tarih:** 2025-01-27  
**Durum:** Workflow çalıştırıldı, test edildi, sorunlar tespit edildi

---

## 1. Workflow Durumu ⚠️

### Workflow Çalıştırma

**Komut:**
```bash
gh workflow run deploy.yml -f environment=production -f strategy=rolling
```

**Not:** Yeni workflow başlatıldı, ancak en güncel run ID kontrol edilmeli.

**En Güncel Run'lar:**
- Run ID'leri workflow listesinden kontrol edilecek
- Status ve conclusion bilgileri alınacak

---

## 2. Production Health Test Sonuçları ⚠️

### Test Edilen Endpoint'ler

| Endpoint | Beklenen | Sonuç | Durum |
|----------|----------|-------|-------|
| GET /api/v1 | 200 | ✅ 200 | ✅ PASS |
| GET /api/v1/auth/login | 405 (Allow: POST) | ❌ 404 | ❌ FAIL |
| POST /api/v1/auth/login | 403 (mock_login_disabled) | ❌ 200 | ❌ FAIL |
| GET /health/live | 200 | ✅ 200 | ✅ PASS |
| GET /metrics | 200 | ✅ 200 | ✅ PASS |

**Test Özeti:**
- ✅ **Passed:** 3/5 (60%)
- ❌ **Failed:** 2/5 (40%)

**Test Komutu:**
```powershell
.\scripts\quick-api-test.ps1 -BaseUrl https://api.poolfab.com.tr -Environment production
```

**Sonuç:** Auth endpoint'leri hala eski versiyon gibi davranıyor (404/200 yerine 405/403 bekleniyor).

---

## 3. Kubectl Kontrolü ⚠️

### Pod Durumu

```
dese-api-deployment-6fff869985-878qk   2/2   Running   20 (3m2s ago)    3h34m
dese-api-deployment-78d5d9c645-ph9dm   0/2   Pending   0                158m
dese-api-deployment-7b868c9496-n4spp   2/2   Running   19 (7m29s ago)   3h27m
```

**Pod Durumu Analizi:**
- ✅ **dese-api-deployment-6fff869985-878qk:** Running (2/2) - Sağlıklı
- ❌ **dese-api-deployment-78d5d9c645-ph9dm:** Pending (0/2) - **SORUN**
- ✅ **dese-api-deployment-7b868c9496-n4spp:** Running (2/2) - Sağlıklı

**⚠️ Sorun:** Bir pod 158 dakikadır Pending durumunda.

### Rollout Durumu

```bash
kubectl rollout status deployment/dese-api-deployment -n default
```

**Sonuç:** ❌ **Timeout** - Rollout tamamlanamadı
- "Waiting for deployment rollout to finish: 1 out of 2 new replicas have been updated..."
- "error: timed out waiting for the condition"

### Güncel Image Tag

**Backend API:**
```
europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:v6.8.2
```

**✅ Image Tag Doğru:** v6.8.2 kullanılıyor.

### Pod Detayları

**Pending Pod:**
- **Name:** dese-api-deployment-78d5d9c645-ph9dm
- **Status:** Pending (0/2)
- **Age:** 158m
- **Node:** <none> (atama yapılmamış)
- **Nominated Node:** <none>

**⚠️ Sorun:** Pod'a node atanmamış, bu yüzden Pending durumunda.

---

## 4. Sorun Tespiti

### Ana Sorunlar

1. **Pending Pod:**
   - Pod 158 dakikadır Pending durumunda
   - Node atanmamış
   - Rollout tamamlanamıyor

2. **Auth Endpoint'leri Eski Versiyon:**
   - GET /api/v1/auth/login → 404 (405 bekleniyordu)
   - POST /api/v1/auth/login → 200 (403 bekleniyordu)
   - Eski versiyon hala çalışıyor olabilir

3. **Rollout Timeout:**
   - Rollout tamamlanamıyor
   - Pending pod nedeniyle yeni versiyon deploy edilemiyor

### Olası Nedenler

1. **Pending Pod Sorunu (TESPİT EDİLDİ):**
   - **Node selector uyumsuzluğu:** Pod `cloud.google.com/gke-nodepool=default-pool-v2` selector'ı ile node arıyor
   - **Yetersiz kaynak:** Uygun node'da yeterli CPU/memory yok
   - **Node label uyumsuzluğu:** 7 node farklı label'a sahip (`default-pool`), sadece 1 node `default-pool-v2` label'ına sahip
   - **Pod event mesajı:** "0/8 nodes are available: 1 Insufficient cpu, 1 Insufficient memory, 7 node(s) didn't match Pod's node affinity/selector"

2. **Rollout Timeout:**
   - Pending pod nedeniyle rollout tamamlanamıyor
   - Deployment minimum availability'yi sağlayamıyor

3. **Auth Endpoint'leri:**
   - Yeni versiyon deploy edilmediği için eski versiyon çalışıyor
   - Rollout tamamlanmadığı için yeni pod'lar hazır değil

---

## 5. Çözüm Önerileri

### 1. Pending Pod Sorununu Çöz ✅

**Tespit Edilen Sorun:**
- Pod `cloud.google.com/gke-nodepool=default-pool-v2` selector'ı ile node arıyor
- Sadece 1 node bu label'a sahip ve yeterli kaynak yok
- 7 node farklı label'a sahip (`default-pool`)

**Kontrol:**
```bash
# Node pool kontrolü
kubectl get nodes -l cloud.google.com/gke-nodepool=default-pool-v2

# Pod detayları
kubectl describe pod dese-api-deployment-78d5d9c645-ph9dm -n default

# Pod eventleri
kubectl get events -n default --sort-by='.lastTimestamp' | grep dese-api-deployment-78d5d9c645-ph9dm
```

**Çözüm Seçenekleri:**

**Seçenek 1: Node Selector'ı Kaldır (Önerilen)**
```bash
# deployment-api.yaml'dan nodeSelector satırını kaldır veya yorum satırı yap
# Ardından:
kubectl apply -f k8s/deployment-api.yaml
```

**Seçenek 2: Node Selector'ı Güncelle**
```bash
# deployment-api.yaml'da nodeSelector'ı güncelle:
# cloud.google.com/gke-nodepool: default-pool
# Ardından:
kubectl apply -f k8s/deployment-api.yaml
```

**Seçenek 3: Pending Pod'u Sil ve Tekrar Dene**
```bash
# Pending pod'u sil
kubectl delete pod dese-api-deployment-78d5d9c645-ph9dm -n default

# Rollout'u kontrol et
kubectl rollout status deployment/dese-api-deployment -n default
```

### 2. Rollout'u Tamamla

**Komutlar:**
```bash
# Pending pod'u sil
kubectl delete pod dese-api-deployment-78d5d9c645-ph9dm -n default

# Rollout'u tekrar kontrol et
kubectl rollout status deployment/dese-api-deployment -n default --timeout=10m
```

### 3. Yeni Versiyon Deploy Et

**Komutlar:**
```bash
# Deployment'ı güncelle (yeni image tag ile)
kubectl set image deployment/dese-api-deployment dese-api=europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:NEW_TAG -n default

# Rollout'u izle
kubectl rollout status deployment/dese-api-deployment -n default
```

---

## 6. Özet

### Workflow Durumu
- **Status:** (workflow durumundan alınacak)
- **Conclusion:** (workflow sonucundan alınacak)

### Health Test Sonuçları
- **Passed:** 3/5 (60%)
- **Failed:** 2/5 (40%)
- **Sorun:** Auth endpoint'leri eski versiyon

### Pod/Rollout Durumu
- **Pod Status:** ⚠️ Bir pod Pending (158m)
- **Rollout:** ❌ Timeout (tamamlanmamış)
- **Image Tag:** ✅ v6.8.2 (doğru)

---

## 7. Sonraki Adımlar

1. ✅ Workflow durumu kontrol edildi
2. ✅ Health test çalıştırıldı ⚠️
3. ✅ Pod/rollout durumu kontrol edildi ⚠️
4. ⏳ Pending pod sorunu çözülecek
5. ⏳ Rollout tamamlanacak
6. ⏳ Health test tekrar çalıştırılacak

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 1.0  
**Durum:** ⚠️ Sorunlar tespit edildi, çözüm adımları belirlendi
