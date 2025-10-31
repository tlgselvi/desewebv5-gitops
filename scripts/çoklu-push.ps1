# === DESE EA PLAN v5.0 - Multi-Push Script ===
# PowerShell Script for Pushing to Multiple Git Remotes
# Version: 5.0.0

# Suppress PSScriptAnalyzer warnings
[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingWriteHost', '', Justification = 'Write-Host required for colored output')]
param(
    [string[]]$Remotes = @(),
    [string]$Branch = "",
    [switch]$AllRemotes = $false,
    [switch]$CommitBeforePush = $false,
    [string]$CommitMessage = "",
    [switch]$Force = $false,
    [switch]$DryRun = $false
)

# Colors for output
function Write-Success {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ✅ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ❌ $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ⚠️  $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ℹ️  $Message" -ForegroundColor Cyan
}

# Get current branch
function Get-CurrentBranch {
    try {
        $branch = git rev-parse --abbrev-ref HEAD 2>&1
        if ($LASTEXITCODE -eq 0) {
            return $branch.Trim()
        }
        return ""
    } catch {
        return ""
    }
}

# Get all remotes
function Get-AllRemotes {
    try {
        $remotes = git remote 2>&1
        if ($LASTEXITCODE -eq 0) {
            return $remotes | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
        }
        return @()
    } catch {
        return @()
    }
}

# Check if there are uncommitted changes
function Test-UncommittedChanges {
    try {
        $status = git status --porcelain 2>&1
        if ($LASTEXITCODE -eq 0 -and $status -ne "") {
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

# Commit changes
function Invoke-Commit {
    param(
        [string]$Message
    )
    
    if ($DryRun) {
        Write-Info "[DRY RUN] Would commit changes with message: $Message"
        return $true
    }
    
    Write-Info "Staging all changes..."
    git add -A
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Failed to stage changes"
        return $false
    }
    
    Write-Info "Committing changes..."
    git commit -m $Message
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Changes committed successfully"
        return $true
    } else {
        Write-Error-Custom "Failed to commit changes"
        return $false
    }
}

# Push to remote
function Invoke-PushToRemote {
    param(
        [string]$Remote,
        [string]$BranchName,
        [bool]$ForcePush
    )
    
    if ($DryRun) {
        $forceFlag = if ($ForcePush) { " --force" } else { "" }
        Write-Info "[DRY RUN] Would push to: $Remote/$BranchName$forceFlag"
        return $true
    }
    
    Write-Info "Pushing to remote: $Remote (branch: $BranchName)"
    
    $forceFlag = if ($ForcePush) { " --force" } else { "" }
    $pushCommand = "git push$forceFlag $Remote $BranchName"
    
    Invoke-Expression $pushCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Successfully pushed to $Remote/$BranchName"
        return $true
    } else {
        Write-Error-Custom "Failed to push to $Remote/$BranchName"
        return $false
    }
}

# Main execution
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DESE EA PLAN v5.0 - Multi-Push" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get current branch
$currentBranch = if ($Branch -ne "") { $Branch } else { Get-CurrentBranch }

if ($currentBranch -eq "") {
    Write-Error-Custom "Could not determine current branch"
    exit 1
}

Write-Info "Current branch: $currentBranch"

# Get remotes to push to
$remotesToPush = @()

if ($AllRemotes) {
    $remotesToPush = Get-AllRemotes
    Write-Info "Will push to all remotes: $($remotesToPush -join ', ')"
} elseif ($Remotes.Count -gt 0) {
    $allRemotes = Get-AllRemotes
    foreach ($remote in $Remotes) {
        if ($allRemotes -contains $remote) {
            $remotesToPush += $remote
        } else {
            Write-Warning-Custom "Remote '$remote' not found, skipping"
        }
    }
    Write-Info "Will push to specified remotes: $($remotesToPush -join ', ')"
} else {
    # Default: push to origin
    if ((Get-AllRemotes) -contains "origin") {
        $remotesToPush = @("origin")
        Write-Info "No remotes specified, defaulting to 'origin'"
    } else {
        Write-Error-Custom "No remotes found and none specified"
        exit 1
    }
}

if ($remotesToPush.Count -eq 0) {
    Write-Error-Custom "No valid remotes to push to"
    exit 1
}

Write-Host ""

# Check for uncommitted changes
$hasUncommittedChanges = Test-UncommittedChanges

if ($hasUncommittedChanges) {
    if ($CommitBeforePush) {
        if ($CommitMessage -eq "") {
            $CommitMessage = "chore: update deployment configuration and resources"
        }
        
        Write-Warning-Custom "Uncommitted changes detected. Committing before push..."
        if (-not (Invoke-Commit -Message $CommitMessage)) {
            Write-Error-Custom "Failed to commit changes. Aborting push."
            exit 1
        }
        Write-Host ""
    } else {
        Write-Warning-Custom "Uncommitted changes detected. Use -CommitBeforePush to commit automatically."
        
        $response = Read-Host "Continue with push anyway? (y/N)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-Info "Push cancelled by user"
            exit 0
        }
        Write-Host ""
    }
}

# Push to each remote
$successCount = 0
$failCount = 0

foreach ($remote in $remotesToPush) {
    Write-Host "----------------------------------------" -ForegroundColor Gray
    if (Invoke-PushToRemote -Remote $remote -BranchName $currentBranch -ForcePush $Force) {
        $successCount++
    } else {
        $failCount++
    }
    Write-Host ""
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Push Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Info "Branch: $currentBranch"
Write-Info "Remotes pushed to: $successCount / $($remotesToPush.Count)"

if ($successCount -eq $remotesToPush.Count) {
    Write-Success "All pushes completed successfully!"
    exit 0
} elseif ($successCount -gt 0) {
    Write-Warning-Custom "Some pushes failed ($failCount failed)"
    exit 1
} else {
    Write-Error-Custom "All pushes failed"
    exit 1
}

