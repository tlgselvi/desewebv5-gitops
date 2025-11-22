# Quick API Test Script for Dese EA Plan v6.8.2 (PowerShell)
# Tests critical endpoints and validates expected responses

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$Environment = $env:NODE_ENV ?? "development"
)

$ErrorActionPreference = "Stop"

$ApiUrl = "$BaseUrl/api/v1"
$Passed = 0
$Failed = 0
$Token = $null

# Helper function to print test results
function Print-Test {
    param(
        [string]$TestName,
        [string]$Status,
        [string]$Details = ""
    )
    
    if ($Status -eq "PASS") {
        Write-Host "✓ $TestName" -ForegroundColor Green
        $script:Passed++
    } else {
        Write-Host "✗ $TestName" -ForegroundColor Red
        if ($Details) {
            Write-Host "  Details: $Details" -ForegroundColor Red
        }
        $script:Failed++
    }
}

# Helper function to check HTTP status
function Invoke-ApiTest {
    param(
        [string]$Url,
        [int]$ExpectedStatus,
        [string]$Method = "GET",
        [string]$Body = $null,
        [hashtable]$Headers = @{}
    )
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            SkipHttpErrorCheck = $true
            ErrorAction = "SilentlyContinue"
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = "application/json"
        }
        
        if ($Headers.Count -gt 0) {
            $params.Headers = $Headers
        }
        
        $response = Invoke-WebRequest @params
        
        if ($null -eq $response) {
            return @{
                Success = $false
                StatusCode = 0
                Error = "Connection failed or timeout"
            }
        }
        
        $actualStatusCode = [int]$response.StatusCode
        
        if ($actualStatusCode -eq $ExpectedStatus) {
            return @{
                Success = $true
                StatusCode = $actualStatusCode
                Body = $response.Content
                Response = $response
            }
        } else {
            return @{
                Success = $false
                StatusCode = $actualStatusCode
                Body = $response.Content
                Error = "Expected $ExpectedStatus, got $actualStatusCode"
            }
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        return @{
            Success = $false
            StatusCode = $statusCode
            Error = $_.Exception.Message
        }
    }
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Dese EA Plan API Quick Test Suite" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl"
Write-Host "Environment: $Environment"
Write-Host ""

# Test 1: GET /api/v1 (API Root)
Write-Host "Test 1: GET /api/v1 (API Root)"
$result = Invoke-ApiTest -Url "$ApiUrl" -ExpectedStatus 200
if ($result.Success) {
    if ($result.Body -match '"name"') {
        Print-Test "GET /api/v1 returns 200 with valid JSON" "PASS"
    } else {
        Print-Test "GET /api/v1 returns 200 with valid JSON" "FAIL" "Missing 'name' field"
    }
} else {
    Print-Test "GET /api/v1 returns 200" "FAIL" $result.Error
}
Write-Host ""

# Test 2: GET /api/v1/auth/login (Method Not Allowed)
Write-Host "Test 2: GET /api/v1/auth/login (Method Not Allowed)"
$result = Invoke-ApiTest -Url "$ApiUrl/auth/login" -ExpectedStatus 405
try {
    $headers = (Invoke-WebRequest -Uri "$ApiUrl/auth/login" -Method GET -SkipHttpErrorCheck -ErrorAction SilentlyContinue).Headers
    $allowHeader = $headers['Allow']
} catch {
    $allowHeader = $null
}

if ($result.Success) {
    if ($result.Body -match "method_not_allowed" -and $allowHeader) {
        Print-Test "GET /api/v1/auth/login returns 405 with Allow: POST" "PASS"
    } else {
        Print-Test "GET /api/v1/auth/login returns 405 with Allow: POST" "FAIL" "Missing Allow header or error message"
    }
} else {
    Print-Test "GET /api/v1/auth/login returns 405" "FAIL" $result.Error
}
Write-Host ""

# Test 3: POST /api/v1/auth/login (Mock Login)
Write-Host "Test 3: POST /api/v1/auth/login (Mock Login)"
$loginData = @{
    username = "admin@poolfab.com.tr"
} | ConvertTo-Json

