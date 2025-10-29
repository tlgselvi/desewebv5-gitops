# ===============================================
# FinBot & MuBot Test & Inspection Script
# ===============================================

$ErrorActionPreference = "Continue"

Write-Host "`n🔍 FinBot & MuBot Sistemi Test & Görünüm`n" -ForegroundColor Cyan

# 1. FinBot ve MuBot kaynaklarını bul
Write-Host "=== 1. KAYNAK ARAMA ===`n" -ForegroundColor Yellow

$finbotPod = kubectl get pods -A --no-headers 2>&1 | Select-String -Pattern "finbot" -CaseSensitive:$false | Select-Object -First 1
$mubotPod = kubectl get pods -A --no-headers 2>&1 | Select-String -Pattern "mubot" -CaseSensitive:$false | Select-Object -First 1

$finbotSvc = kubectl get svc -A --no-headers 2>&1 | Select-String -Pattern "finbot" -CaseSensitive:$false | Select-Object -First 1
$mubotSvc = kubectl get svc -A --no-headers 2>&1 | Select-String -Pattern "mubot" -CaseSensitive:$false | Select-Object -First 1

# 2. FinBot Bilgileri
Write-Host "🤖 FINBOT:" -ForegroundColor Green
if ($finbotPod) {
    $parts = ($finbotPod.ToString() -split '\s+')
    $fbNs = $parts[0]
    $fbPod = $parts[1]
    $fbStatus = $parts[2]
    
    Write-Host "  ✅ Pod bulundu: $fbPod" -ForegroundColor Green
    Write-Host "     Namespace: $fbNs" -ForegroundColor Gray
    Write-Host "     Status: $fbStatus`n" -ForegroundColor Gray
    
    # Pod detayları
    Write-Host "  📋 Pod detayları:" -ForegroundColor Cyan
    kubectl describe pod $fbPod -n $fbNs 2>&1 | Select-Object -First 30
    
    Write-Host "`n  📜 Son loglar (50 satır):" -ForegroundColor Cyan
    kubectl logs $fbPod -n $fbNs --tail=50 2>&1 | Select-Object -First 50
    
    # Port-forward talimatı
    if ($finbotSvc) {
        $svcParts = ($finbotSvc.ToString() -split '\s+')
        $fbSvcName = $svcParts[1]
        $fbSvcNs = $svcParts[0]
        $fbSvcPort = if ($svcParts.Count -gt 4) { $svcParts[4].Split('/')[0] } else { "80" }
        
        Write-Host "`n  🔌 Service bulundu: $fbSvcName" -ForegroundColor Green
        Write-Host "     Port-forward için (YENİ TERMİNAL'de çalıştırın):" -ForegroundColor Yellow
        Write-Host "     kubectl port-forward svc/$fbSvcName -n $fbSvcNs 8081:$fbSvcPort" -ForegroundColor White
        Write-Host "     Sonra: http://localhost:8081`n" -ForegroundColor Cyan
    } else {
        Write-Host "`n  ⚠️  Service bulunamadı, pod'a direkt port-forward:" -ForegroundColor Yellow
        Write-Host "     kubectl port-forward $fbPod -n $fbNs 8081:8080" -ForegroundColor White
        Write-Host "     (veya pod'un port'una göre ayarlayın)`n" -ForegroundColor Gray
    }
} else {
    Write-Host "  ❌ FinBot pod bulunamadı`n" -ForegroundColor Red
}

# 3. MuBot Bilgileri
Write-Host "📊 MUBOT:" -ForegroundColor Green
if ($mubotPod) {
    $parts = ($mubotPod.ToString() -split '\s+')
    $mbNs = $parts[0]
    $mbPod = $parts[1]
    $mbStatus = $parts[2]
    
    Write-Host "  ✅ Pod bulundu: $mbPod" -ForegroundColor Green
    Write-Host "     Namespace: $mbNs" -ForegroundColor Gray
    Write-Host "     Status: $mbStatus`n" -ForegroundColor Gray
    
    # Pod detayları
    Write-Host "  📋 Pod detayları:" -ForegroundColor Cyan
    kubectl describe pod $mbPod -n $mbNs 2>&1 | Select-Object -First 30
    
    Write-Host "`n  📜 Son loglar (50 satır):" -ForegroundColor Cyan
    kubectl logs $mbPod -n $mbNs --tail=50 2>&1 | Select-Object -First 50
    
    # Port-forward talimatı
    if ($mubotSvc) {
        $svcParts = ($mubotSvc.ToString() -split '\s+')
        $mbSvcName = $svcParts[1]
        $mbSvcNs = $svcParts[0]
        $mbSvcPort = if ($svcParts.Count -gt 4) { $svcParts[4].Split('/')[0] } else { "80" }
        
        Write-Host "`n  🔌 Service bulundu: $mbSvcName" -ForegroundColor Green
        Write-Host "     Port-forward için (YENİ TERMİNAL'de çalıştırın):" -ForegroundColor Yellow
        Write-Host "     kubectl port-forward svc/$mbSvcName -n $mbSvcNs 8082:$mbSvcPort" -ForegroundColor White
        Write-Host "     Sonra: http://localhost:8082`n" -ForegroundColor Cyan
    } else {
        Write-Host "`n  ⚠️  Service bulunamadı, pod'a direkt port-forward:" -ForegroundColor Yellow
        Write-Host "     kubectl port-forward $mbPod -n $mbNs 8082:8080" -ForegroundColor White
        Write-Host "     (veya pod'un port'una göre ayarlayın)`n" -ForegroundColor Gray
    }
} else {
    Write-Host "  ❌ MuBot pod bulunamadı`n" -ForegroundColor Red
}

