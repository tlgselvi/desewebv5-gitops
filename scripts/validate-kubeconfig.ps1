# Kubeconfig Validation Script
# Kubeconfig dosyasının geçerli olduğunu kontrol eder

param(
    [Parameter(Mandatory=$true)]
    [string]$Path
)

Write-Host "`n=== Kubeconfig Validation ===" -ForegroundColor Cyan
Write-Host "Path: $Path`n" -ForegroundColor Yellow

# Dosya var mı kontrol et
if (-not (Test-Path $Path)) {
    Write-Host "❌ Dosya bulunamadı: $Path" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dosya bulundu" -ForegroundColor Green

# Dosya içeriğini oku
try {
    $content = Get-Content $Path -Raw -ErrorAction Stop
    Write-Host "✅ Dosya okundu" -ForegroundColor Green
} catch {
    Write-Host "❌ Dosya okunamadı: $_" -ForegroundColor Red
    exit 1
}

# Kubeconfig formatı kontrolü
if ($content -match "apiVersion:\s*v1" -and $content -match "kind:\s*Config") {
    Write-Host "✅ Kubeconfig formatı geçerli" -ForegroundColor Green
} else {
    Write-Host "⚠️ Kubeconfig formatı şüpheli (apiVersion v1 ve kind Config bekleniyor)" -ForegroundColor Yellow
}

# Cluster, context, user kontrolü
$hasCluster = $content -match "clusters:"
$hasContext = $content -match "contexts:"
$hasUser = $content -match "users:"

if ($hasCluster) {
    Write-Host "✅ Cluster tanımları bulundu" -ForegroundColor Green
} else {
    Write-Host "⚠️ Cluster tanımları bulunamadı" -ForegroundColor Yellow
}

if ($hasContext) {
    Write-Host "✅ Context tanımları bulundu" -ForegroundColor Green
} else {
    Write-Host "⚠️ Context tanımları bulunamadı" -ForegroundColor Yellow
}

if ($hasUser) {
    Write-Host "✅ User tanımları bulundu" -ForegroundColor Green
} else {
    Write-Host "⚠️ User tanımları bulunamadı" -ForegroundColor Yellow
}

# Dosya boyutu
$fileSize = (Get-Item $Path).Length
Write-Host "`n📊 Dosya Boyutu: $fileSize bytes ($([math]::Round($fileSize/1KB, 2)) KB)" -ForegroundColor Cyan

# İçerik önizleme (ilk 500 karakter)
Write-Host "`n📄 İçerik Önizleme (ilk 500 karakter):" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host $content.Substring(0, [Math]::Min(500, $content.Length)) -ForegroundColor White
if ($content.Length -gt 500) {
    Write-Host "..." -ForegroundColor Gray
    Write-Host "... (toplam $content.Length karakter)" -ForegroundColor Gray
}
Write-Host "=" * 60 -ForegroundColor Gray

Write-Host "`n📋 GitHub'a eklemek için:" -ForegroundColor Cyan
Write-Host "1. Tüm içeriği kopyalayın (Ctrl+A, Ctrl+C)" -ForegroundColor White
Write-Host "2. GitHub Repository > Settings > Secrets and variables > Actions" -ForegroundColor White
Write-Host "3. 'New repository secret' butonuna tıklayın" -ForegroundColor White
Write-Host "4. Name: KUBECONFIG_PRODUCTION (veya KUBECONFIG_STAGING)" -ForegroundColor White
Write-Host "5. Secret: Kopyaladığınız tüm içeriği yapıştırın`n" -ForegroundColor White

Write-Host "⚠️ Not:" -ForegroundColor Yellow
Write-Host "   Kubeconfig dosyaları uzun olabilir. GitHub UI çok uzun metinleri destekler." -ForegroundColor Yellow
Write-Host "   Tüm içeriği (baştan sona) kopyalayın.`n" -ForegroundColor Yellow

