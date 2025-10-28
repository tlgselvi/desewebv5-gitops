#!/usr/bin/env pwsh
# ops/release-automation.ps1
# Automated release workflow for v5.8.0 (Windows/PowerShell)
# Mode: CEO AUTO EXECUTION

param(
    [string]$ReleaseTag = "v5.8.0"
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

Write-Host "[INFO] Starting automated release for $ReleaseTag"

$Checklist = "v5.8.0_RELEASE_CHECKLIST.md"

# 0) Preconditions
function Test-CommandAvailable {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "[ERROR] Command not found: $Name"
    }
}

Test-CommandAvailable git
Test-CommandAvailable argocd

if (-not (Test-Path $Checklist)) {
    throw "[ERROR] Checklist file not found: $Checklist"
}

# 1) Validation Phase (light checks against checklist)
Write-Host "[INFO] Validating approvals and pre-release gates..."
$content = Get-Content -Raw -Path $Checklist

if ($content -notmatch 'Pre-Release Validation') {
    throw "[FAIL] Pre-Release Validation section missing in checklist. Aborting."
}

# Expect completion rate line like: **Completion Rate:** `X/7` approvals received
$completionMatch = Select-String -InputObject $content -Pattern 'Completion Rate:\s*`?([0-9]+)\/7`?'
if (-not $completionMatch) {
    throw "[FAIL] Could not determine completion rate from checklist. Aborting."
}
$approved = [int]$completionMatch.Matches[0].Groups[1].Value
if ($approved -ne 7) {
    Write-Host "[FAIL] Approvals incomplete: $approved/7 received. Aborting release." -ForegroundColor Red
    throw "Approvals incomplete"
}
Write-Host "[PASS] All approvals received ($approved/7)." -ForegroundColor Green

# 2) Git Tag & Push
Write-Host "[INFO] Tagging release..."
& git tag -a $ReleaseTag -m "Stable Release - Sprint 2.6 (All Gates PASS)"
& git push origin $ReleaseTag

# 3) ArgoCD Deployment
Write-Host "[INFO] Syncing ArgoCD application..."
& argocd app sync aiops-prod --prune --timeout 600
& argocd app wait aiops-prod --health --timeout 300

# 4) Post-Deployment Validation
Write-Host "[INFO] Running post-deployment validation..."

# Prefer PowerShell validator if present; fallback to bash script if available
$psValidator = Join-Path (Split-Path -Parent $PSCommandPath) 'post-deployment-validation.ps1'
if (Test-Path $psValidator) {
    & $psValidator -env prod -tag $ReleaseTag
}
elseif (Get-Command bash -ErrorAction SilentlyContinue) {
    & bash ops/post-deployment-validation.sh --env prod --tag $ReleaseTag
}
else {
    throw "[ERROR] No validator found (ops/post-deployment-validation.ps1 or bash)."
}

# 5) Final Lock & Status
Write-Host "[SUCCESS] $ReleaseTag deployed and validated. System locked stable." -ForegroundColor Green
$versionNoPrefix = $ReleaseTag.TrimStart('v')
$finalStatusFile = "FINAL_STATUS_V$versionNoPrefix.md"
Add-Content -Path $finalStatusFile -Value "Status: LOCKED STABLE ✅"

Write-Host "[DONE] Release automation completed for $ReleaseTag"


