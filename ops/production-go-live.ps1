# ===============================================
# EA PLAN v6.5.1 PRODUCTION ACTIVATION SCRIPT
# PowerShell Version
# ===============================================

$ErrorActionPreference = "Continue"

Write-Host "`n🚀 EA PLAN PRODUCTION GO-LIVE başlatılıyor...`n" -ForegroundColor Cyan

# 1️⃣ Ortam değişkenleri
$NAMESPACE_WEB = "ea-web"
$GITHUB_REPO = "github.com/CPTSystems/ea-plan"
$CDN_ZONE = "cptsystems.com"
$PROD_URL = "https://www.cptsystems.com"
$PREPROD_URL = "https://staging.cptsystems.io"
$DNS_PROVIDER = "cloudflare"
$TIMESTAMP = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")

$CF_API_TOKEN = $env:CF_API_TOKEN

Write-Host "📅 Timestamp: $TIMESTAMP`n" -ForegroundColor Yellow

# 2️⃣ Pre-Prod health check
Write-Host "🔍 Pre-Production Health Check...`n" -ForegroundColor Cyan
Write-Host "---" -ForegroundColor Gray

$pods = kubectl get pods -n $NAMESPACE_WEB --no-headers 2>&1
$healthyPods = ($pods | Select-String -Pattern "Running|Completed").Count
$totalPods = ($pods | Where-Object { $_ -notmatch "No resources" }).Count

if ($totalPods -gt 0) {
    if ($healthyPods -eq $totalPods) {
        Write-Host "✅ Tüm pod'lar sağlıklı ($healthyPods/$totalPods)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Bazı pod'lar hazır değil ($healthyPods/$totalPods)" -ForegroundColor Yellow
        $pods | Where-Object { $_ -notmatch "Running|Completed" }
    }
} else {
    Write-Host "❌ Namespace bulunamadı veya pod yok" -ForegroundColor Red
}

Write-Host "`nPre-Prod endpoint kontrolü..." -ForegroundColor Yellow
try {
    $preprodResponse = Invoke-WebRequest -Uri $PREPROD_URL -Method Head -TimeoutSec 10 -ErrorAction SilentlyContinue
    $preprodStatus = $preprodResponse.StatusCode
    Write-Host "✅ Pre-Prod endpoint erişilebilir (HTTP $preprodStatus)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Pre-Prod endpoint erişilemedi" -ForegroundColor Yellow
}
Write-Host ""

# 3️⃣ CDN ve DNS yönlendirmesi
if ($CF_API_TOKEN) {
    Write-Host "🔹 CDN önbelleği temizleniyor..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $CF_API_TOKEN"
        "Content-Type" = "application/json"
    }
    
    $body = '{"purge_everything":true}'
    
    try {
        $cdnResponse = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/${CDN_ZONE}/purge_cache" `
            -Method Post -Headers $headers -Body $body -ErrorAction Stop
        
        if ($cdnResponse.success) {
            Write-Host "✅ CDN cache temizlendi" -ForegroundColor Green
        } else {
            Write-Host "⚠️  CDN cache temizliği başarısız" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  CDN cache temizliği hatası: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  CF_API_TOKEN ayarlanmamış, CDN temizliği atlanıyor" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "🔹 Production Ingress yapılandırması..." -ForegroundColor Yellow

$ingressYaml = @"
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ea-web-prod
  namespace: $NAMESPACE_WEB
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
"@

$ingressYaml | kubectl apply -f - 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Production Ingress oluşturuldu/güncellendi" -ForegroundColor Green
} else {
    Write-Host "❌ Ingress oluşturma hatası" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4️⃣ Production ConfigMap güncellemesi
Write-Host "🔹 Production ConfigMap güncelleniyor..." -ForegroundColor Yellow

$patchData = @"
{
  "data": {
    "Phase": "production",
    "Version": "v6.5.1",
    "GoLive": "true",
    "Environment": "production",
    "LastUpdated": "$TIMESTAMP"
  }
}
"@

kubectl patch configmap ea-plan-v6-4 -n $NAMESPACE_WEB --type merge -p $patchData 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ConfigMap güncellendi (Phase: production)" -ForegroundColor Green
} else {
    Write-Host "⚠️  ConfigMap güncelleme hatası" -ForegroundColor Yellow
}
Write-Host ""

# 5️⃣ Docura & GitHub senkronizasyonu
if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Host "🔹 Docura production build tetikleniyor..." -ForegroundColor Yellow
    gh workflow run docura-publish.yml 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docura pipeline tetiklendi" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Docura pipeline tetiklenemedi (opsiyonel)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  GitHub CLI (gh) bulunamadı, Docura pipeline atlanıyor" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "🔹 Git commit ve push..." -ForegroundColor Yellow
if (Test-Path "$HOME\ea-plan\.git") {
    Push-Location "$HOME\ea-plan"
    try {
        git add . 2>&1 | Out-Null
        git commit -m "EA Plan Production Go-Live $TIMESTAMP" 2>&1 | Out-Null
        git push origin main 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Git işlemleri tamamlandı" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Git push başarısız veya değişiklik yok" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Git işlemleri hatası: $_" -ForegroundColor Yellow
    }
    Pop-Location
} else {
    Write-Host "⚠️  ~/ea-plan repository bulunamadı" -ForegroundColor Yellow
}
Write-Host ""

# 6️⃣ Health doğrulama
Write-Host "🔹 Production doğrulaması...`n" -ForegroundColor Cyan
Write-Host "---" -ForegroundColor Gray

$ingressStatus = kubectl get ingress ea-web-prod -n $NAMESPACE_WEB 2>&1
if ($ingressStatus -match "ea-web-prod") {
    Write-Host "✅ Production Ingress mevcut" -ForegroundColor Green
    Write-Host $ingressStatus
} else {
    Write-Host "❌ Production Ingress bulunamadı" -ForegroundColor Red
}
Write-Host ""

Write-Host "Production endpoint kontrolü..." -ForegroundColor Yellow
Start-Sleep -Seconds 5  # DNS propagation için bekleme
try {
    $prodResponse = Invoke-WebRequest -Uri $PROD_URL -Method Head -TimeoutSec 10 -ErrorAction SilentlyContinue
    $prodStatus = $prodResponse.StatusCode
    Write-Host "✅ Production endpoint aktif (HTTP $prodStatus)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Production endpoint henüz aktifleşmedi" -ForegroundColor Yellow
    Write-Host "   DNS propagation için birkaç dakika bekleyin" -ForegroundColor Gray
}
Write-Host ""

# Final Summary
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "✅ EA PLAN v6.5.1 PRODUCTION GO-LIVE tamamlandı" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Production URL: $PROD_URL" -ForegroundColor Yellow
Write-Host "📅 Zaman Damgası: $TIMESTAMP" -ForegroundColor Yellow
Write-Host "📊 Phase: production" -ForegroundColor Yellow
Write-Host "🏷️  Version: v6.5.1" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Sonraki Adımlar:" -ForegroundColor Cyan
Write-Host "  1. DNS propagation kontrolü (5-15 dakika)" -ForegroundColor White
Write-Host "  2. SSL sertifika kontrolü (cert-manager)" -ForegroundColor White
Write-Host "  3. Monitoring dashboard kontrolü" -ForegroundColor White
Write-Host "  4. Production load test" -ForegroundColor White
Write-Host ""

