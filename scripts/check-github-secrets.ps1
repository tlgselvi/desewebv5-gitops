# GitHub Actions Secrets Kontrol Script
# GitHub CLI kullanarak secrets varlığını kontrol eder

param(
    [string]$RepoOwner = $env:GITHUB_REPOSITORY_OWNER,
    [string]$RepoName = (Split-Path -Leaf $PWD),
    [string]$Environment = "production"
)

Write-Host "`n=== GitHub Actions Secrets Kontrolü ===" -ForegroundColor Cyan
Write-Host "Repository: $RepoOwner/$RepoName" -ForegroundColor Yellow
Write-Host "Environment: $Environment`n" -ForegroundColor Yellow

# GitHub CLI kontrolü
$ghExists = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghExists) {
    Write-Host "❌ GitHub CLI (gh) bulunamadı!" -ForegroundColor Red
    Write-Host "   Lütfen GitHub CLI'yi yükleyin: https://cli.github.com/" -ForegroundColor Yellow
    Write-Host "`nManuel kontrol için:" -ForegroundColor Yellow
    Write-Host "   1. GitHub Repository > Settings > Secrets and variables > Actions" -ForegroundColor White
    Write-Host "   2. Aşağıdaki secrets'ların tanımlı olduğundan emin olun:`n" -ForegroundColor White
    exit 1
}

Write-Host "GitHub CLI mevcut, secrets kontrol ediliyor...`n" -ForegroundColor Green

$allSecrets = @()
$missingSecrets = @()
$presentSecrets = @()

# Kubeconfig secrets (her zaman gerekli)
$kubeconfigSecrets = @("KUBECONFIG_PRODUCTION", "KUBECONFIG_STAGING")

# Production secrets
$productionSecrets = @(
    "JWT_SECRET",
    "COOKIE_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_CALLBACK_URL",
    "DATABASE_URL",
    "REDIS_URL",
    "PROMETHEUS_URL"
)

# Prometheus için alternatif
$prometheusAlternative = "MCP_PROMETHEUS_BASE_URL"

# Tüm secrets listesi
$allSecrets += $kubeconfigSecrets

if ($Environment -eq "production") {
    $allSecrets += $productionSecrets
    $allSecrets += $prometheusAlternative
}

Write-Host "Kontrol edilen secrets:" -ForegroundColor Cyan
foreach ($secret in $allSecrets) {
    Write-Host -NoNewline "  - ${secret}: "
    
    try {
        # GitHub CLI ile secret kontrolü
        $result = gh secret list --repo "$RepoOwner/$RepoName" 2>$null | Select-String -Pattern "^$secret\s"
        
        if ($result) {
            Write-Host "✅ MEVCUT" -ForegroundColor Green
            $presentSecrets += $secret
        } else {
            Write-Host "❌ EKSIK" -ForegroundColor Red
            $missingSecrets += $secret
        }
    } catch {
        Write-Host "⚠️ KONTROL EDILEMEDI" -ForegroundColor Yellow
        Write-Host "     Hata: $_" -ForegroundColor Gray
    }
}

# Özel kontroller
if ($Environment -eq "production") {
    Write-Host "`nPrometheus URL kontrolü:" -ForegroundColor Cyan
    
    $prometheusUrlExists = $presentSecrets -contains "PROMETHEUS_URL"
    $mcpPrometheusExists = $presentSecrets -contains "MCP_PROMETHEUS_BASE_URL"
    
    if ($prometheusUrlExists -or $mcpPrometheusExists) {
        Write-Host "  ✅ PROMETHEUS_URL veya MCP_PROMETHEUS_BASE_URL mevcut" -ForegroundColor Green
        
        # Eğer PROMETHEUS_URL eksik ama MCP_PROMETHEUS_BASE_URL varsa, PROMETHEUS_URL'i eksik listeden çıkar
        if (-not $prometheusUrlExists -and $mcpPrometheusExists) {
            $missingSecrets = $missingSecrets | Where-Object { $_ -ne "PROMETHEUS_URL" }
        }
    } else {
        Write-Host "  ❌ PROMETHEUS_URL veya MCP_PROMETHEUS_BASE_URL eksik (en az biri gerekli)" -ForegroundColor Red
    }
}

# Özet
Write-Host "`n=== Özet ===" -ForegroundColor Cyan
Write-Host "Mevcut secrets: $($presentSecrets.Count)" -ForegroundColor Green
Write-Host "Eksik secrets: $($missingSecrets.Count)" -ForegroundColor $(if($missingSecrets.Count -eq 0){"Green"}else{"Red"})

if ($missingSecrets.Count -gt 0) {
    Write-Host "`n❌ Eksik secrets:" -ForegroundColor Red
    foreach ($secret in $missingSecrets) {
        Write-Host "  - $secret" -ForegroundColor Red
    }
    
    Write-Host "`nSecrets eklemek için:" -ForegroundColor Yellow
    Write-Host "  1. GitHub Repository > Settings > Secrets and variables > Actions" -ForegroundColor White
    Write-Host "  2. 'New repository secret' butonuna tıklayın" -ForegroundColor White
    Write-Host "  3. Secret adını ve değerini girin" -ForegroundColor White
    Write-Host "  4. 'Add secret' butonuna tıklayın`n" -ForegroundColor White
    
    Write-Host "Detaylı bilgi için: docs/GITHUB_ACTIONS_SECRETS.md" -ForegroundColor Cyan
    
    exit 1
} else {
    Write-Host "`n✅ Tüm gerekli secrets tanımlı!" -ForegroundColor Green
    exit 0
}

