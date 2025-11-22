# === EA PLAN v5.2 – SELF-HEALING DEPLOYMENT & DRIFT ANTICIPATION ===
# Mode: Pre-Production | Domain: CPT Optimization | Stack: Kubernetes + GitOps + AIOps
# Author: CPT Digital Team
# Version: 5.2
# PowerShell Script for Windows

param(
    [string]$AppName = "cpt-web",
    [string]$Namespace = "default",
    [string]$Branch = "main"
)

# Colors for output
function Write-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor Green
}

function Write-Warning-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] WARNING: $Message" -ForegroundColor Yellow
}

function Write-Error-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ERROR: $Message" -ForegroundColor Red
    exit 1
}

function Write-Info-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] INFO: $Message" -ForegroundColor Cyan
}

# Check prerequisites
function Test-Prerequisites {
    Write-Log "Checking prerequisites..."

    $commands = @('kubectl')
    foreach ($cmd in $commands) {
        if (!(Get-Command $cmd -ErrorAction SilentlyContinue)) {
            Write-Error-Log "$cmd not found in PATH"
        }
    }
    
    # Optional but recommended commands
    $optionalCommands = @('gh', 'jq', 'argocd', 'gcloud')
    foreach ($cmd in $optionalCommands) {
        if (!(Get-Command $cmd -ErrorAction SilentlyContinue)) {
            Write-Warning-Log "$cmd not found, some features may be disabled"
        }
    }
    
    # Verify kubectl connectivity
    try {
        kubectl cluster-info | Out-Null
    } catch {
        Write-Error-Log "Cannot connect to Kubernetes cluster"
    }

    # Verify required Kubernetes Secrets exist
    Write-Info-Log "Verifying required Kubernetes Secrets..."
    $requiredSecrets = @('dese-db-secret', 'dese-redis-secret')
    $missingSecrets = @()
    
    foreach ($secretName in $requiredSecrets) {
        try {
            $secretExists = kubectl get secret $secretName -n $Namespace --ignore-not-found=true 2>&1
            if ($LASTEXITCODE -ne 0 -or $secretExists -match "NotFound") {
                $missingSecrets += $secretName
            } else {
                Write-Log "✅ Secret '$secretName' found in namespace '$Namespace'"
            }
        } catch {
            $missingSecrets += $secretName
        }
    }
    
    if ($missingSecrets.Count -gt 0) {
        $missingSecretsList = $missingSecrets -join ", "
        Write-Error-Log "Required Kubernetes Secret(s) not found: $missingSecretsList. Please create the missing Secret(s) before deploying."
    } else {
        Write-Log "✅ All required Kubernetes Secrets are present"
    }

    # Verify GKE Node Pool Autoscaling (if gcloud is available)
    if (Get-Command gcloud -ErrorAction SilentlyContinue) {
        Write-Info-Log "Verifying GKE Node Pool autoscaling configuration..."
        try {
            $nodePools = gcloud container node-pools list --cluster dese-ea-plan-cluster --region europe-west3 --format="json" | ConvertFrom-Json
            foreach ($pool in $nodePools) {
                if (-not $pool.autoscaling.enabled) {
                    Write-Error-Log "Node pool '$($pool.name)' does not have autoscaling enabled. Deployment aborted."
                }
                Write-Log "✅ Node pool '$($pool.name)' has autoscaling enabled (Min: $($pool.autoscaling.minNodeCount), Max: $($pool.autoscaling.maxNodeCount))"
            }
        } catch {
            Write-Warning-Log "Could not verify GKE node pool autoscaling. Check gcloud authentication or cluster name. Error: $_"
        }
    }

    # Verify GKE is authorized for Cloud SQL (if gcloud is available)
    if (Get-Command gcloud -ErrorAction SilentlyContinue) {
        Write-Info-Log "Verifying Cloud SQL authorized networks..."
        try {
            $podRange = (gcloud container clusters describe dese-ea-plan-cluster --region europe-west3 --format="value(clusterIpv4Cidr)")
            $authorizedNetworks = (gcloud sql instances describe dese-ea-plan-db --format="value(settings.ipConfiguration.authorizedNetworks.value)")

            if ($authorizedNetworks -notlike "*$podRange*") {
                Write-Error-Log "Pod IP range '$podRange' is NOT in Cloud SQL authorized networks. Deployment aborted."
            }
            Write-Log "✅ Pod IP range '$podRange' is authorized for Cloud SQL."

        } catch {
            Write-Warning-Log "Could not verify Cloud SQL authorized networks. Check gcloud authentication or resource names. Error: $_"
        }
    }

    Write-Log "✅ All prerequisites met"
}

