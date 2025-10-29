# ===============================================
# EA PLAN v6.5.1 PRODUCTION GO-LIVE (TEK KOMUT)
# PowerShell Version
# ===============================================
# Kullanım: .\ops\production-go-live-one-liner.ps1

Write-Host "🚀 EA PLAN v6.5.1 Production Go-Live başlatılıyor..." -ForegroundColor Cyan; $NAMESPACE = "ea-web"; $PROD_URL = "https://www.cptsystems.com"; $TIMESTAMP = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"); Write-Host "🔍 Health Check..." -ForegroundColor Yellow; kubectl get pods -n $NAMESPACE 2>&1 | Select-Object -First 10; Write-Host "`n🔹 CDN cache temizleniyor..." -ForegroundColor Yellow; if ($env:CF_API_TOKEN) { $headers = @{ "Authorization" = "Bearer $env:CF_API_TOKEN"; "Content-Type" = "application/json" }; try { Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/cptsystems.com/purge_cache" -Method Post -Headers $headers -Body '{"purge_everything":true}' | Out-Null; Write-Host "✅ CDN cache temizlendi" -ForegroundColor Green } catch { Write-Host "⚠️ CDN hata: $_" -ForegroundColor Yellow } } else { Write-Host "⚠️ CDN token yok, atlanıyor" -ForegroundColor Yellow }; Write-Host "`n🔹 Production Ingress oluşturuluyor..." -ForegroundColor Yellow; $ingressYaml = @"
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ea-web-prod
  namespace: $NAMESPACE
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  rules:
  - host: www.cptsystems.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ea-web
            port:
              number: 80
  tls:
  - hosts:
    - www.cptsystems.com
    secretName: tls-cpt-prod
"@; $ingressYaml | kubectl apply -f - 2>&1 | Out-Null; Write-Host "✅ Ingress oluşturuldu" -ForegroundColor Green; Write-Host "`n🔹 ConfigMap güncelleniyor..." -ForegroundColor Yellow; $patchData = '{"data":{"Phase":"production","Version":"v6.5.1","GoLive":"true","Environment":"production","LastUpdated":"' + $TIMESTAMP + '"}}'; kubectl patch configmap ea-plan-v6-4 -n $NAMESPACE --type merge -p $patchData 2>&1 | Out-Null; Write-Host "✅ ConfigMap güncellendi" -ForegroundColor Green; Write-Host "`n🔹 GitHub senkronizasyonu..." -ForegroundColor Yellow; if (Get-Command gh -ErrorAction SilentlyContinue) { gh workflow run docura-publish.yml 2>&1 | Out-Null } else { Write-Host "⚠️ Docura opsiyonel (gh CLI yok)" -ForegroundColor Yellow }; if (Test-Path "$HOME\ea-plan\.git") { Push-Location "$HOME\ea-plan"; git add . 2>&1 | Out-Null; git commit -m "EA Plan v6.5.1 Production Go-Live $TIMESTAMP" 2>&1 | Out-Null; git push origin main 2>&1 | Out-Null; Pop-Location } else { Write-Host "⚠️ Git opsiyonel (repo yok)" -ForegroundColor Yellow }; Write-Host "`n🌐 Production endpoint kontrolü: $PROD_URL" -ForegroundColor Cyan; Start-Sleep -Seconds 5; try { Invoke-WebRequest -Uri $PROD_URL -Method Head -TimeoutSec 10 -ErrorAction SilentlyContinue | Select-Object -First 1; Write-Host "✅ Endpoint erişilebilir" -ForegroundColor Green } catch { Write-Host "⚠️ Endpoint henüz aktifleşmedi" -ForegroundColor Yellow }; kubectl get ingress -n $NAMESPACE | Select-String "ea-web-prod"; Write-Host "`n✅ EA PLAN v6.5.1 PRODUCTION GO-LIVE TAMAMLANDI • ZAMAN: $TIMESTAMP" -ForegroundColor Green

