#!/bin/bash

# v5.8.0 Release Sign-off Progress Tracker
# Purpose: Track completion rate of release sign-off approvals
# Usage: bash ops/signoff-progress.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if checklist file exists
CHECKLIST_FILE="v5.8.0_RELEASE_CHECKLIST.md"

if [ ! -f "$CHECKLIST_FILE" ]; then
    echo -e "${RED}Error: $CHECKLIST_FILE not found${NC}"
    exit 1
fi

echo "========================================="
echo "v5.8.0 Release Sign-off Progress Tracker"
echo "========================================="
echo ""

# Count total sign-off points (checkboxes in Sign-off section)
TOTAL_CHECKBOXES=$(grep -A 200 "## Release Sign-off" "$CHECKLIST_FILE" | grep -c "^\- \[ \]" || true)
COMPLETED_CHECKBOXES=$(grep -A 200 "## Release Sign-off" "$CHECKLIST_FILE" | grep -c "^\- \[x\]" || true)

# Calculate completion percentage
if [ "$TOTAL_CHECKBOXES" -gt 0 ]; then
    COMPLETION_PERCENT=$((COMPLETED_CHECKBOXES * 100 / TOTAL_CHECKBOXES))
else
    COMPLETION_PERCENT=0
fi

# Count roles that need approval
REQUIRED_APPROVALS=7
APPROVED_ROLES=$(grep -c "Status: ✅" "$CHECKLIST_FILE" || true)

# Calculate approval percentage
APPROVAL_PERCENT=$((APPROVED_ROLES * 100 / REQUIRED_APPROVALS))

# Display summary
echo "Sign-off Summary:"
echo "----------------"
echo "Total Checkboxes: $TOTAL_CHECKBOXES"
echo "Completed: $COMPLETED_CHECKBOXES"
echo "Completion Rate: ${COMPLETION_PERCENT}%"
echo ""

echo "Approval Summary:"
echo "----------------"
echo "Required Approvals: $REQUIRED_APPROVALS"
echo "Received Approvals: $APPROVED_ROLES"
echo "Approval Rate: ${APPROVAL_PERCENT}%"
echo ""

# Check individual role status
echo "Role Status:"
echo "-----------"

# Tech Lead
TECH_STATUS=$(grep -A 3 "#### Tech Lead" "$CHECKLIST_FILE" | grep "Status:" | sed 's/.*Status: //')
echo -e "Tech Lead: ${TECH_STATUS}"

# DevOps Lead
DEVOPS_STATUS=$(grep -A 3 "#### DevOps Lead" "$CHECKLIST_FILE" | grep "Status:" | sed 's/.*Status: //')
echo -e "DevOps Lead: ${DEVOPS_STATUS}"

# Security Lead
SEC_STATUS=$(grep -A 3 "#### Security Lead" "$CHECKLIST_FILE" | grep "Status:" | sed 's/.*Status: //')
echo -e "Security Lead: ${SEC_STATUS}"

# QA Lead
QA_STATUS=$(grep -A 3 "#### QA Lead" "$CHECKLIST_FILE" | grep "Status:" | sed 's/.*Status: //')
echo -e "QA Lead: ${QA_STATUS}"

# Product Owner
PO_STATUS=$(grep -A 3 "#### Product Owner" "$CHECKLIST_FILE" | grep "Status:" | sed 's/.*Status: //')
echo -e "Product Owner: ${PO_STATUS}"

# CEO Mode
CEO_STATUS=$(grep -A 3 "#### CEO Mode" "$CHECKLIST_FILE" | grep "Status:" | sed 's/.*Status: //')
echo -e "CEO Mode: ${CEO_STATUS}"

# Stakeholders
STAKE_STATUS=$(grep -A 3 "#### Stakeholders" "$CHECKLIST_FILE" | grep "Status:" | sed 's/.*Status: //')
echo -e "Stakeholders: ${STAKE_STATUS}"

echo ""
echo "========================================="

# Determine overall status
if [ "$APPROVAL_PERCENT" -eq 100 ]; then
    echo -e "${GREEN}✓ All approvals received. Ready for release!${NC}"
    exit_code=0
elif [ "$APPROVAL_PERCENT" -ge 50 ]; then
    echo -e "${YELLOW}⚠ Partial approval. $((REQUIRED_APPROVALS - APPROVED_ROLES)) approval(s) remaining.${NC}"
    exit_code=1
else
    echo -e "${RED}✗ Insufficient approvals. $((REQUIRED_APPROVALS - APPROVED_ROLES)) approval(s) remaining.${NC}"
    exit_code=1
fi

echo "========================================="
exit $exit_code