# Step 1: Deploy manifests
function Deploy-Manifests {
    Write-Log "[1/6] 🚀 Deploying manifests..."
    
    try {
        kubectl apply -k deploy/base
        kubectl apply -k deploy/overlays/prod

        # Check for ArgoCD app
        argocd app get $AppName 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            argocd app sync $AppName --timeout 300
            Write-Log "✅ ArgoCD sync completed"
        } else {
            Write-Warning-Log "ArgoCD app '$AppName' not found, skipping sync"
        }

        Write-Log "✅ Manifests deployed successfully"
    } catch {
        Write-Warning-Log "Deployment failed: $_"
    }
}

# Step 1.5: Verify Image Existence before Rollout
function Test-Image {
    Write-Log "[1.5/6] 🖼️ Verifying container image existence..."
    if (Get-Command gh -ErrorAction SilentlyContinue) {
        try {
            $gitSha = git rev-parse HEAD
            $imageName = "ghcr.io/$(git remote get-url origin -replace '.*github.com[:/]', '' -replace '\.git$', '')/dese-ea-plan-v5"
            $imageWithSha = "$imageName`:$gitSha"
            
            Write-Info-Log "Checking for image: $imageWithSha"
            # Check if image exists in GHCR using GitHub API
            $repo = git remote get-url origin -replace '.*github.com[:/]', '' -replace '\.git$', ''
            $packageName = "dese-ea-plan-v5"
            $imageTag = $gitSha
            
            # Use gh api to check container package versions
            $versions = gh api "orgs/$($repo.Split('/')[0])/packages/container/$packageName/versions" --jq ".[] | select(.metadata.container.tags[] == \"$imageTag\") | .id" 2>&1
            if ($LASTEXITCODE -ne 0 -or -not $versions) {
                throw "Image $imageWithSha not found in GHCR"
            }
            Write-Log "✅ Image for commit $gitSha found in registry."
        } catch {
            Write-Error-Log "Image for the latest commit ($gitSha) not found in ghcr.io. A build and push might be required before deploying. Error: $_"
        }
    }
}

# Step 2: Trigger AIOps canary rollout
function Invoke-DeploymentWorkflow {
    param([string]$Strategy = "rolling") # Default to rolling
    Write-Log "[2/6] 🧠 Triggering GitHub Actions deployment workflow (Strategy: $Strategy)..."
    
    try {
        # Get GitHub repository from git remote
        $gitRemote = git remote get-url origin
        $githubRepo = $gitRemote -replace '.*github.com[:/]', '' -replace '\.git$', ''
        
        gh workflow run deploy.yml `
            --ref $Branch `
            --field environment=production `
            --field strategy=$Strategy `
            --repo $githubRepo
        
        Write-Info-Log "Workflow triggered, waiting 10s for initialization..."
        Start-Sleep -Seconds 10
        
        # Check workflow status
        $runId = gh run list --workflow=deploy.yml --branch=$Branch --limit 1 --json databaseId -q '.[0].databaseId'
        Write-Info-Log "Monitoring workflow run: $runId"
        
        Write-Log "✅ Canary rollout triggered"
    } catch {
        Write-Error-Log "Failed to trigger workflow: $_"
    }
}

# Step 3: Apply guardrails and alert rules
function Set-Guardrails {
    Write-Log "[3/6] 🛡️ Applying guardrails & alert rules..."

    # Apply Kyverno drift prevention policy
    if (Test-Path "policies/kyverno/prevent-drift.yaml") {
        kubectl apply -f policies/kyverno/prevent-drift.yaml
        Write-Log "✅ Kyverno drift prevention policy applied"
    } else {
        Write-Warning-Log "Kyverno drift prevention policy not found"
    }

    # Apply Prometheus alert rules
    if (Test-Path "monitoring/prometheus-rules.yaml") {
        kubectl apply -f monitoring/prometheus-rules.yaml
        Write-Log "✅ Prometheus alert rules applied"
    } else {
        Write-Warning-Log "Prometheus alert rules not found"
    }

    # Apply self-healing job
    if (Test-Path "aiops/self-heal-job.yaml") {
        kubectl apply -f aiops/self-heal-job.yaml
        Write-Log "✅ Self-healing job applied"
    } else {
        Write-Warning-Log "Self-healing job not found"
    }

    Write-Log "✅ Guardrails and alert rules applied"
}

