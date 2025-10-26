# DevOps Tools Verification Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verifying DevOps Tools..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$tools = @(
    @{Name="kubectl"; Command="kubectl version --client"},
    @{Name="Helm"; Command="helm version"},
    @{Name="Docker"; Command="docker --version"},
    @{Name="Kustomize"; Command="kustomize version"},
    @{Name="ArgoCD"; Command="argocd version --client"},
    @{Name="Cosign"; Command="cosign version"},
    @{Name="Grafana"; Command="grafana-server -v"}
)

$allInstalled = $true

for ($i = 0; $i -lt $tools.Count; $i++) {
    $tool = $tools[$i]
    Write-Host "[$($i+1)/$($tools.Count)] Checking $($tool.Name)..." -ForegroundColor Yellow
    
    try {
        $result = Invoke-Expression $tool.Command 2>&1
        if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null) {
            Write-Host "  [OK] $($tool.Name) installed" -ForegroundColor Green
            Write-Host "  Version: $($result | Select-Object -First 1)" -ForegroundColor Gray
        } else {
            Write-Host "  [FAIL] $($tool.Name) not found" -ForegroundColor Red
            $allInstalled = $false
        }
    } catch {
        Write-Host "  [FAIL] $($tool.Name) not found or not in PATH" -ForegroundColor Red
        Write-Host "  Tip: Restart PowerShell" -ForegroundColor Yellow
        $allInstalled = $false
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
if ($allInstalled) {
    Write-Host "[SUCCESS] All tools installed!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Some tools not found" -ForegroundColor Yellow
    Write-Host "Tip: Close and restart PowerShell" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
