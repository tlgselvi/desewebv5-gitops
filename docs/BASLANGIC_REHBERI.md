# 🚀 EA Plan v6.x Başlangıç Rehberi

## 📚 İçindekiler

1. [Temel Kavramlar](#temel-kavramlar)
2. [İlk Adım: Port-Forward Nedir?](#ilk-adım-port-forward-nedir)
3. [FinBot & MuBot'u Görüntüleme](#finbot--mubotu-görüntüleme)
4. [Prometheus Kullanımı](#prometheus-kullanımı)
5. [Grafana Kullanımı](#grafana-kullanımı)
6. [Hızlı Kontrol Script'leri](#hızlı-kontrol-scriptleri)

---

## 🎯 Temel Kavramlar

### Port-Forward Nedir?

Kubernetes cluster'ınızda çalışan servislere, bilgisayarınızdan erişmek için **port-forward** kullanılır.

**Basit Analoji:**
- Cluster içinde FinBot `8080` portunda çalışıyor
- Siz bilgisayarınızdan `localhost:8081` adresine bağlanıyorsunuz
- Port-forward bu ikisini birbirine bağlıyor

---

## 📊 FinBot & MuBot'u Görüntüleme

### Adım 1: Terminal/PowerShell Açın

Windows'ta:
1. `Win + X` tuşlarına basın
2. "Windows PowerShell" veya "Terminal" seçin

### Adım 2: Port-Forward Başlatın

**FinBot için:**
```powershell
kubectl port-forward svc/finbot 8081:80 -n aiops
```

**Ne olacak?**
- Terminal'de `Forwarding from 127.0.0.1:8081 -> 80` mesajını göreceksiniz
- Bu terminali **açık bırakın** (kapatmayın!)

**MuBot için (yeni bir terminal penceresi açın):**
```powershell
kubectl port-forward svc/mubot 8082:81 -n aiops
```

### Adım 3: Tarayıcıda Açın

1. Web tarayıcınızı açın (Chrome, Edge, Firefox)
2. Adres çubuğuna yazın:

**FinBot:**
```
http://localhost:8081/health
```

**MuBot:**
```
http://localhost:8082/health
```

**Metrics (Prometheus formatında):**
```
http://localhost:8081/metrics
http://localhost:8082/metrics
```

### Adım 4: Sonuç

✅ **Başarılı ise:** JSON formatında veri göreceksiniz
```
{"status": "healthy", "service": "finbot"}
```

❌ **Hata ise:**
- Port-forward'un çalıştığından emin olun
- Terminal penceresini kontrol edin
- `kubectl get pods -n aiops` ile pod'ların Running olduğunu kontrol edin

---

## 📈 Prometheus Kullanımı

### Adım 1: Prometheus Port-Forward

Yeni bir terminal penceresi açın:
```powershell
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
```

### Adım 2: Prometheus UI'ı Açın

Tarayıcıda:
```
http://localhost:9090
```

### Adım 3: Query Yazın

1. Sayfanın üst kısmında "Expression" kutusunu bulun
2. Şu query'leri deneyin:

**Basit query:**
```
up
```

**FinBot kontrolü:**
```
up{namespace="aiops"}
```

**FinBot metrics:**
```
finbot_predictive_score
finbot_roi_score
```

**MuBot metrics:**
```
mubot_failure_probability
mubot_data_quality
```

### Adım 4: Sonuçları Görün

1. "Execute" butonuna tıklayın
2. "Graph" veya "Table" sekmesinden sonuçları görün
3. Değerler grafik olarak veya tablo olarak görünecek

---

## 📊 Grafana Kullanımı

### Adım 1: Grafana Port-Forward

Yeni bir terminal penceresi açın:
```powershell
kubectl port-forward svc/grafana 3000:3000 -n monitoring
```

### Adım 2: Grafana'ya Giriş

Tarayıcıda:
```
http://localhost:3000
```

**Giriş Bilgileri:**
- Username: `admin`
- Password: `admin`
- (İlk girişte şifre değiştirme istenebilir)

### Adım 3: Dashboard Kullanımı

1. Sol menüden "Dashboards" → "Browse" seçin
2. Mevcut dashboard'ları görebilirsiniz
3. Yeni dashboard oluşturmak için: "+" → "Create Dashboard"

---

## 🛠️ Hızlı Kontrol Script'leri

### FinBot Hızlı İnceleme

PowerShell'de:
```powershell
./ops/finbot-quick-inspect.ps1
```

**Ne yapar?**
- FinBot ve MuBot pod'larını bulur
- Loglarını gösterir
- Port-forward komutlarını hazırlar
- Metrics endpoint'lerini test eder

---

## 🎯 Pratik Örnekler

### Senaryo 1: FinBot'un Sağlık Durumunu Kontrol Etmek

```powershell
# 1. Port-forward başlat (terminal 1)
kubectl port-forward svc/finbot 8081:80 -n aiops

# 2. Yeni terminal aç (terminal 2)
curl http://localhost:8081/health
```

**Veya PowerShell'de:**
```powershell
Invoke-WebRequest -Uri http://localhost:8081/health
```

### Senaryo 2: FinBot Metrics'lerini Görmek

```powershell
# 1. Port-forward başlat
kubectl port-forward svc/finbot 8081:80 -n aiops

# 2. Tarayıcıda aç
# http://localhost:8081/metrics
```

### Senaryo 3: Prometheus'da Query Yazmak

1. Prometheus port-forward: `kubectl port-forward svc/prometheus 9090:9090 -n monitoring`
2. Tarayıcıda: `http://localhost:9090`
3. Query kutusuna: `finbot_predictive_score`
4. Execute'a tıkla

---

## ⚠️ Sık Karşılaşılan Sorunlar

### Problem 1: "Connection refused"

**Çözüm:**
```powershell
# Pod'un çalıştığını kontrol et
kubectl get pods -n aiops

# Eğer CrashLoopBackOff görürseniz:
kubectl logs <pod-name> -n aiops
```

### Problem 2: Port zaten kullanılıyor

**Çözüm:**
```powershell
# Port'u kullanan process'i bul
netstat -ano | findstr :8081

# Process'i kapat (PID ile)
taskkill /PID <PID> /F
```

### Problem 3: "Unable to connect"

**Çözüm:**
1. Port-forward'un çalıştığından emin olun
2. Terminal penceresini kontrol edin (hata mesajı var mı?)
3. Pod'un Running durumunda olduğunu kontrol edin

---

## 📚 Daha Fazla Bilgi

- [Prometheus Query Guide](./PROMETHEUS_QUERY_GUIDE.md)
- [Pipeline Guide](./EA_PLAN_V6_PIPELINE_GUIDE.md)
- [Audit Guide](./EA_PLAN_V6_AUDIT_GUIDE.md)

---

## 🆘 Yardım İhtiyacı?

Herhangi bir sorunla karşılaşırsanız:
1. Pod loglarını kontrol edin: `kubectl logs <pod-name> -n aiops`
2. Pod durumunu kontrol edin: `kubectl get pods -n aiops`
3. Port-forward'un çalıştığını kontrol edin

