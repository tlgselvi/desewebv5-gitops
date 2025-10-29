# ===============================================
# FinBot Quick Inspect + Port-Forward
# PowerShell Version
# ===============================================
# FinBot pod, service, logs ve port-forward yönetimi

$ErrorActionPreference = "Continue"

Write-Host "`n=== FinBot QUICK INSPECT START ===`n" -ForegroundColor Cyan

# 1) Bul FinBot ile ilgili objeleri
Write-Host "🔍 Searching for FinBot resources...`n" -ForegroundColor Yellow

$finbotResources = kubectl get pods,deploy,svc,ing -A 2>&1 | Select-String -Pattern "finbot" -CaseSensitive:$false

if ($finbotResources) {
    Write-Host "✅ FinBot resources found:" -ForegroundColor Green
    $finbotResources | Select-Object -First 20
} else {
    Write-Host "⚠️  FinBot kaynak bulunamadı (isim/label 'finbot' yok)" -ForegroundColor Yellow
}
Write-Host ""

# 2) Namespace ve pod isim yakala
$fbPodLine = kubectl get pods -A --no-headers 2>&1 | Select-String -Pattern "finbot" -CaseSensitive:$false | Select-Object -First 1

if ($fbPodLine) {
    $parts = ($fbPodLine.ToString() -split '\s+')
    $FB_NS = $parts[0]
    $FB_POD = $parts[1]
    Write-Host "📦 Found pod: $FB_POD" -ForegroundColor Green
    Write-Host "📍 Namespace: $FB_NS`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  FinBot pod bulunamadı`n" -ForegroundColor Yellow
    $FB_POD = $null
    $FB_NS = $null
}

# 3) Pod/Deployment detayları
if ($FB_POD -and $FB_NS) {
    Write-Host "📋 Pod Details...`n" -ForegroundColor Yellow
    Write-Host "---" -ForegroundColor Gray
    kubectl describe pod "$FB_POD" -n "$FB_NS" 2>&1 | Select-Object -First 200
    Write-Host "`n📜 Logs (last 300 lines)...`n" -ForegroundColor Yellow
    Write-Host "---" -ForegroundColor Gray
    kubectl logs "$FB_POD" -n "$FB_NS" --tail=300 2>&1 | Select-Object -First 200
    Write-Host "`n💡 Follow logs: kubectl logs -f $FB_POD -n $FB_NS`n" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  No FinBot pod to describe/log. Check deployments/services manually.`n" -ForegroundColor Yellow
    Write-Host "   Try: kubectl get deploy -A | findstr finbot`n" -ForegroundColor Gray
}

