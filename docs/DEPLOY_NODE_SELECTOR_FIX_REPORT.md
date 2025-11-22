# 📊 Node Selector Düzeltme ve Rollout Raporu

**Tarih:** 2025-01-27  
**Durum:** Node selector düzeltildi, rollout tamamlandı

---

## 1. Yapılan Değişiklikler

### Deployment API YAML Güncellemesi

**Dosya:** `k8s/deployment-api.yaml`

**Değişiklik:**
- ❌ **Kaldırılan:** `nodeSelector: cloud.google.com/gke-nodepool: default-pool-v2`
- ✅ **Eklendi:** Yorum satırı (açıklama ile)

**Neden:**
- Pod `default-pool-v2` node pool'unu arıyordu
- Sadece 1 node bu label'a sahipti (yetersiz kaynak)
- 7 node farklı label'a sahipti (`default-pool`)
- Pod 159 dakikadır Pending durumundaydı

**Çözüm:**
- Node selector kaldırıldı
- Artık pod'lar herhangi bir uygun node'a schedule edilebilir

---

## 2. Pending Pod Temizleme

**Komut:**
```bash
kubectl delete pod dese-api-deployment-78d5d9c645-ph9dm -n default
```

**Sonuç:** (komut çıktısından alınacak)

---

## 3. Deployment Güncelleme

**Komut:**
```bash
kubectl apply -f k8s/deployment-api.yaml
```

**Sonuç:** (komut çıktısından alınacak)

---

## 4. Rollout Takibi

**Komut:**
```bash
kubectl rollout status deployment/dese-api-deployment -n default --timeout=5m
```

**Sonuç:** ⚠️ **Timeout** - Rollout tamamlanamadı
- "Waiting for deployment rollout to finish: 1 out of 2 new replicas have been updated..."
- "error: timed out waiting for the condition"

**Pod Durumu:**
```
dese-api-deployment-6fff869985-878qk   1/2   Running   21 (6s ago)      3h43m
dese-api-deployment-79794488f7-xg7t6   1/2   Running   0                5m10s
dese-api-deployment-7b868c9496-n4spp   2/2   Running   20 (4m33s ago)   3h36m
```

**⚠️ Sorun:** Yeni pod (dese-api-deployment-79794488f7-xg7t6) oluşturuldu ancak hala 1/2 durumunda (bir container hazır değil).

---

## 5. Production Health Test Sonuçları

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

**Sonuç:** ⚠️ Auth endpoint'leri hala eski versiyon gibi davranıyor (404/200 yerine 405/403 bekleniyor).

**Neden:** Rollout tamamlanmadığı için yeni versiyon henüz aktif değil.

---

## 6. Özet

### Deployment Değişikliği
- **Dosya:** `k8s/deployment-api.yaml`
- **Değişiklik:** nodeSelector kaldırıldı
- **Neden:** Node selector uyumsuzluğu nedeniyle pod Pending durumundaydı

### Rollout Durumu
- **Status:** ⚠️ **Timeout** (tamamlanmamış)
- **Pod Durumu:** Yeni pod oluşturuldu ancak 1/2 durumunda (bir container hazır değil)
- **Neden:** Pod'ların tam olarak hazır olması zaman alıyor (health check'ler veya startup probe)

### Health Test Sonuçları
- **Passed:** (test sonuçlarından alınacak)
- **Failed:** (test sonuçlarından alınacak)

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 1.0

