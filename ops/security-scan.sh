#!/bin/bash
# Security Scan Script for Dese EA Plan v6.8.0
# Phase-5 Sprint 3: Task 3.2
# Performs comprehensive security scanning

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_DIR="$PROJECT_ROOT/reports/security"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create reports directory
mkdir -p "$REPORT_DIR"

echo "=== Dese EA Plan v6.8.0 Security Scan ==="
echo "Timestamp: $(date -Iseconds)"
echo ""

# Function to print section header
print_section() {
    echo -e "\n${GREEN}▶ $1${NC}"
    echo "----------------------------------------"
}

# Function to check command availability
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${YELLOW}⚠️  $1 not found, skipping...${NC}"
        return 1
    fi
    return 0
}

# 1. Dependency Vulnerability Scan
print_section "1. Dependency Vulnerability Scan (npm audit)"

if check_command npm; then
    cd "$PROJECT_ROOT"
    npm audit --audit-level=moderate --json > "$REPORT_DIR/npm-audit-$TIMESTAMP.json" 2>&1 || true
    
    # Parse results
    VULN_COUNT=$(jq -r '.metadata.vulnerabilities.total // 0' "$REPORT_DIR/npm-audit-$TIMESTAMP.json" 2>/dev/null || echo "0")
    CRITICAL=$(jq -r '.metadata.vulnerabilities.critical // 0' "$REPORT_DIR/npm-audit-$TIMESTAMP.json" 2>/dev/null || echo "0")
    HIGH=$(jq -r '.metadata.vulnerabilities.high // 0' "$REPORT_DIR/npm-audit-$TIMESTAMP.json" 2>/dev/null || echo "0")
    
    echo "  Total vulnerabilities: $VULN_COUNT"
    echo "  Critical: $CRITICAL"
    echo "  High: $HIGH"
    
    if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
        echo -e "${RED}  ❌ Critical or High vulnerabilities found!${NC}"
    else
        echo -e "${GREEN}  ✅ No critical or high vulnerabilities${NC}"
    fi
fi

# 2. Code Security Analysis (ESLint)
print_section "2. Code Security Analysis (ESLint)"

if check_command npx; then
    cd "$PROJECT_ROOT"
    npx eslint src --ext .ts,.tsx --format json --output-file "$REPORT_DIR/eslint-security-$TIMESTAMP.json" 2>/dev/null || true
    
    # Check for security-related issues
    if [ -f "$REPORT_DIR/eslint-security-$TIMESTAMP.json" ]; then
        SECURITY_ISSUES=$(jq '[.[] | select(.messages[] | .ruleId | contains("security"))] | length' "$REPORT_DIR/eslint-security-$TIMESTAMP.json" 2>/dev/null || echo "0")
        echo "  Security-related issues: $SECURITY_ISSUES"
    fi
fi

# 3. TypeScript Security Check
print_section "3. TypeScript Security Check"

if check_command npx; then
    cd "$PROJECT_ROOT"
    # Check for any/unknown types (security risk)
    ANY_COUNT=$(grep -r ":\s*any" src/ --include="*.ts" --include="*.tsx" | wc -l || echo "0")
    echo "  'any' type usage: $ANY_COUNT"
    
    if [ "$ANY_COUNT" -gt 10 ]; then
        echo -e "${YELLOW}  ⚠️  High usage of 'any' type (type safety risk)${NC}"
    else
        echo -e "${GREEN}  ✅ Acceptable 'any' usage${NC}"
    fi
fi

# 4. Secret Scanning
print_section "4. Secret Scanning"

if check_command git; then
    cd "$PROJECT_ROOT"
    
    # Check for potential secrets in code
    SECRET_PATTERNS=(
        "password\s*=\s*['\"][^'\"]+['\"]"
        "api[_-]?key\s*=\s*['\"][^'\"]+['\"]"
        "secret\s*=\s*['\"][^'\"]+['\"]"
        "token\s*=\s*['\"][^'\"]+['\"]"
        "PRIVATE_KEY"
        "BEGIN RSA PRIVATE KEY"
    )
    
    SECRET_COUNT=0
    for pattern in "${SECRET_PATTERNS[@]}"; do
        COUNT=$(grep -r -iE "$pattern" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "//.*test" | wc -l || echo "0")
        SECRET_COUNT=$((SECRET_COUNT + COUNT))
    done
    
    echo "  Potential secrets found: $SECRET_COUNT"
    
    if [ "$SECRET_COUNT" -gt 0 ]; then
        echo -e "${RED}  ❌ Potential secrets in code!${NC}"
        grep -r -iE "password\s*=\s*['\"][^'\"]+['\"]|api[_-]?key\s*=\s*['\"][^'\"]+['\"]" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -5 || true
    else
        echo -e "${GREEN}  ✅ No obvious secrets found${NC}"
    fi
