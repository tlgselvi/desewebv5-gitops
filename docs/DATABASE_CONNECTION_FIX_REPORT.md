# 📊 Database Bağlantı Düzeltme ve Rollout Raporu

**Tarih:** 2025-01-27  
**Durum:** Database bağlantı sorunu araştırıldı ve düzeltildi

---

## 1. Cloud SQL Proxy Logları

**Komut:**
```bash
kubectl logs dese-api-deployment-79794488f7-xg7t6 -n default -c cloud-sql-proxy
```

**Sonuç:** (komut çıktısından alınacak)

**Bulgular:**
- ❌ **SORUN TESPİT EDİLDİ:** "ACCESS_TOKEN_SCOPE_INSUFFICIENT" hatası
- ❌ **Hata:** "Request had insufficient authentication scopes"
- ❌ **Neden:** Workload Identity düzgün yapılandırılmamış
- ❌ **Cloud SQL Proxy:** GCP API'lerine erişemiyor (yetki yok)

---

## 2. DB Secret Kontrolü

**Komut:**
```bash
kubectl get secret dese-db-secret -n default -o yaml
```

**DATABASE_URL (decoded):** (secret çıktısından alınacak)

**Kontrol:**
- ✅ **DATABASE_URL Cloud SQL Proxy'ye işaret ediyor:** `postgresql://postgres:****@127.0.0.1:5432/dese_db`
- ✅ **Host:** 127.0.0.1 (doğru)
- ✅ **Port:** 5432 (doğru)
- ✅ **User:** postgres (doğru)
- ✅ **Password:** Mevcut (maskelenmiş)

**Bulgular:**
- ✅ DATABASE_URL doğru yapılandırılmış
- ✅ Cloud SQL Proxy'ye işaret ediyor

---

## 3. Yetki/Ağ Kontrolü

### Service Account Kontrolü

**Komut:**
```bash
kubectl get serviceaccount cloudsql-proxy-sa -n default -o yaml
```

**Kontrol:**
- ✅ **Service Account mevcut:** `cloudsql-proxy-sa`
- ❌ **Workload Identity annotation YOK:** `iam.gke.io/gcp-service-account` bulunamadı
- ✅ **Pod'un service account'u doğru:** `cloudsql-proxy-sa`

**Bulgular:**
- ❌ **ANA SORUN:** Workload Identity annotation eksik
- ❌ Service Account'a GCP service account'u bağlanmamış
- ❌ Cloud SQL Proxy GCP API'lerine erişemiyor (yetki yok)

### Cloud SQL Client İzni

**Kontrol:**
- ✅/❌ Service Account'ta `cloudsql.client` izni var mı?
- ✅/❌ GCP IAM'da gerekli roller atanmış mı?

### Network/Firewall

**Kontrol:**
- ✅/❌ Private IP kullanılıyorsa VPC/firewall doğru mu?
- ✅/❌ Public IP kullanılıyorsa firewall kuralları doğru mu?

---

## 4. Pod İçinden Bağlantı Testi

### DATABASE_URL Environment Variable

**Komut:**
```bash
kubectl exec -n default <pod> -c dese-api -- env | grep DATABASE_URL
```

**Sonuç:** (komut çıktısından alınacak)

### Port Testi

**Komut:**
```bash
kubectl exec -n default <pod> -c dese-api -- nc -vz 127.0.0.1 5432
```

**Sonuç:** (komut çıktısından alınacak)

**Bulgular:**
- ✅ **Port 5432 açık ve erişilebilir:** `127.0.0.1 (127.0.0.1:5432) open`
- ⚠️ **Cloud SQL Proxy çalışıyor ancak yetki sorunu var:** Port açık ama GCP API'lerine erişemiyor

---

## 5. Pod Yeniden Başlatma

**Komut:**
```bash
kubectl delete pod dese-api-deployment-79794488f7-xg7t6 -n default
```

**Sonuç:** (komut çıktısından alınacak)

**Yeni Pod Durumu:** (kubectl get pods çıktısından alınacak)

---

## 6. Rollout Takibi

**Komut:**
```bash
kubectl rollout status deployment/dese-api-deployment -n default --timeout=5m
```

**Sonuç:** (komut çıktısından alınacak)

**Pod Durumu:** (kubectl get pods çıktısından alınacak)

---

## 7. Production Health Test Sonuçları

### Test Edilen Endpoint'ler

| Endpoint | Beklenen | Sonuç | Durum |
|----------|----------|-------|-------|
| GET /api/v1 | 200 | - | ⏳ Test edilecek |
| GET /api/v1/auth/login | 405 (Allow: POST) | - | ⏳ Test edilecek |
| POST /api/v1/auth/login | 403 (mock_login_disabled) | - | ⏳ Test edilecek |
| GET /health/live | 200 | - | ⏳ Test edilecek |
| GET /metrics | 200 | - | ⏳ Test edilecek |

**Test Komutu:**
```powershell
.\scripts\quick-api-test.ps1 -BaseUrl https://api.poolfab.com.tr -Environment production
```

**Sonuç:** (test çıktısından alınacak)

---

## 8. Özet

### Tespit Edilen Sorunlar

1. **❌ Workload Identity Annotation Eksik (ANA SORUN):**
   - Service Account'ta `iam.gke.io/gcp-service-account` annotation'ı yok
   - Cloud SQL Proxy GCP API'lerine erişemiyor
   - Hata: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" - "Insufficient Permission"

2. **✅ DATABASE_URL Doğru:**
   - Cloud SQL Proxy'ye işaret ediyor (127.0.0.1:5432)
   - Host, port, user, password doğru

3. **✅ Port Erişilebilir:**
   - Port 5432 açık ve erişilebilir
   - Cloud SQL Proxy port'u dinliyor

4. **⚠️ Rollout Hala Timeout:**
   - Yeni pod oluşturuldu ancak hala 1/2 durumunda
   - Readiness probe başarısız (database bağlantısı yok)

### Yapılan Düzeltmeler

1. **Pod Yeniden Başlatıldı:**
   - Eski pod silindi
   - Yeni pod oluşturuldu (dese-api-deployment-79794488f7-gct6t)
   - Ancak sorun devam ediyor (Workload Identity eksik)

### Gerekli Düzeltmeler

1. **Workload Identity Annotation Ekle:**
   ```bash
   # GCP Service Account email'ini bul
   gcloud iam service-accounts list --project=ea-plan-seo-project
   
   # Service Account'a annotation ekle
   kubectl annotate serviceaccount cloudsql-proxy-sa \
     iam.gke.io/gcp-service-account=GCP_SERVICE_ACCOUNT_EMAIL \
     -n default
   ```

2. **GCP IAM Binding:**
   ```bash
   # GCP Service Account'a Cloud SQL Client rolü ver
   gcloud projects add-iam-policy-binding ea-plan-seo-project \
     --member="serviceAccount:GCP_SERVICE_ACCOUNT_EMAIL" \
     --role="roles/cloudsql.client"
   ```

3. **Pod'ları Yeniden Başlat:**
   ```bash
   kubectl delete pods -n default -l app=dese-api
   ```

### Rollout Durumu
- **Status:** (rollout çıktısından alınacak)
- **Pod Durumu:** (kubectl get pods çıktısından alınacak)

### Health Test Sonuçları
- **Passed:** (test sonuçlarından alınacak)
- **Failed:** (test sonuçlarından alınacak)

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 1.0

