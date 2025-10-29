# ===============================================
# Docker Performance Optimization Script
# PowerShell Version
# ===============================================

$ErrorActionPreference = "Continue"

Write-Host "`n🐳 Docker Performance Optimization`n" -ForegroundColor Cyan
Write-Host "=================================`n" -ForegroundColor Cyan

# 1. Enable BuildKit
$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"

Write-Host "✅ BuildKit enabled" -ForegroundColor Green
Write-Host ""

# 2. Clean up unused resources
Write-Host "🧹 Cleaning up unused Docker resources...`n" -ForegroundColor Yellow

# Remove stopped containers
docker container prune -f | Out-Null

# Remove unused images
docker image prune -a -f | Out-Null

# Remove unused volumes
docker volume prune -f | Out-Null

# Remove build cache
docker builder prune -f | Out-Null

Write-Host "✅ Cleanup completed`n" -ForegroundColor Green

# 3. Show disk usage
Write-Host "📊 Docker Disk Usage:" -ForegroundColor Cyan
docker system df

Write-Host "`n✅ Docker optimized!`n" -ForegroundColor Green

