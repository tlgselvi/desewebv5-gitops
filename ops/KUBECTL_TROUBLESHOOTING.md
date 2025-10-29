# kubectl Troubleshooting & Best Practices Guide

## 📋 İçindekiler

1. [TTY Uyarıları ve kubectl exec Kullanımı](#tty-uyarıları)
2. [Health Check Komutları](#health-check-komutları)
3. [Interactive vs Non-Interactive Komutlar](#interactive-vs-non-interactive)
4. [Yaygın Hatalar ve Çözümleri](#yaygın-hatalar)
5. [Best Practices](#best-practices)

---

## TTY Uyarıları ve kubectl exec Kullanımı

### ❌ YANLIŞ KULLANIM

```bash
# Bu komut TTY uyarısı verir (non-interactive komut için gereksiz)
kubectl exec -it <pod-name> -n <namespace> -- curl -s http://localhost:8080/api/v1/health
```

**Çıktı:**
```
Unable to use a TTY - input is not a terminal or the right kind of file
{"status":"healthy","service":"backend"}
```

**Açıklama:** `-it` parametresi TTY (interactive terminal) gerektirir. Non-interactive komutlar (`curl`, `wget`, `cat`, vb.) için gereksizdir ve uyarı mesajı üretir. Komut yine çalışır ancak uyarı rahatsız edici olabilir.

---

### ✅ DOĞRU KULLANIM

```bash
# Non-interactive komutlar için -it kullanmayın
kubectl exec <pod-name> -n <namespace> -- curl -s http://localhost:8080/api/v1/health
```

**Çıktı:**
```json
{
  "status": "healthy",
  "service": "backend",
  "version": "1.0.0"
}
```

**Sonuç:** TTY uyarısı olmadan, temiz JSON çıktısı alınır.

---

## Health Check Komutları

### Backend Health Check

```bash
# Pod içinden health endpoint kontrolü
POD_NAME=$(kubectl get pods -n <namespace> -l app=<app-label> -o jsonpath='{.items[0].metadata.name}')
kubectl exec $POD_NAME -n <namespace> -- curl -s http://localhost:8080/api/v1/health

# Beklenen Sonuç:
# {
#   "status": "healthy",
#   "service": "backend",
#   "version": "1.0.0"
# }
```

### Metrics Endpoint Kontrolü

```bash
# Prometheus metrics endpoint'i test et
kubectl exec <pod-name> -n <namespace> -- curl -s http://localhost:3000/metrics | head -20
```

### Database Connection Test

```bash
# Database bağlantı testi (etkileşimli DEĞİL)
kubectl exec <pod-name> -n <namespace> -- \
  node -e "require('pg').connect(process.env.DATABASE_URL, () => console.log('OK'))"
```

---

## Interactive vs Non-Interactive

### ⚠️ Interactive Komutlar İçin `-it` Kullanın

**Interactive komutlar:**
- `/bin/sh`, `/bin/bash` - Shell oturumu açmak için
- `psql`, `mysql` - Database client'ları (interactive mode)
- Editörler (`vim`, `nano`)
- Debug araçları (`tcpdump`, `strace` ile interactive flag'ler)

**Örnek:**
```bash
# Pod içine shell ile girmek için -it GEREKLİ
kubectl exec -it <pod-name> -n <namespace> -- /bin/sh

# Database'e bağlanmak için (interactive mode) -it GEREKLİ
kubectl exec -it <pod-name> -n <namespace> -- psql $DATABASE_URL
```

### ✅ Non-Interactive Komutlar İçin `-it` KULLANMAYIN

**Non-interactive komutlar:**
- `curl`, `wget` - HTTP istekleri
- `cat`, `head`, `tail` - Dosya okuma
- `grep`, `awk`, `sed` - Text işleme
- Script'ler ve programlar
- `node`, `python` - Script çalıştırma

**Örnek:**
```bash
# curl - non-interactive, -it GEREKSİZ
kubectl exec <pod-name> -n <namespace> -- curl -s http://localhost:8080/health

# Script çalıştırma - non-interactive, -it GEREKSİZ
kubectl exec <pod-name> -n <namespace> -- node -e "console.log('OK')"
```

---

## İleri Seviye Test (Manuel Doğrulama)

Pod içine girip elle test yapmak isterseniz:

```bash
# 1. Pod içine interactive shell ile gir
kubectl exec -it <pod-name> -n <namespace> -- /bin/sh

# 2. Pod içinde komutları çalıştır
curl -v http://localhost:8080/api/v1/health
ps aux
env | grep DATABASE
```

**Not:** Bu yaklaşım debugging için faydalıdır, ancak otomatik script'lerde non-interactive komutları tercih edin.

---

## Yaygın Hatalar ve Çözümleri

### Hata 1: "Unable to use a TTY"

**Belirti:**
```
Unable to use a TTY - input is not a terminal or the right kind of file
```

**Sebep:** Non-interactive komut için `-it` kullanılmış.

**Çözüm:** `-it` parametresini kaldırın.

```bash
# ❌ Yanlış
kubectl exec -it <pod> -- curl http://localhost:8080/health

# ✅ Doğru
kubectl exec <pod> -- curl -s http://localhost:8080/health
```

---

### Hata 2: "command terminated with exit code 1"

**Sebep:** Pod içinde komut bulunamıyor veya çalıştırılamıyor.

**Çözüm:**
```bash
# Önce pod'un içinde hangi binary'ler var kontrol et
kubectl exec <pod-name> -n <namespace> -- which curl

# Eğer curl yoksa, busybox veya başka bir image kullan
kubectl exec <pod-name> -n <namespace> -- wget -qO- http://localhost:8080/health

# Veya curl'i olan bir pod üzerinden test et
kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -- \
  curl http://<service-name>.<namespace>.svc.cluster.local:8080/health
```

---

### Hata 3: Timeout veya Connection Refused

**Sebep:** Service hazır değil veya yanlış port/endpoint.

**Çözüm:**
```bash
# Pod'un çalıştığını doğrula
kubectl get pods -n <namespace> -l app=<app-label>

# Service'in var olduğunu kontrol et
kubectl get svc -n <namespace>

# Port doğru mu kontrol et
kubectl describe pod <pod-name> -n <namespace> | grep -i port

# Localhost yerine service name kullan (farklı namespace'deyse)
kubectl exec <pod-name> -n <namespace> -- \
  curl http://<service-name>.<namespace>.svc.cluster.local:8080/health
```

---

## Best Practices

### 1. Health Check Script'leri

```bash
#!/bin/bash
NAMESPACE="dese-ea-plan-v5"
POD_NAME=$(kubectl get pods -n $NAMESPACE -l app=backend -o jsonpath='{.items[0].metadata.name}')

# -it KULLANMAYIN (non-interactive)
HEALTH=$(kubectl exec $POD_NAME -n $NAMESPACE -- curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)

if [ "$HEALTH" = "200" ]; then
  echo "✅ Health check passed"
  exit 0
else
  echo "❌ Health check failed: $HEALTH"
  exit 1
fi
```

### 2. CI/CD Pipeline'larında

```yaml
# GitHub Actions örneği
- name: Health Check
  run: |
    POD=$(kubectl get pods -n dese-ea-plan-v5 -l app=backend -o jsonpath='{.items[0].metadata.name}')
    kubectl exec $POD -n dese-ea-plan-v5 -- curl -sf http://localhost:8080/health
    # Not: -it KULLANILMADI (CI ortamında TTY yok)
```

### 3. Monitoring Script'leri

```powershell
# PowerShell örneği
$podName = kubectl get pods -n dese-ea-plan-v5 -l app=backend --no-headers | Select-Object -First 1
$health = kubectl exec $podName.Split()[0] -n dese-ea-plan-v5 -- curl -s http://localhost:8080/health
# -it KULLANILMADI
```

---

## Özet Tablosu

| Komut Türü | `-it` Gerekli mi? | Örnek |
|------------|-------------------|-------|
| `curl`, `wget` | ❌ Hayır | `kubectl exec <pod> -- curl ...` |
| `cat`, `grep`, `tail` | ❌ Hayır | `kubectl exec <pod> -- tail /var/log/app.log` |
| `/bin/sh`, `/bin/bash` | ✅ Evet | `kubectl exec -it <pod> -- /bin/sh` |
| `psql` (interactive) | ✅ Evet | `kubectl exec -it <pod> -- psql ...` |
| Script çalıştırma | ❌ Hayır | `kubectl exec <pod> -- node script.js` |
| Debug araçları | ⚠️ Duruma göre | Interactive ise `-it`, değilse yok |

---

## Sonuç

**Kural:** 
- **Interactive komutlar** (shell, database client, vb.) için → `-it` kullan
- **Non-interactive komutlar** (curl, wget, script'ler, vb.) için → `-it` kullanma

**TTY uyarısı alırsanız:**
1. Komut genellikle yine çalışır ✅
2. Ancak uyarı rahatsız edici olabilir
3. `-it` parametresini kaldırarak temiz çıktı alınır ✅

**Komut başarısız olursa:**
- Pod'un çalıştığını doğrula
- Komutun pod içinde mevcut olduğunu kontrol et
- Network/port ayarlarını kontrol et
- Log'ları incele: `kubectl logs <pod-name> -n <namespace>`

---

## Referanslar

- [Kubernetes kubectl exec Documentation](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#exec)
- [TTY (Teletype) - Wikipedia](https://en.wikipedia.org/wiki/Teleprinter)
- Bu doküman: `ops/KUBECTL_TROUBLESHOOTING.md`
