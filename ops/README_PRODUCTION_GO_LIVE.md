# EA Plan v6.5.1 Production Go-Live

## 🚀 Hızlı Başlangıç

### Local Execution

```bash
# Detaylı script
./ops/production-go-live.sh

# Tek komut versiyonu
bash ops/production-go-live-one-liner.sh
```

### Remote Execution (GitHub)

```bash
# Cloudflare token ile birlikte
CF_API_TOKEN="your_cloudflare_token" && \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/CPTSystems/ea-plan/main/ops/production-go-live.sh)"
```

## ⚠️ Güvenlik Notları

### Remote Script Execution

**ÖNEMLİ:** Remote script execution yapmadan önce:

1. **Script'i inceleyin:**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/CPTSystems/ea-plan/main/ops/production-go-live.sh -o /tmp/go-live.sh
   cat /tmp/go-live.sh
   # Script'i gözden geçirin
   ```

2. **Güvenli çalıştırma:**
   ```bash
   # İnceleme sonrası güvenli çalıştırma
   CF_API_TOKEN="your_token" bash /tmp/go-live.sh
   ```

3. **Script hash kontrolü (opsiyonel):**
   ```bash
   # Beklenen hash'i kontrol edin (opsiyonel)
   echo "expected_hash" | sha256sum -c
   ```

### Token Güvenliği

- `CF_API_TOKEN` environment variable olarak ayarlayın
- Token'ı script'e hardcode etmeyin
- Production ortamında secret management kullanın

## 📋 Adım Adım Yapılacaklar

### 1. Pre-Flight Checks

```bash
# Kubernetes bağlantısı
kubectl cluster-info

# Namespace kontrolü
kubectl get ns ea-web

# Pod durumları
kubectl get pods -n ea-web
```

### 2. Token Ayarlama

```bash
# Cloudflare token export
export CF_API_TOKEN="your_cloudflare_api_token"

# Token doğrulama (opsiyonel)
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

### 3. Script Execution

```bash
# Local script
./ops/production-go-live.sh

# Veya remote
CF_API_TOKEN="$CF_API_TOKEN" bash -c "$(curl -fsSL https://raw.githubusercontent.com/CPTSystems/ea-plan/main/ops/production-go-live.sh)"
```

### 4. Post-Deployment Validation

```bash
# Ingress kontrolü
kubectl get ingress -n ea-web

# ConfigMap kontrolü
kubectl get configmap ea-plan-v6-4 -n ea-web -o yaml

# Endpoint kontrolü
curl -I https://www.cptsystems.com

# Monitoring kontrolü
kubectl get pods -n monitoring -l app=prometheus
```

## 🔧 Sorun Giderme

### Script Çalışmıyor

```bash
# Executable permission kontrolü
chmod +x ops/production-go-live.sh

# Syntax kontrolü
bash -n ops/production-go-live.sh
```

### CDN Token Hatası

```bash
# Token kontrolü
echo $CF_API_TOKEN

# Manuel CDN purge
curl -X POST "https://api.cloudflare.com/client/v4/zones/cptsystems.com/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### Ingress Oluşturulamıyor

```bash
# Ingress controller kontrolü
kubectl get pods -n ingress-nginx

# Mevcut Ingress'leri kontrol et
kubectl get ingress -n ea-web
```

### ConfigMap Güncellenemiyor

```bash
# ConfigMap mevcut mu?
kubectl get configmap ea-plan-v6-4 -n ea-web

# Manuel güncelleme
kubectl patch configmap ea-plan-v6-4 -n ea-web \
  --type merge -p '{"data":{"Phase":"production"}}'
```

## 📊 Production Checklist

- [ ] Pre-prod health check başarılı
- [ ] CDN cache temizlendi (veya atlandı)
- [ ] Production Ingress oluşturuldu
- [ ] ConfigMap güncellendi (Phase: production)
- [ ] GitHub sync tamamlandı (veya atlandı)
- [ ] Production endpoint erişilebilir
- [ ] SSL sertifikası aktif (cert-manager)
- [ ] Monitoring dashboard erişilebilir
- [ ] DNS propagation tamamlandı

## 🔗 İlgili Dosyalar

- `ops/production-go-live.sh` - Detaylı script
- `ops/production-go-live-one-liner.sh` - Tek komut versiyonu
- `ops/production-go-live.ps1` - PowerShell versiyonu
- `ops/production-go-live-commands.txt` - Copy-paste komutlar
- `docs/EA_PLAN_V6_AUDIT_GUIDE.md` - Genel audit kılavuzu

## 📞 Destek

Sorun yaşarsanız:
1. Script log'larını kontrol edin
2. Kubernetes event'lerini inceleyin: `kubectl get events -n ea-web`
3. Pod log'larını kontrol edin: `kubectl logs -n ea-web <pod-name>`

