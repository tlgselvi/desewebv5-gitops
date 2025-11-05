Write-Host '=== MCP Servers Health Check ===' -ForegroundColor Cyan
Write-Host ''

$urls = @(
    'http://localhost:5555/finbot/health',
    'http://localhost:5556/mubot/health',
    'http://localhost:5557/dese/health',
    'http://localhost:5558/observability/health'
)

foreach ($url in $urls) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        Write-Host '✅' $url -ForegroundColor Green
        Write-Host $response.Content
        Write-Host ''
    } catch {
        Write-Host '❌' $url -ForegroundColor Red
        Write-Host $_.Exception.Message
        Write-Host ''
    }
}