if ($Environment -eq "production") {
    # Production: Should return 403
    $result = Invoke-ApiTest -Url "$ApiUrl/auth/login" -ExpectedStatus 403 -Method POST -Body $loginData
    if ($result.Success) {
        if ($result.Body -match "mock_login_disabled") {
            Print-Test "POST /api/v1/auth/login returns 403 in production" "PASS"
        } else {
            Print-Test "POST /api/v1/auth/login returns 403 in production" "FAIL" "Missing mock_login_disabled error"
        }
    } else {
        Print-Test "POST /api/v1/auth/login returns 403 in production" "FAIL" $result.Error
    }
} else {
    # Development: Should return 200
    $result = Invoke-ApiTest -Url "$ApiUrl/auth/login" -ExpectedStatus 200 -Method POST -Body $loginData
    if ($result.Success) {
        if ($result.Body -match '"token"') {
            $tokenMatch = [regex]::Match($result.Body, '"token":"([^"]+)"')
            if ($tokenMatch.Success) {
                $script:Token = $tokenMatch.Groups[1].Value
            }
            Print-Test "POST /api/v1/auth/login returns 200 with token in development" "PASS"
        } else {
            Print-Test "POST /api/v1/auth/login returns 200 with token in development" "FAIL" "Missing token in response"
        }
    } else {
        Print-Test "POST /api/v1/auth/login returns 200 in development" "FAIL" $result.Error
    }
}
Write-Host ""

# Test 4: GET /health/live (Liveness Probe)
Write-Host "Test 4: GET /health/live (Liveness Probe)"
$result = Invoke-ApiTest -Url "$BaseUrl/health/live" -ExpectedStatus 200
if ($result.Success) {
    if ($result.Body -match '"status"') {
        Print-Test "GET /health/live returns 200 with status" "PASS"
    } else {
        Print-Test "GET /health/live returns 200 with status" "FAIL" "Missing status field"
    }
} else {
    Print-Test "GET /health/live returns 200" "FAIL" $result.Error
}
Write-Host ""

# Test 5: GET /metrics (Prometheus Metrics)
Write-Host "Test 5: GET /metrics (Prometheus Metrics)"
$result = Invoke-ApiTest -Url "$BaseUrl/metrics" -ExpectedStatus 200
if ($result.Success) {
    if ($result.Body -match "^# HELP|^# TYPE|http_requests_total|http_request_duration_seconds") {
        Print-Test "GET /metrics returns 200 with Prometheus format" "PASS"
    } else {
        Print-Test "GET /metrics returns 200 with Prometheus format" "FAIL" "Response doesn't look like Prometheus metrics"
    }
} else {
    Print-Test "GET /metrics returns 200" "FAIL" "HTTP status: $($result.StatusCode)"
}
Write-Host ""

# Test 6: GET /api/v1/auth/me (Authentication Test - if token available)
if ($Token) {
    Write-Host "Test 6: GET /api/v1/auth/me (Authentication with JWT Token)"
    $result = Invoke-ApiTest -Url "$ApiUrl/auth/me" -ExpectedStatus 200 -Headers @{
        Authorization = "Bearer $Token"
    }
    if ($result.Success) {
        if ($result.Body -match '"user"') {
            Print-Test "GET /api/v1/auth/me returns 200 with user info" "PASS"
        } else {
            Print-Test "GET /api/v1/auth/me returns 200 with user info" "FAIL" "Missing user field"
        }
    } else {
        Print-Test "GET /api/v1/auth/me returns 200" "FAIL" "HTTP status: $($result.StatusCode)"
    }
    Write-Host ""
}

# Test 7: WebSocket Authentication Example (Info only)
Write-Host "Test 7: WebSocket Authentication (Info)"
Write-Host "⚠ WebSocket test requires interactive client" -ForegroundColor Yellow
Write-Host "   Example with wscat:"
Write-Host "   1. Install: npm install -g wscat"
Write-Host "   2. Connect: wscat -c ws://localhost:3000"
if ($Token) {
    Write-Host "   3. Send auth: {\"type\":\"auth\",\"token\":\"$Token\"}"
} else {
    Write-Host "   3. Send auth: {\"type\":\"auth\",\"token\":\"YOUR_JWT_TOKEN\"}"
}
Write-Host "   4. Expected: {\"type\":\"auth_success\",\"userId\":\"...\",\"email\":\"...\"}"
Write-Host ""

# Summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Passed: $Passed" -ForegroundColor Green
Write-Host "Failed: $Failed" -ForegroundColor Red
Write-Host ""

if ($Failed -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed." -ForegroundColor Red
    exit 1
}

