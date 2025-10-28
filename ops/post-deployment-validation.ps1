#!/usr/bin/env pwsh
# ops/post-deployment-validation.ps1
# Post-deployment validation for v5.8.0 (Windows/PowerShell)
# Validates health, metrics, and key SLO thresholds; updates final status on success.

param(
    [ValidateSet('prod','staging','dev')]
    [string]$env = 'prod',
    [string]$tag = 'v5.8.0',
    [string]$baseUrl = 'http://localhost:3000',
    [int]$p95LatencyTargetMs = 250,
    [double]$errorRateTarget = 0.005,    # 0.5%
    [double]$burnRateTarget = 0.10       # 10%
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Test-HttpOk {
    param([string]$Url)
    try {
        $resp = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 15 -UseBasicParsing
        return ($resp.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Get-MetricsText {
    param([string]$Url)
    $resp = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 20 -UseBasicParsing
    return $resp.Content
}

Write-Host "[INFO] Post-deployment validation started for tag $tag (env=$env)"

# 1) Health check
$healthUrl = "$baseUrl/health"
Write-Host "[INFO] Checking health: $healthUrl"
if (-not (Test-HttpOk -Url $healthUrl)) {
    Write-Error "[FAIL] Health endpoint not OK: $healthUrl"
}
Write-Host "[PASS] Health endpoint OK"

# 2) Metrics fetch
$metricsUrl = "$baseUrl/metrics/aiops"
Write-Host "[INFO] Fetching metrics: $metricsUrl"
$metrics = Get-MetricsText -Url $metricsUrl

# Basic presence checks
if ($metrics -notmatch 'aiops') {
    Write-Error "[FAIL] AIOps metrics not found in response"
}

# 3) Parse key metrics
# p95 latency example metric line (custom formatting expected by environment), fallback to generic http metrics if available
$p95 = $null
if ($metrics -match 'aiops_latency_p95_ms\s+(?<v>[0-9]+(?:\.[0-9]+)?)') {
    $p95 = [double]$Matches['v']
}

# error rate
$errorRate = $null
if ($metrics -match 'aiops_error_rate\s+(?<v>[0-9]+(?:\.[0-9]+)?)') {
    $errorRate = [double]$Matches['v']
}

# burn rate
$burnRate = $null
if ($metrics -match 'aiops_error_budget_burn_rate\s+(?<v>[0-9]+(?:\.[0-9]+)?)') {
    $burnRate = [double]$Matches['v']
}

# Fallbacks (optional common names)
if (-not $p95 -and ($metrics -match 'http_request_p95_ms\s+(?<v>[0-9]+(?:\.[0-9]+)?)')) { $p95 = [double]$Matches['v'] }
if (-not $errorRate -and ($metrics -match 'http_error_rate\s+(?<v>[0-9]+(?:\.[0-9]+)?)')) { $errorRate = [double]$Matches['v'] }
if (-not $burnRate -and ($metrics -match 'slo_burn_rate\s+(?<v>[0-9]+(?:\.[0-9]+)?)')) { $burnRate = [double]$Matches['v'] }

# 4) Threshold checks
$failures = @()
if ($null -eq $p95) { $failures += 'p95 latency metric missing' }
elseif ($p95 -gt $p95LatencyTargetMs) { $failures += "p95 latency $p95 ms > target $p95LatencyTargetMs ms" }

if ($null -eq $errorRate) { $failures += 'error rate metric missing' }
elseif ($errorRate -gt $errorRateTarget) { $failures += "error rate $errorRate > target $errorRateTarget" }

if ($null -eq $burnRate) { $failures += 'burn rate metric missing' }
elseif ($burnRate -gt $burnRateTarget) { $failures += "burn rate $burnRate > target $burnRateTarget" }

if ($failures.Count -gt 0) {
    Write-Host "[ERROR] Threshold checks failed:" -ForegroundColor Red
    $failures | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
    exit 1
}

Write-Host "[PASS] Metrics within targets: p95=${p95}ms, errorRate=${errorRate}, burnRate=${burnRate}" -ForegroundColor Green

# 5) Final status update
$versionNoPrefix = $tag.TrimStart('v')
$finalStatusFile = "FINAL_STATUS_V$versionNoPrefix.md"
Add-Content -Path $finalStatusFile -Value "Post-Deployment Validation: PASSED ✅ (p95=${p95}ms, errorRate=${errorRate}, burnRate=${burnRate})"

Write-Host "[DONE] Post-deployment validation completed successfully"
exit 0