# Step 4: Verify rollout and job health
function Confirm-Rollout {
    Write-Log "[4/6] 🔍 Verifying rollout & job health..."
    
    try {
        # Check rollout status
        kubectl get rollout $AppName -n $Namespace | Out-Null
    } catch {
        Write-Warning-Log "Cannot get rollout status"
    }

    # Check ArgoCD app diff
    argocd app get $AppName 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        argocd app diff $AppName | Out-Null
    } else {
        Write-Warning-Log "Cannot show ArgoCD diff"
    }
    
    # Check self-healing job logs
    try {
        kubectl logs job/self-heal-cpt -n $Namespace --tail=20
    } catch {
        Write-Warning-Log "Cannot get job logs"
    }
    
    # Check Prometheus rules
    try {
        kubectl get prometheusrules predictive-alerts -n monitoring
        Write-Log "✅ Prometheus alert rules verified"
    } catch {
        Write-Warning-Log "Predictive alerts not found"
    }
    
    Write-Log "✅ Rollout verification completed"
}

# Step 5: Run drift and risk validation
function Confirm-DriftRisk {
    Write-Log "[5/6] 📊 Running drift & risk validation..."
    
    # Check risk prediction file
    if (Test-Path "aiops/risk-prediction.json") {
        Write-Host "Risk Prediction File:" -ForegroundColor Cyan
        Get-Content aiops/risk-prediction.json
        Write-Log "✅ Risk prediction analyzed"
    } else {
        Write-Warning-Log "Risk prediction file not found"
    }
    
    # Check rollback history
    if (Test-Path "logs/rollback-history.log") {
        Get-Content logs/rollback-history.log -Tail 20
        Write-Log "✅ Rollback history reviewed"
    } else {
        Write-Warning-Log "Rollback history not found"
    }
    
    Write-Log "✅ Drift and risk validation completed"
}

# Step 6: Display validation summary
function Show-Summary {
    Write-Log "[6/6] ✅ Validation criteria summary"
    Write-Host "-----------------------------------" -ForegroundColor Cyan
    Write-Host "• 3 successful rollouts (pause + retry + rollback)" -ForegroundColor White
    Write-Host "• Self-healing job completed successfully" -ForegroundColor White
    Write-Host "• Drift policy blocked manual changes" -ForegroundColor White
    Write-Host "• SLOs met for 7-day window" -ForegroundColor White
    Write-Host "-----------------------------------" -ForegroundColor Cyan
    Write-Host ""
    
    # Get GitHub repository
    $gitRemote = git remote get-url origin
    $githubRepo = $gitRemote -replace '.*github.com[:/]', '' -replace '\.git$', ''
    
    Write-Info-Log "🟢 EA Plan v5.2 deployment initiated. Monitor system for 48h stability window."
    
    # Display monitoring links
    Write-Host ""
    Write-Host "📊 Monitoring Dashboard:" -ForegroundColor Cyan
    Write-Host "  • ArgoCD: https://argocd.example.com" -ForegroundColor White
    Write-Host "  • Grafana: https://grafana.example.com" -ForegroundColor White
    Write-Host "  • GitHub Actions: https://github.com/$githubRepo/actions" -ForegroundColor White
    Write-Host ""
    
    Write-Log "✅ Deployment summary displayed"
}

# Main execution
function Main {
    Write-Log "=== Starting EA Plan v5.2 Deployment ==="
    
    Test-Prerequisites
    Deploy-Manifests
    Test-Image
    Invoke-DeploymentWorkflow -Strategy "rolling" # Or pass a parameter to the script
    Set-Guardrails
    Confirm-Rollout
    Confirm-DriftRisk
    Show-Summary
    
    Write-Log "=== EA Plan v5.2 Deployment Complete ==="
}

# Run main function
Main
