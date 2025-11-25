# Google GenAI API Test Script (PowerShell)
# DESE EA Plan v7.0

$ErrorActionPreference = "Stop"

Write-Host "Testing Google GenAI API" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green
Write-Host ""

# Get API key from .env or environment
$envFile = ".env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    foreach ($line in $envContent) {
        if ($line -match "^GOOGLE_CLOUD_API_KEY=(.+)$") {
            $apiKey = $matches[1].Trim()
            break
        }
    }
}

if (-not $apiKey) {
    $apiKey = $env:GOOGLE_CLOUD_API_KEY
}

if (-not $apiKey) {
    Write-Host "ERROR: API Key not found!" -ForegroundColor Red
    Write-Host "Set GOOGLE_CLOUD_API_KEY in .env file or environment variable" -ForegroundColor Yellow
    exit 1
}

Write-Host "API Key: $($apiKey.Substring(0, [Math]::Min(20, $apiKey.Length)))..." -ForegroundColor Cyan
Write-Host ""

# Test with gemini-2.5-flash-lite
Write-Host "Testing with gemini-2.5-flash-lite..." -ForegroundColor Yellow
Write-Host ""

$url = "https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:streamGenerateContent?key=$apiKey"

$body = @{
    contents = @(
        @{
            role = "user"
            parts = @(
                @{
                    text = "Merhaba! DESE EA Plan finansal asistanı olarak kendini tanıt. Kısa bir tanıtım yap."
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers @{
        "Content-Type" = "application/json"
    } -Body $body
    
    Write-Host "SUCCESS: Response received" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host "-" * 60 -ForegroundColor Gray
    
    # Parse streaming response
    if ($response.candidates) {
        foreach ($candidate in $response.candidates) {
            if ($candidate.content -and $candidate.content.parts) {
                foreach ($part in $candidate.content.parts) {
                    if ($part.text) {
                        Write-Host $part.text -ForegroundColor White
                    }
                }
            }
        }
    } else {
        Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
    }
    
    Write-Host "-" * 60 -ForegroundColor Gray
    Write-Host ""
    Write-Host "Test completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "ERROR: Test failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    
    if ($_.ErrorDetails.Message) {
        Write-Host "Error Details:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Cyan
    Write-Host "1. Check if API key is correct" -ForegroundColor White
    Write-Host "2. Verify Vertex AI API is enabled" -ForegroundColor White
    Write-Host "3. Check API key permissions" -ForegroundColor White
    exit 1
}

