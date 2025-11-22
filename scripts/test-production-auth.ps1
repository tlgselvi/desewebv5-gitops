# Production Auth Guard Test Script
# GET /login (405) ve POST /login (403) testleri

param(
    [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== Production Auth Guard Test ===" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl`n" -ForegroundColor Yellow

$Passed = 0
$Failed = 0

# Test 1: GET /api/v1/auth/login (405 beklenir)
Write-Host "Test 1: GET /api/v1/auth/login (405 beklenir)" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/v1/auth/login" -Method GET -SkipHttpErrorCheck -ErrorAction SilentlyContinue
    
    if ($null -eq $response) {
        Write-Host "  ❌ Connection failed" -ForegroundColor Red
        $Failed++
    } else {
        $statusCode = [int]$response.StatusCode
        $allowHeader = $response.Headers['Allow']
        
        if ($statusCode -eq 405 -and $allowHeader -eq "POST") {
            Write-Host "  ✅ Status: $statusCode, Allow: $allowHeader" -ForegroundColor Green
            $Passed++
        } else {
            Write-Host "  ❌ Status: $statusCode (405 bekleniyordu)" -ForegroundColor Red
            Write-Host "     Allow header: $allowHeader (POST bekleniyordu)" -ForegroundColor Red
            $Failed++
        }
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  ❌ Error: Status $statusCode" -ForegroundColor Red
    $Failed++
}

Write-Host ""

# Test 2: POST /api/v1/auth/login (403 beklenir - production guard)
Write-Host "Test 2: POST /api/v1/auth/login (403 beklenir - production guard)" -ForegroundColor Cyan
$loginData = @{
    username = "test@example.com"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/v1/auth/login" -Method POST -Body $loginData -ContentType "application/json" -SkipHttpErrorCheck -ErrorAction SilentlyContinue
    
    if ($null -eq $response) {
        Write-Host "  ❌ Connection failed" -ForegroundColor Red
        $Failed++
    } else {
        $statusCode = [int]$response.StatusCode
        $responseBody = $response.Content | ConvertFrom-Json
        
        if ($statusCode -eq 403 -and $responseBody.error -eq "mock_login_disabled") {
            Write-Host "  ✅ Status: $statusCode, Error: $($responseBody.error)" -ForegroundColor Green
            $Passed++
        } else {
            Write-Host "  ❌ Status: $statusCode (403 bekleniyordu)" -ForegroundColor Red
            if ($responseBody.error) {
                Write-Host "     Error: $($responseBody.error)" -ForegroundColor Red
            }
            $Failed++
        }
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 403) {
        Write-Host "  ✅ Status: 403 (production guard çalışıyor)" -ForegroundColor Green
        $Passed++
    } else {
        Write-Host "  ❌ Error: Status $statusCode" -ForegroundColor Red
        $Failed++
    }
}

Write-Host ""

# Özet
Write-Host "=== Özet ===" -ForegroundColor Cyan
Write-Host "Passed: $Passed/2" -ForegroundColor $(if($Passed -eq 2){"Green"}else{"Yellow"})
Write-Host "Failed: $Failed/2" -ForegroundColor $(if($Failed -eq 0){"Green"}else{"Red"})

if ($Passed -eq 2) {
    Write-Host "`n✅ Production auth guard doğru çalışıyor!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️ Production auth guard testleri başarısız." -ForegroundColor Yellow
    Write-Host "   Backend'in production modunda çalıştığından emin olun:" -ForegroundColor Yellow
    Write-Host "   NODE_ENV=production" -ForegroundColor White
    exit 1
}

