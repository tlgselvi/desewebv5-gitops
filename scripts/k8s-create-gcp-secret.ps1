# Kubernetes Google Cloud Credentials Secret Oluşturma Script
# Bu script gcp-credentials.json dosyasını Kubernetes Secret olarak oluşturur

Write-Host "🔐 Kubernetes Google Cloud Credentials Secret Oluşturma" -ForegroundColor Cyan
Write-Host ""

# 1. gcp-credentials.json dosyasını kontrol et
$credentialsFile = "gcp-credentials.json"
if (-not (Test-Path $credentialsFile)) {
    Write-Host "❌ $credentialsFile bulunamadı!" -ForegroundColor Red
    Write-Host "   📝 Lütfen Google Cloud Console'dan Service Account JSON key indirin" -ForegroundColor Yellow
    Write-Host "   📚 Detaylar: docs/DOCKER_GOOGLE_CLOUD_SETUP.md" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ $credentialsFile bulundu" -ForegroundColor Green

# 2. kubectl bağlantısını kontrol et
Write-Host ""
Write-Host "🔍 Kubernetes cluster bağlantısı kontrol ediliyor..." -ForegroundColor Cyan
try {
    $clusterInfo = kubectl cluster-info 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "kubectl cluster'a bağlanamıyor"
    }
    Write-Host "✅ Kubernetes cluster'a bağlı" -ForegroundColor Green
} catch {
    Write-Host "❌ Hata: kubectl cluster'a bağlanamıyor!" -ForegroundColor Red
    Write-Host "   📝 Lütfen kubectl config dosyanızı kontrol edin" -ForegroundColor Yellow
    exit 1
}

# 3. Namespace kontrolü (varsayılan: default)
$namespace = "default"
Write-Host ""
Write-Host "📦 Namespace: $namespace" -ForegroundColor Cyan

# 4. Secret oluştur (gcp-credentials adında)
$secretName = "gcp-credentials"
Write-Host ""
Write-Host "🔐 Secret oluşturuluyor: $secretName" -ForegroundColor Cyan

# Mevcut secret'ı kontrol et
$existingSecret = kubectl get secret $secretName -n $namespace 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "⚠️  Secret '$secretName' zaten mevcut, güncelleniyor..." -ForegroundColor Yellow
    kubectl delete secret $secretName -n $namespace
}

# Secret oluştur (JSON key dosyasından)
kubectl create secret generic $secretName `
    --from-file=gcp-credentials.json=$credentialsFile `
    -n $namespace

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Secret '$secretName' başarıyla oluşturuldu" -ForegroundColor Green
} else {
    Write-Host "❌ Hata: Secret oluşturulamadı!" -ForegroundColor Red
    exit 1
}

# 5. dese-secrets Secret'ına GSC environment variable'ları ekle
Write-Host ""
Write-Host "📝 dese-secrets Secret'ına GSC environment variable'ları ekleniyor..." -ForegroundColor Cyan

# JSON key dosyasından bilgileri oku
try {
    $jsonContent = Get-Content $credentialsFile | ConvertFrom-Json
    $projectId = $jsonContent.project_id
    $clientEmail = $jsonContent.client_email
    $privateKey = $jsonContent.private_key
    
    Write-Host "   - Project ID: $projectId" -ForegroundColor Gray
    Write-Host "   - Client Email: $clientEmail" -ForegroundColor Gray
    
    # dese-secrets Secret'ını kontrol et
    $deseSecret = kubectl get secret dese-secrets -n $namespace 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  dese-secrets Secret'ı bulunamadı, oluşturuluyor..." -ForegroundColor Yellow
        kubectl create secret generic dese-secrets -n $namespace
    }
    
    # GSC environment variable'larını ekle/güncelle
    Write-Host "   📝 GSC_PROJECT_ID ekleniyor..." -ForegroundColor Gray
    kubectl patch secret dese-secrets -n $namespace --type='json' -p="[{\"op\":\"add\",\"path\":\"/data/GSC_PROJECT_ID\",\"value\":\"$([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($projectId)))\"}]" 2>&1 | Out-Null
    
    Write-Host "   📝 GSC_CLIENT_EMAIL ekleniyor..." -ForegroundColor Gray
    kubectl patch secret dese-secrets -n $namespace --type='json' -p="[{\"op\":\"add\",\"path\":\"/data/GSC_CLIENT_EMAIL\",\"value\":\"$([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($clientEmail)))\"}]" 2>&1 | Out-Null
    
    Write-Host "   📝 GSC_PRIVATE_KEY ekleniyor..." -ForegroundColor Gray
    kubectl patch secret dese-secrets -n $namespace --type='json' -p="[{\"op\":\"add\",\"path\":\"/data/GSC_PRIVATE_KEY\",\"value\":\"$([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($privateKey)))\"}]" 2>&1 | Out-Null
    
    Write-Host "✅ dese-secrets Secret'ı güncellendi" -ForegroundColor Green
    
} catch {
    Write-Host "⚠️  Uyarı: GSC environment variable'ları eklenemedi: $_" -ForegroundColor Yellow
    Write-Host "   📝 Manuel olarak ekleyebilirsiniz:" -ForegroundColor Yellow
    Write-Host "      kubectl patch secret dese-secrets -n $namespace --type='json' -p='[{\"op\":\"add\",\"path\":\"/data/GSC_PROJECT_ID\",\"value\":\"BASE64_VALUE\"}]'" -ForegroundColor Gray
}

# 6. Secret'ları listele
Write-Host ""
Write-Host "📋 Oluşturulan Secrets:" -ForegroundColor Cyan
kubectl get secrets -n $namespace | Select-String -Pattern "gcp-credentials|dese-secrets"

Write-Host ""
Write-Host "✅ Google Cloud Credentials Secret'ları başarıyla oluşturuldu!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Sonraki adımlar:" -ForegroundColor Cyan
Write-Host "   1. Deployment dosyalarını güncelleyin (volume mount ekleyin)" -ForegroundColor White
Write-Host "   2. Deployment'ları apply edin: kubectl apply -f k8s/" -ForegroundColor White
Write-Host "   3. Pod'ları kontrol edin: kubectl get pods" -ForegroundColor White

