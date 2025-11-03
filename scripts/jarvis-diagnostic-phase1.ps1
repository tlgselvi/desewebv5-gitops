# DESE JARVIS Diagnostic Chain - Phase 1
# PowerShell versiyonu

Write-Host "`n══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   DESE JARVIS DIAGNOSTIC CHAIN - PHASE 1" -ForegroundColor Yellow -BackgroundColor Black
Write-Host "══════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Rapor dosyası oluştur
$DATE = Get-Date -Format "yyyyMMdd_HHmmss"
$REPORT_DIR = "reports/diagnostic"
$REPORT_FILE = "$REPORT_DIR/phase1_report_$DATE.txt"

New-Item -ItemType Directory -Force -Path $REPORT_DIR | Out-Null

"# DESE JARVIS Diagnostic Chain - Phase 1 Report" | Out-File $REPORT_FILE -Encoding UTF8
"Generated: $(Get-Date)" | Out-File -Append $REPORT_FILE
"" | Out-File -Append $REPORT_FILE

$RESULTS = @()

# [1/5] MCP Discovery
Write-Host "[1/5] MCP Discovery...`n" -ForegroundColor Yellow

$FINBOT_STATUS = "❌"
$MUBOT_STATUS = "❌"
$DESE_STATUS = "❌"

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5555/finbot/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    $FINBOT_STATUS = "✅"
    "  FinBot (5555): $FINBOT_STATUS" | Write-Host -ForegroundColor Green | Tee-Object -Append $REPORT_FILE
} catch {
    "  FinBot (5555): $FINBOT_STATUS" | Write-Host -ForegroundColor Red | Tee-Object -Append $REPORT_FILE
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5556/mubot/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    $MUBOT_STATUS = "✅"
    "  MuBot (5556): $MUBOT_STATUS" | Write-Host -ForegroundColor Green | Tee-Object -Append $REPORT_FILE
} catch {
    "  MuBot (5556): $MUBOT_STATUS" | Write-Host -ForegroundColor Red | Tee-Object -Append $REPORT_FILE
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5557/dese/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    $DESE_STATUS = "✅"
    "  DESE (5557): $DESE_STATUS" | Write-Host -ForegroundColor Green | Tee-Object -Append $REPORT_FILE
} catch {
    "  DESE (5557): $DESE_STATUS" | Write-Host -ForegroundColor Red | Tee-Object -Append $REPORT_FILE
}

"" | Out-File -Append $REPORT_FILE

# [2/5] Module Health Check
Write-Host "`n[2/5] Module Health Check...`n" -ForegroundColor Yellow

function Check-Health {
    param ($module, $port)
    
    Write-Host "  Testing $module..." -NoNewline
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port/$module/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        Write-Host " ✅ (HTTP $($response.StatusCode))" -ForegroundColor Green
        "    Response: $($response.Content)" | Out-File -Append $REPORT_FILE
        return $true
    } catch {
        Write-Host " ❌ (offline)" -ForegroundColor Red
        "    $module unreachable" | Out-File -Append $REPORT_FILE
        return $false
    }
}

Check-Health "finbot" "5555" | Out-Null
Check-Health "mubot" "5556" | Out-Null
Check-Health "dese" "5557" | Out-Null

"" | Out-File -Append $REPORT_FILE

# [3/5] Network & API Latency
Write-Host "`n[3/5] Network & API Latency...`n" -ForegroundColor Yellow

function Measure-Latency {
    param ($module, $port)
    
    Write-Host "  $module" -NoNewline
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri "http://localhost:$port/$module/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        $stopwatch.Stop()
        $latency = $stopwatch.ElapsedMilliseconds
        
        Write-Host ": ${latency}ms ✅" -ForegroundColor Green
        "    HTTP $($response.StatusCode), Latency: ${latency}ms" | Out-File -Append $REPORT_FILE
    } catch {
        Write-Host ": timeout ⚠️" -ForegroundColor Yellow
    }
}

Measure-Latency "finbot" "5555" | Out-Null
Measure-Latency "mubot" "5556" | Out-Null
Measure-Latency "dese" "5557" | Out-Null

"" | Out-File -Append $REPORT_FILE

# [4/5] Config Integrity
Write-Host "`n[4/5] Config Integrity...`n" -ForegroundColor Yellow

if (Test-Path ".cursor/upgrade-protocol-v1.2.yaml") {
    Write-Host "  upgrade-protocol-v1.2.yaml found ✅" -ForegroundColor Green | Tee-Object -Append $REPORT_FILE
    
    $content = Get-Content ".cursor/upgrade-protocol-v1.2.yaml" -ErrorAction SilentlyContinue
    if ($content -match "version:") {
        Write-Host "  version key found ✅" -ForegroundColor Green | Tee-Object -Append $REPORT_FILE
    } else {
        Write-Host "  version key missing ⚠️" -ForegroundColor Yellow | Tee-Object -Append $REPORT_FILE
    }
} else {
    Write-Host "  Config file not found ⚠️" -ForegroundColor Yellow | Tee-Object -Append $REPORT_FILE
}

if (Test-Path ".cursor/jarvis-config.json") {
    Write-Host "  jarvis-config.json found ✅" -ForegroundColor Green | Tee-Object -Append $REPORT_FILE
} else {
    Write-Host "  jarvis-config.json not found ⚠️" -ForegroundColor Yellow | Tee-Object -Append $REPORT_FILE
}

"" | Out-File -Append $REPORT_FILE

# [5/5] Summary Export
Write-Host "`n[5/5] Summary Export...`n" -ForegroundColor Yellow

Write-Host "Diagnostic completed. Report saved to: $REPORT_FILE" -ForegroundColor Green
"" | Out-File -Append $REPORT_FILE
"---" | Out-File -Append $REPORT_FILE
"END OF REPORT" | Out-File -Append $REPORT_FILE

# Son özet
Write-Host ""
Write-Host "══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   DIAGNOSTIC COMPLETED" -ForegroundColor Green -BackgroundColor Black
Write-Host "══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Report: $REPORT_FILE" -ForegroundColor Cyan
Write-Host ""

