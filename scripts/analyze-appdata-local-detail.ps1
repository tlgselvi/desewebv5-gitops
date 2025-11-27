# AppData\Local Detaylı Analiz
# En çok yer kaplayan klasörleri bulur

Write-Host "🔍 AppData\Local Detaylı Analiz (30 GB)" -ForegroundColor Cyan
Write-Host ""

$localAppData = $env:LOCALAPPDATA
Write-Host "📁 Konum: $localAppData" -ForegroundColor Cyan
Write-Host ""

# Tüm klasörleri analiz et
Write-Host "📊 En çok yer kaplayan klasörler analiz ediliyor..." -ForegroundColor Yellow
Write-Host ""

$folders = Get-ChildItem -Path $localAppData -Directory -ErrorAction SilentlyContinue | 
    ForEach-Object {
        try {
            $size = (Get-ChildItem -Path $_.FullName -Recurse -ErrorAction SilentlyContinue | 
                    Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
            [PSCustomObject]@{
                Name = $_.Name
                Size = $size
                SizeMB = [math]::Round($size / 1MB, 2)
                SizeGB = [math]::Round($size / 1GB, 2)
            }
        } catch {
            [PSCustomObject]@{
                Name = $_.Name
                Size = 0
                SizeMB = 0
                SizeGB = 0
            }
        }
    } | Sort-Object -Property Size -Descending | Select-Object -First 20

Write-Host "Top 20 Klasör (En çok yer kaplayan):" -ForegroundColor Yellow
Write-Host ""

$totalAnalyzed = 0
foreach ($folder in $folders) {
    $totalAnalyzed += $folder.Size
    $color = if ($folder.SizeGB -gt 1) { "Red" } elseif ($folder.SizeGB -gt 0.5) { "Yellow" } else { "Green" }
    
    Write-Host "  $($folder.Name)" -ForegroundColor $color -NoNewline
    Write-Host " - " -NoNewline
    Write-Host "$($folder.SizeGB) GB ($($folder.SizeMB) MB)" -ForegroundColor Cyan
    
    # Projeyle ilgili olanları işaretle
    $related = @()
    if ($folder.Name -like "*npm*" -or $folder.Name -like "*node*" -or $folder.Name -like "*pnpm*") {
        $related += "Node.js/pnpm"
    }
    if ($folder.Name -like "*pip*" -or $folder.Name -like "*python*") {
        $related += "Python"
    }
    if ($folder.Name -like "*docker*" -or $folder.Name -like "*wsl*") {
        $related += "Docker/WSL"
    }
    if ($folder.Name -like "*google*" -or $folder.Name -like "*chrome*") {
        $related += "Browser"
    }
    if ($folder.Name -like "*microsoft*" -or $folder.Name -like "*windows*") {
        $related += "Windows"
    }
    
    if ($related.Count -gt 0) {
        Write-Host "    → " -NoNewline -ForegroundColor Gray
        Write-Host ($related -join ", ") -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "📊 Analiz edilen toplam: $([math]::Round($totalAnalyzed / 1GB, 2)) GB" -ForegroundColor Yellow
Write-Host ""

# Projeyle ilgili özet
Write-Host "💡 Projeyle İlgili Klasörler:" -ForegroundColor Cyan
$projectRelated = $folders | Where-Object { 
    $_.Name -like "*npm*" -or $_.Name -like "*node*" -or $_.Name -like "*pnpm*" -or 
    $_.Name -like "*pip*" -or $_.Name -like "*python*" 
}
$projectTotal = ($projectRelated | Measure-Object -Property Size -Sum).Sum
Write-Host "  Toplam: $([math]::Round($projectTotal / 1GB, 2)) GB" -ForegroundColor Yellow
foreach ($folder in $projectRelated) {
    Write-Host "    - $($folder.Name): $($folder.SizeGB) GB" -ForegroundColor Gray
}