fi

# 5. SQL Injection Check
print_section "5. SQL Injection Risk Check"

if check_command grep; then
    cd "$PROJECT_ROOT"
    
    # Check for raw SQL queries (risk)
    RAW_SQL=$(grep -r "\.query\s*(\s*['\"]SELECT\|\.query\s*(\s*['\"]INSERT\|\.query\s*(\s*['\"]UPDATE\|\.query\s*(\s*['\"]DELETE" src/ --include="*.ts" 2>/dev/null | wc -l || echo "0")
    
    echo "  Raw SQL queries found: $RAW_SQL"
    
    if [ "$RAW_SQL" -gt 0 ]; then
        echo -e "${RED}  ❌ Raw SQL queries detected (use Drizzle ORM)${NC}"
    else
        echo -e "${GREEN}  ✅ No raw SQL queries (using Drizzle ORM)${NC}"
    fi
fi

# 6. Input Validation Check
print_section "6. Input Validation Check"

if check_command grep; then
    cd "$PROJECT_ROOT"
    
    # Check for Zod validation usage
    ZOD_USAGE=$(grep -r "z\.object\|z\.string\|z\.number" src/routes/ --include="*.ts" 2>/dev/null | wc -l || echo "0")
    
    # Count route handlers
    ROUTE_HANDLERS=$(grep -r "router\.\(get\|post\|put\|delete\|patch\)" src/routes/ --include="*.ts" 2>/dev/null | wc -l || echo "0")
    
    echo "  Route handlers: $ROUTE_HANDLERS"
    echo "  Zod validations: $ZOD_USAGE"
    
    if [ "$ROUTE_HANDLERS" -gt 0 ] && [ "$ZOD_USAGE" -gt 0 ]; then
        COVERAGE=$((ZOD_USAGE * 100 / ROUTE_HANDLERS))
        echo "  Validation coverage: ${COVERAGE}%"
        
        if [ "$COVERAGE" -ge 80 ]; then
            echo -e "${GREEN}  ✅ Good validation coverage${NC}"
        else
            echo -e "${YELLOW}  ⚠️  Validation coverage below 80%${NC}"
        fi
    fi
fi

# 7. Authentication Check
print_section "7. Authentication & Authorization Check"

if check_command grep; then
    cd "$PROJECT_ROOT"
    
    # Check for protected routes
    PROTECTED_ROUTES=$(grep -r "withAuth\|authorize\|authenticate" src/routes/ --include="*.ts" 2>/dev/null | wc -l || echo "0")
    PUBLIC_ROUTES=$(grep -r "router\.\(get\|post\|put\|delete\)" src/routes/ --include="*.ts" 2>/dev/null | grep -v "withAuth\|authorize" | wc -l || echo "0")
    
    echo "  Protected routes: $PROTECTED_ROUTES"
    echo "  Potentially public routes: $PUBLIC_ROUTES"
    
    if [ "$PUBLIC_ROUTES" -gt 5 ]; then
        echo -e "${YELLOW}  ⚠️  High number of potentially unprotected routes${NC}"
    else
        echo -e "${GREEN}  ✅ Most routes are protected${NC}"
    fi
fi

# 8. Generate Summary Report
print_section "8. Generating Summary Report"

SUMMARY_FILE="$REPORT_DIR/security-scan-summary-$TIMESTAMP.md"

cat > "$SUMMARY_FILE" <<EOF
# Security Scan Summary

**Date:** $(date -Iseconds)  
**Project:** Dese EA Plan v6.8.0  
**Scan Type:** Automated Security Scan

## Results

- Dependency Vulnerabilities: $VULN_COUNT (Critical: $CRITICAL, High: $HIGH)
- Code Security Issues: $SECURITY_ISSUES
- Type Safety: $ANY_COUNT 'any' types
- Secret Risks: $SECRET_COUNT potential secrets
- SQL Injection Risks: $RAW_SQL raw SQL queries
- Input Validation: ${COVERAGE}% coverage

## Recommendations

1. Review and fix critical/high vulnerabilities
2. Reduce 'any' type usage
3. Ensure all secrets are in environment variables
4. Use Drizzle ORM for all database queries
5. Maintain >80% validation coverage

## Detailed Reports

- npm audit: \`reports/security/npm-audit-$TIMESTAMP.json\`
- ESLint: \`reports/security/eslint-security-$TIMESTAMP.json\`

EOF

echo "  Summary report: $SUMMARY_FILE"
echo -e "\n${GREEN}✅ Security scan completed${NC}"
echo "  Reports saved to: $REPORT_DIR"

