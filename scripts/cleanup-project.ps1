# Dese EA Plan - Project Cleanup Script
# Bu script projeyi temizler: node_modules, build çıktıları, loglar ve geçici dosyalar.

Write-Host "🧹 Dese EA Plan Temizlik İşlemi Başlatılıyor..." -ForegroundColor Cyan

# 1. Node Modules & Package Locks
Write-Host "📦 Bağımlılıklar temizleniyor (node_modules)..." -ForegroundColor Yellow
if (Test-Path "node_modules") { Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "frontend/node_modules") { Remove-Item -Path "frontend/node_modules" -Recurse -Force -ErrorAction SilentlyContinue }

# 2. Build Artifacts
Write-Host "🏗️  Build çıktıları temizleniyor (dist, .next)..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path ".next") { Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "frontend/.next") { Remove-Item -Path "frontend/.next" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "frontend/out") { Remove-Item -Path "frontend/out" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "frontend/build") { Remove-Item -Path "frontend/build" -Recurse -Force -ErrorAction SilentlyContinue }

# 3. Test Reports & Coverage
Write-Host "🧪 Test raporları temizleniyor..." -ForegroundColor Yellow
if (Test-Path "coverage") { Remove-Item -Path "coverage" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "test-results") { Remove-Item -Path "test-results" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "playwright-report") { Remove-Item -Path "playwright-report" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "frontend/coverage") { Remove-Item -Path "frontend/coverage" -Recurse -Force -ErrorAction SilentlyContinue }

# 4. Logs & Temp Files
Write-Host "📝 Loglar ve geçici dosyalar temizleniyor..." -ForegroundColor Yellow
Get-ChildItem -Path . -Include *.log, *.tmp, *.temp, .DS_Store, Thumbs.db -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Force
if (Test-Path "logs") { Remove-Item -Path "logs" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "npm-debug.log") { Remove-Item -Path "npm-debug.log" -Force -ErrorAction SilentlyContinue }
if (Test-Path "pnpm-debug.log") { Remove-Item -Path "pnpm-debug.log" -Force -ErrorAction SilentlyContinue }

# 5. Turbo & Cache
Write-Host "🚀 Cache dosyaları temizleniyor..." -ForegroundColor Yellow
if (Test-Path ".turbo") { Remove-Item -Path ".turbo" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "frontend/.turbo") { Remove-Item -Path "frontend/.turbo" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "tsconfig.tsbuildinfo") { Remove-Item -Path "tsconfig.tsbuildinfo" -Force -ErrorAction SilentlyContinue }
if (Test-Path "frontend/tsconfig.tsbuildinfo") { Remove-Item -Path "frontend/tsconfig.tsbuildinfo" -Force -ErrorAction SilentlyContinue }

Write-Host "✨ Temizlik tamamlandı! Projeyi başlatmak için 'pnpm install' yapın." -ForegroundColor Green