# 4. Prometheus Metrics
Write-Host "=== 2. PROMETHEUS METRICS ===" -ForegroundColor Yellow
Write-Host "`nPrometheus'da (http://localhost:9090) deneyin:`n" -ForegroundColor Cyan

Write-Host "🔍 FinBot Metrics:" -ForegroundColor Green
Write-Host "   1. Tüm FinBot job'ları:" -ForegroundColor White
Write-Host "      up{job=~'.*finbot.*'}" -ForegroundColor Gray
Write-Host "   2. FinBot metrikleri:" -ForegroundColor White
Write-Host "      finbot_" -ForegroundColor Gray
Write-Host "      (autocomplete ile başlayın)`n" -ForegroundColor Gray

Write-Host "🔍 MuBot Metrics:" -ForegroundColor Green
Write-Host "   1. Tüm MuBot job'ları:" -ForegroundColor White
Write-Host "      up{job=~'.*mubot.*'}" -ForegroundColor Gray
Write-Host "   2. MuBot metrikleri:" -ForegroundColor White
Write-Host "      mubot_" -ForegroundColor Gray
Write-Host "      (autocomplete ile başlayın)`n" -ForegroundColor Gray

Write-Host "📊 Tüm Metrics:" -ForegroundColor Green
Write-Host "   up" -ForegroundColor White
Write-Host "   (tüm aktif job'ları ve metrics'leri gösterir)`n" -ForegroundColor Gray

# 5. Test Komutları
Write-Host "=== 3. TEST KOMUTLARI ===" -ForegroundColor Yellow
Write-Host "`nPort-forward'lar başladıktan sonra:`n" -ForegroundColor Cyan

if ($finbotPod -or $finbotSvc) {
    Write-Host "🤖 FinBot Test:" -ForegroundColor Green
    Write-Host "   # Health check" -ForegroundColor White
    Write-Host "   curl http://localhost:8081/health" -ForegroundColor Gray
    Write-Host "`n   # API endpoint (eğer varsa)" -ForegroundColor White
    Write-Host "   curl http://localhost:8081/api/predict" -ForegroundColor Gray
    Write-Host "   curl http://localhost:8081/api/forecast" -ForegroundColor Gray
    Write-Host "`n   # Metrics" -ForegroundColor White
    Write-Host "   curl http://localhost:8081/metrics`n" -ForegroundColor Gray
}

if ($mubotPod -or $mubotSvc) {
    Write-Host "📊 MuBot Test:" -ForegroundColor Green
    Write-Host "   # Health check" -ForegroundColor White
    Write-Host "   curl http://localhost:8082/health" -ForegroundColor Gray
    Write-Host "`n   # API endpoint (eğer varsa)" -ForegroundColor White
    Write-Host "   curl http://localhost:8082/api/ingest" -ForegroundColor Gray
    Write-Host "   curl http://localhost:8082/api/data" -ForegroundColor Gray
    Write-Host "`n   # Metrics" -ForegroundColor White
    Write-Host "   curl http://localhost:8082/metrics`n" -ForegroundColor Gray
}

# 6. Özet
Write-Host "=== ÖZET ===" -ForegroundColor Yellow
Write-Host "`n📋 Yapılacaklar:`n" -ForegroundColor Cyan

Write-Host "1. Prometheus'da metrics arama:" -ForegroundColor Yellow
Write-Host "   http://localhost:9090/graph" -ForegroundColor White
Write-Host "   → 'finbot_' veya 'mubot_' yazın ve autocomplete'i kullanın`n" -ForegroundColor Gray

if ($finbotPod -or $finbotSvc) {
    Write-Host "2. FinBot port-forward (YENİ TERMİNAL):" -ForegroundColor Yellow
    if ($finbotSvc) {
        $svcParts = ($finbotSvc.ToString() -split '\s+')
        $fbSvcName = $svcParts[1]
        $fbSvcNs = $svcParts[0]
        Write-Host "   kubectl port-forward svc/$fbSvcName -n $fbSvcNs 8081:80" -ForegroundColor White
    } else {
        $parts = ($finbotPod.ToString() -split '\s+')
        Write-Host "   kubectl port-forward $($parts[1]) -n $($parts[0]) 8081:8080" -ForegroundColor White
    }
    Write-Host "   → http://localhost:8081`n" -ForegroundColor Cyan
}

if ($mubotPod -or $mubotSvc) {
    Write-Host "3. MuBot port-forward (YENİ TERMİNAL):" -ForegroundColor Yellow
    if ($mubotSvc) {
        $svcParts = ($mubotSvc.ToString() -split '\s+')
        $mbSvcName = $svcParts[1]
        $mbSvcNs = $svcParts[0]
        Write-Host "   kubectl port-forward svc/$mbSvcName -n $mbSvcNs 8082:80" -ForegroundColor White
    } else {
        $parts = ($mubotPod.ToString() -split '\s+')
        Write-Host "   kubectl port-forward $($parts[1]) -n $($parts[0]) 8082:8080" -ForegroundColor White
    }
    Write-Host "   → http://localhost:8082`n" -ForegroundColor Cyan
}

Write-Host "✅ Test script tamamlandı!`n" -ForegroundColor Green

