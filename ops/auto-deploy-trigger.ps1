# ===============================================
# EA Plan v6.x Auto Deploy Trigger
# PowerShell Version
# ===============================================

param(
    [string]$Branch = "main",
    [switch]$AutoCommit = $true,
    [string]$Phase = "all"
)

$REPO_PATH = if ($env:REPO_PATH) { $env:REPO_PATH } else { $PWD }
$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message)
    Write-Host "[AUTO-DEPLOY] $Message" -ForegroundColor Cyan
}

function Test-Changes {
    $changedFiles = git diff --name-only HEAD~1 HEAD 2>&1
    if ($LASTEXITCODE -ne 0) {
        $changedFiles = git ls-files --others --exclude-standard
    }
    
    if ($changedFiles -match "(finbot|mubot|deploy|ops)") {
        return $true
    }
    return $false
}

function Start-Deployment {
    param([string]$Phase)
    
    Write-Log "Triggering auto-deployment (phase: $Phase)..."
    
    if (Get-Command gh -ErrorAction SilentlyContinue) {
        $repo = (git remote get-url origin) -replace '.*github.com[/:]([^.]+).*', '$1'
        gh workflow run ea-plan-v6-auto-deploy.yml `
            --field phase=$Phase `
            -R $repo | Out-Null
    } else {
        Write-Log "GitHub CLI not installed. Run: gh workflow run ea-plan-v6-auto-deploy.yml"
    }
}

function Invoke-AutoCommit {
    if (-not $AutoCommit) {
        return
    }
    
    $status = git status --porcelain
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Log "No changes to commit"
        return
    }
    
    git add -A | Out-Null
    git commit -m "chore: auto-deploy trigger [deploy]" | Out-Null
    git push origin $Branch | Out-Null
}

# Main
Write-Log "Starting auto-deploy trigger..."

Set-Location $REPO_PATH

if (Test-Changes) {
    Write-Log "Changes detected, triggering deployment..."
    Start-Deployment -Phase $Phase
    
    if ($AutoCommit) {
        Invoke-AutoCommit
    }
} else {
    Write-Log "No deployment-required changes detected"
}

Write-Log "Auto-deploy trigger complete"

