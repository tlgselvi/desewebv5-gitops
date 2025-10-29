# Prometheus Query Examples

## FinBot & MuBot için Arama Yöntemleri

### 1. Tüm Aktif Job'ları Görme
```
Query: up
```
Sonuçlarda `job` label kolonuna bakın. FinBot/MuBot job'larını orada bulabilirsiniz.

### 2. Job İsimlerine Göre Arama
```
up{job=~'.*fin.*'}    # 'fin' içeren job'lar
up{job=~'.*mu.*'}     # 'mu' içeren job'lar
up{job=~'.*bot.*'}    # 'bot' içeren job'lar
up{job=~'.*cron.*'}   # CronJob'lar
```

### 3. Tüm Job İsimlerini Listeleme
```
label_values(up, job)
```
Bu query tüm unique job isimlerini döndürür.

### 4. Metric İsimlerine Göre Arama
```
finbot_
mubot_
cron_
job_
```

### 5. CronJob Metrics
FinBot ve MuBot genellikle CronJob olarak çalışır:
```
kube_job_status_succeeded{job_name=~'.*finbot.*'}
kube_job_status_succeeded{job_name=~'.*mubot.*'}
```

## Diğer Yararlı Queries

### Sistem Metrics
```
up                                    # Tüm aktif endpoint'ler
up{job="prometheus"}                 # Prometheus kendisi
up{job=~".*kube.*"}                  # Kubernetes metrics
```

### CPU & Memory
```
process_cpu_seconds_total
process_resident_memory_bytes
container_cpu_usage_seconds_total
container_memory_usage_bytes
```

### HTTP Metrics
```
http_requests_total
http_request_duration_seconds
```

## Prometheus API Kullanımı

### PowerShell ile Tüm Metrics'i Listele
```powershell
Invoke-RestMethod -Uri "http://localhost:9090/api/v1/label/__name__/values" | 
  ConvertFrom-Json | 
  Select-Object -ExpandProperty data
```

### FinBot/MuBot Metrics'i Filtrele
```powershell
Invoke-RestMethod -Uri "http://localhost:9090/api/v1/label/__name__/values" | 
  ConvertFrom-Json | 
  Select-Object -ExpandProperty data | 
  Where-Object { $_ -like "*finbot*" -or $_ -like "*mubot*" }
```

## Troubleshooting

### Empty Query Result Nedenleri
1. **Servis henüz deploy edilmemiş**: FinBot/MuBot pod/service yok
2. **Metrics export edilmemiş**: Pod çalışıyor ama Prometheus metrics'i yok
3. **ServiceMonitor eksik**: Prometheus metrics'i scrape edemiyor
4. **Farklı isimle export ediliyor**: Metrics farklı prefix ile olabilir

### Kontrol Komutları
```powershell
# Tüm pod'ları kontrol et
kubectl get pods -A

# Tüm service'leri kontrol et
kubectl get svc -A

# ServiceMonitor'ları kontrol et
kubectl get servicemonitor -A

# Prometheus configuration kontrol
kubectl get configmap prometheus-config -n monitoring -o yaml
```

