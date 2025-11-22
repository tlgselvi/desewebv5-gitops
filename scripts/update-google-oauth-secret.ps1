# Google OAuth Secret Güncelleme Script
# Bu script dese-secrets Secret'ına Google OAuth credentials ekler

param(
    [Parameter(Mandatory=$true)]
    [string]$ClientSecret
)

Write-Host "🔐 GOOGLE OAUTH SECRET GÜNCELLEME" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Client ID (Google Cloud Console'dan görüntüden alınan)
$clientId = "725504779947-gsn3f877ho3qj77e581qjm29auaecb84.apps.googleusercontent.com"

# Client Secret (parametre olarak alınan)
$clientSecret = $ClientSecret

Write-Host "📋 Google OAuth Credentials:" -ForegroundColor Yellow
Write-Host "   Client ID: $clientId" -ForegroundColor White
Write-Host "   Client Secret: $($clientSecret.Substring(0, [Math]::Min(10, $clientSecret.Length)))..." -ForegroundColor White
Write-Host ""

# Base64 encode
Write-Host "🔄 Base64 encoding..." -ForegroundColor Yellow
$clientIdBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($clientId))
$clientSecretBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($clientSecret))
Write-Host "✅ Base64 encoding tamamlandı" -ForegroundColor Green
Write-Host ""

# Patch secret
Write-Host "📦 Secret güncelleniyor..." -ForegroundColor Yellow
$patch = "[{\"op\":\"add\",\"path\":\"/data/GOOGLE_CLIENT_ID\",\"value\":\"$clientIdBase64\"},{\"op\":\"add\",\"path\":\"/data/GOOGLE_CLIENT_SECRET\",\"value\":\"$clientSecretBase64\"}]"
kubectl patch secret dese-secrets -n default --type="json" -p=$patch

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Secret başarıyla güncellendi!" -ForegroundColor Green
    Write-Host ""
    
    # Deployment restart
    Write-Host "🔄 Deployment restart ediliyor..." -ForegroundColor Yellow
    kubectl rollout restart deployment dese-api-deployment -n default
    Write-Host "✅ Deployment restart başlatıldı" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "⏳ Deployment durumu:" -ForegroundColor Yellow
    kubectl rollout status deployment dese-api-deployment -n default --timeout=60s
    Write-Host ""
    
    Write-Host "✅ Google OAuth Secret güncellemesi tamamlandı!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🧪 Test:" -ForegroundColor Cyan
    Write-Host "   https://app.poolfab.com.tr/login → Google login butonu" -ForegroundColor White
} else {
    Write-Host "❌ Secret güncellenirken hata oluştu!" -ForegroundColor Red
    exit 1
}

