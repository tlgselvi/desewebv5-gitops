#!/bin/bash
# ops/release-automation.sh
# Automated release workflow for v5.8.0
# Mode: CEO AUTO EXECUTION

set -euo pipefail

RELEASE_TAG="${1:-v5.8.0}"
CHECKLIST="v5.8.0_RELEASE_CHECKLIST.md"

echo "[INFO] Starting automated release for $RELEASE_TAG"

# 0. Preconditions
if ! command -v git >/dev/null 2>&1; then
  echo "[ERROR] git is not installed or not in PATH" >&2
  exit 1
fi;
if ! command -v argocd >/dev/null 2>&1; then
  echo "[ERROR] argocd CLI is not installed or not in PATH" >&2
  exit 1
fi;

if [ ! -f "$CHECKLIST" ]; then
  echo "[ERROR] Checklist file not found: $CHECKLIST" >&2
  exit 1
fi

# 1. Validation Phase (use signoff-progress tracker)
echo "[INFO] Validating approvals and pre-release gates..."
if bash ops/signoff-progress.sh >/dev/null 2>&1; then
  echo "[PASS] All approvals received."
else
  echo "[FAIL] Approvals incomplete. Aborting release." >&2
  bash ops/signoff-progress.sh || true
  exit 1
fi

# Optional: quick sanity checks for key phrases
grep -q "Pre-Release Validation" "$CHECKLIST" || { echo "[FAIL] Pre-Release Validation section missing" >&2; exit 1; }

# 2. Git Tag & Push
echo "[INFO] Tagging release..."
git tag -a "$RELEASE_TAG" -m "Stable Release - Sprint 2.6 (All Gates PASS)"
git push origin "$RELEASE_TAG"

# 3. ArgoCD Deployment
echo "[INFO] Syncing ArgoCD application..."
argocd app sync aiops-prod --prune --timeout 600
argocd app wait aiops-prod --health --timeout 300

# 4. Post-Deployment Validation
echo "[INFO] Running post-deployment validation..."
bash ops/post-deployment-validation.sh --env prod --tag "$RELEASE_TAG"

# 5. Final Lock & Status
if [ $? -eq 0 ]; then
  echo "[SUCCESS] $RELEASE_TAG deployed and validated. System locked stable."
  VERSION_NOPREFIX=${RELEASE_TAG#v}
  FINAL_STATUS_FILE="FINAL_STATUS_V${VERSION_NOPREFIX}.md"
  echo "Status: LOCKED STABLE ✅" >> "$FINAL_STATUS_FILE"
else
  echo "[ERROR] Validation failed. Initiating rollback..." >&2
  argocd app rollback aiops-prod
  exit 1
fi

echo "[DONE] Release automation completed for $RELEASE_TAG"


