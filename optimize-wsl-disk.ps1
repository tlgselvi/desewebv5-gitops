# WSL2 Disk Optimize Script
# Bu script'i YÖNETİCİ OLARAK çalıştırın: "Run as Administrator"

Write-Host "WSL kapatılıyor..." -ForegroundColor Yellow
wsl --shutdown
Start-Sleep -Seconds 3

$vhdxPath = "C:\Docker\WSLData\disk\docker_data.vhdx"

if (-not (Test-Path $vhdxPath)) {
    Write-Host "Disk dosyası bulunamadı: $vhdxPath" -ForegroundColor Red
    exit 1
}

$beforeSize = (Get-Item $vhdxPath).Length / 1GB
Write-Host "Önceki boyut: $([math]::Round($beforeSize, 2)) GB" -ForegroundColor Cyan

Write-Host "`nDisk compact ediliyor (bu işlem birkaç dakika sürebilir)..." -ForegroundColor Yellow

$diskpartScript = @"
select vdisk file="$vhdxPath"
compact vdisk
"@

$diskpartScript | diskpart

Start-Sleep -Seconds 2

$afterSize = (Get-Item $vhdxPath).Length / 1GB
$saved = $beforeSize - $afterSize

Write-Host "`nOptimizasyon tamamlandı!" -ForegroundColor Green
Write-Host "Yeni boyut: $([math]::Round($afterSize, 2)) GB" -ForegroundColor Cyan
Write-Host "Kazanılan alan: $([math]::Round($saved, 2)) GB" -ForegroundColor Green

Write-Host "`nDocker Desktop'ı yeniden başlatabilirsiniz." -ForegroundColor Yellow





