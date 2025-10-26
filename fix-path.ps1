# Fix PATH for DevOps tools

Write-Host "Fixing PATH for DevOps tools..." -ForegroundColor Cyan
Write-Host ""

# Find installed locations
$wingetPackages = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages"

# Add winget packages to PATH
$wingetDirs = Get-ChildItem $wingetPackages -Directory -ErrorAction SilentlyContinue
foreach ($dir in $wingetDirs) {
    $exePath = Join-Path $dir.FullName "*.exe"
    if (Test-Path $exePath) {
        Write-Host "Adding: $($dir.Name)" -ForegroundColor Gray
        $env:PATH += ";$($dir.FullName)"
    }
}

# Also check WindowsApps
$windowsApps = "$env:LOCALAPPDATA\Microsoft\WindowsApps"
$env:PATH += ";$windowsApps"

Write-Host "`nPATH updated for this session!" -ForegroundColor Green
Write-Host "To make permanent, restart PowerShell." -ForegroundColor Yellow
Write-Host ""

# Test the tools
Write-Host "Testing tools..." -ForegroundColor Cyan
$tools = @("kubectl", "helm", "docker", "kustomize", "argocd", "cosign")
foreach ($tool in $tools) {
    $found = Get-Command $tool -ErrorAction SilentlyContinue
    if ($found) {
        Write-Host "✅ $tool is available" -ForegroundColor Green
    } else {
        Write-Host "❌ $tool not found" -ForegroundColor Red
    }
}