# 4) Service -> port-forward
if ($FB_NS) {
    $fbSvcLine = kubectl get svc -n "$FB_NS" --no-headers 2>&1 | Select-String -Pattern "finbot" -CaseSensitive:$false | Select-Object -First 1
    
    if ($fbSvcLine) {
        $FB_SVC = ($fbSvcLine.ToString() -split '\s+')[0]
        Write-Host "🔌 Service found: $FB_SVC in $FB_NS" -ForegroundColor Green
        
        # Check if port-forward already running
        $pfProcess = Get-Process -Name "kubectl" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*port-forward*$FB_SVC*" }
        
        if ($pfProcess) {
            Write-Host "⚠️  Port-forward already running (PID: $($pfProcess.Id))" -ForegroundColor Yellow
            Write-Host "   To stop: Stop-Process -Id $($pfProcess.Id)`n" -ForegroundColor Gray
        } else {
            Write-Host "🚀 Starting port-forward to localhost:8080 -> service port 80 (background)...`n" -ForegroundColor Yellow
            
            $portForwardJob = Start-Job -ScriptBlock {
                param($svc, $ns)
                kubectl port-forward svc/$svc -n $ns 8080:80 2>&1 | Out-File -FilePath "$env:TEMP\finbot-portforward.log" -Append
            } -ArgumentList $FB_SVC, $FB_NS
            
            Start-Sleep -Seconds 2
            
            # Check if it's running
            $pfCheck = Get-Process -Name "kubectl" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*port-forward*$FB_SVC*" }
            
            if ($pfCheck) {
                Write-Host "✅ Port-forward started" -ForegroundColor Green
                Write-Host "🌐 FinBot UI/API available at: http://localhost:8080" -ForegroundColor Cyan
                Write-Host "   Try: http://localhost:8080/health or http://localhost:8080/api/predict" -ForegroundColor Gray
                Write-Host "📋 Port-forward logs: Get-Content `"$env:TEMP\finbot-portforward.log`" -Tail 50`n" -ForegroundColor Gray
            } else {
                Write-Host "❌ Port-forward failed. Check job status: Get-Job" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "⚠️  No service named *finbot* found in $FB_NS" -ForegroundColor Yellow
        Write-Host "   List services: kubectl get svc -n $FB_NS`n" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  No namespace found, skipping service port-forward`n" -ForegroundColor Yellow
}

# 5) Prometheus port-forward
Write-Host "📊 Prometheus port-forward setup...`n" -ForegroundColor Yellow
$MONITORING_NS = "monitoring"

$promSvcLine = kubectl get svc -n "$MONITORING_NS" --no-headers 2>&1 | Select-String -Pattern "prometheus" -CaseSensitive:$false | Select-Object -First 1

if ($promSvcLine) {
    $PROM_SVC = ($promSvcLine.ToString() -split '\s+')[0]
    
    # Check if port-forward already running
    $promPfProcess = Get-Process -Name "kubectl" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*port-forward*prometheus*9090*" }
    
    if ($promPfProcess) {
        Write-Host "⚠️  Prometheus port-forward already running (PID: $($promPfProcess.Id))" -ForegroundColor Yellow
        Write-Host "   To stop: Stop-Process -Id $($promPfProcess.Id)`n" -ForegroundColor Gray
    } else {
        Write-Host "🚀 Starting Prometheus port-forward (9090)...`n" -ForegroundColor Yellow
        
        $promPortForwardJob = Start-Job -ScriptBlock {
            param($svc, $ns)
            kubectl port-forward svc/$svc -n $ns 9090:9090 2>&1 | Out-File -FilePath "$env:TEMP\prom-pf.log" -Append
        } -ArgumentList $PROM_SVC, $MONITORING_NS
        
        Start-Sleep -Seconds 2
        
        $promPfCheck = Get-Process -Name "kubectl" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*port-forward*prometheus*9090*" }
        
        if ($promPfCheck) {
            Write-Host "✅ Prometheus port-forward started" -ForegroundColor Green
            Write-Host "🌐 Prometheus UI: http://localhost:9090" -ForegroundColor Cyan
            Write-Host "📊 Useful queries:" -ForegroundColor Yellow
            Write-Host '   up{job=~".*finbot.*"}' -ForegroundColor Gray
            Write-Host "   finbot_failure_probability" -ForegroundColor Gray
            Write-Host "   finbot_predictive_score" -ForegroundColor Gray
            Write-Host "   (try autocomplete in Prometheus UI)`n" -ForegroundColor Gray
        } else {
            Write-Host "❌ Prometheus port-forward failed. Check: Get-Job`n" -ForegroundColor Red
        }
    }
} else {
    Write-Host "⚠️  Prometheus service not found in $MONITORING_NS`n" -ForegroundColor Yellow
}

# 6) Grafana dashboard hint
Write-Host "📈 Grafana Dashboard...`n" -ForegroundColor Yellow
$grafanaSvcLine = kubectl get svc -n "$MONITORING_NS" --no-headers 2>&1 | Select-String -Pattern "grafana" -CaseSensitive:$false | Select-Object -First 1

if ($grafanaSvcLine) {
    $GRAFANA_SVC = ($grafanaSvcLine.ToString() -split '\s+')[0]
    
    $grafanaPfProcess = Get-Process -Name "kubectl" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*port-forward*grafana*3000*" }
    
    if ($grafanaPfProcess) {
        Write-Host "⚠️  Grafana port-forward already running (PID: $($grafanaPfProcess.Id))" -ForegroundColor Yellow
    } else {
        Write-Host "💡 To start Grafana port-forward:" -ForegroundColor Cyan
        Write-Host "   kubectl port-forward svc/$GRAFANA_SVC -n $MONITORING_NS 3000:3000`n" -ForegroundColor White
        Write-Host "   Then access: http://localhost:3000" -ForegroundColor Gray
        Write-Host "   Search dashboard: 'EA Plan - FinBot' or 'Predictive Maintenance'`n" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Grafana service not found`n" -ForegroundColor Yellow
}

# Summary
Write-Host "=== FinBot QUICK INSPECT COMPLETE ===`n" -ForegroundColor Cyan
Write-Host "📋 Summary:" -ForegroundColor Yellow
if ($FB_POD) { Write-Host "  ✅ FinBot Pod: $FB_POD ($FB_NS)" -ForegroundColor Green }
if ($FB_SVC) { Write-Host "  ✅ FinBot Service: $FB_SVC" -ForegroundColor Green }
Write-Host "  ✅ Port-forwards:" -ForegroundColor Green
Write-Host "     - FinBot: http://localhost:8080" -ForegroundColor White
Write-Host "     - Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Useful Commands:" -ForegroundColor Yellow
if ($FB_POD -and $FB_NS) {
    Write-Host "  - View FinBot logs: kubectl logs -f $FB_POD -n $FB_NS" -ForegroundColor White
}
Write-Host "  - Stop port-forwards: Get-Process kubectl | Where-Object {`$_.CommandLine -like '*port-forward*' } | Stop-Process" -ForegroundColor White
Write-Host "  - Check port-forward logs: Get-Content `"$env:TEMP\finbot-portforward.log`" -Tail 50" -ForegroundColor White
Write-Host ""

