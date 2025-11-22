#!/bin/bash

# GitHub Actions Secrets Kontrol Script
# GitHub CLI kullanarak secrets varlığını kontrol eder

set -e

REPO_OWNER="${GITHUB_REPOSITORY_OWNER:-}"
REPO_NAME="${GITHUB_REPOSITORY##*/}"
ENVIRONMENT="${1:-production}"

# REPO_NAME'ı PWD'den al (eğer env'den gelmediyse)
if [ -z "$REPO_NAME" ]; then
    REPO_NAME=$(basename "$(pwd)")
fi

# REPO_OWNER'ı env'den veya remote'dan al
if [ -z "$REPO_OWNER" ]; then
    REPO_OWNER=$(git remote get-url origin 2>/dev/null | sed -E 's/.*github.com[:/]([^/]+)\/.*/\1/' || echo "")
fi

echo ""
echo "=== GitHub Actions Secrets Kontrolü ==="
echo "Repository: ${REPO_OWNER}/${REPO_NAME}"
echo "Environment: ${ENVIRONMENT}"
echo ""

# GitHub CLI kontrolü
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) bulunamadı!"
    echo "   Lütfen GitHub CLI'yi yükleyin: https://cli.github.com/"
    echo ""
    echo "Manuel kontrol için:"
    echo "   1. GitHub Repository > Settings > Secrets and variables > Actions"
    echo "   2. Aşağıdaki secrets'ların tanımlı olduğundan emin olun:"
    echo ""
    exit 1
fi

echo "GitHub CLI mevcut, secrets kontrol ediliyor..."
echo ""

# GitHub authentication kontrolü
if ! gh auth status &> /dev/null; then
    echo "❌ GitHub CLI authenticated değil!"
    echo "   Lütfen 'gh auth login' komutu ile giriş yapın"
    exit 1
fi

ALL_SECRETS=()
MISSING_SECRETS=()
PRESENT_SECRETS=()

# Kubeconfig secrets (her zaman gerekli)
ALL_SECRETS+=("KUBECONFIG_PRODUCTION")
ALL_SECRETS+=("KUBECONFIG_STAGING")

# Production secrets
if [ "$ENVIRONMENT" = "production" ]; then
    ALL_SECRETS+=("JWT_SECRET")
    ALL_SECRETS+=("COOKIE_KEY")
    ALL_SECRETS+=("GOOGLE_CLIENT_ID")
    ALL_SECRETS+=("GOOGLE_CLIENT_SECRET")
    ALL_SECRETS+=("GOOGLE_CALLBACK_URL")
    ALL_SECRETS+=("DATABASE_URL")
    ALL_SECRETS+=("REDIS_URL")
    ALL_SECRETS+=("PROMETHEUS_URL")
    ALL_SECRETS+=("MCP_PROMETHEUS_BASE_URL")
fi

echo "Kontrol edilen secrets:"
for secret in "${ALL_SECRETS[@]}"; do
    echo -n "  - $secret: "
    
    if gh secret list --repo "${REPO_OWNER}/${REPO_NAME}" 2>/dev/null | grep -q "^${secret}\s"; then
        echo "✅ MEVCUT"
        PRESENT_SECRETS+=("$secret")
    else
        echo "❌ EKSIK"
        MISSING_SECRETS+=("$secret")
    fi
done

# Özel kontroller
if [ "$ENVIRONMENT" = "production" ]; then
    echo ""
    echo "Prometheus URL kontrolü:"
    
    PROMETHEUS_URL_EXISTS=false
    MCP_PROMETHEUS_EXISTS=false
    
    for secret in "${PRESENT_SECRETS[@]}"; do
        if [ "$secret" = "PROMETHEUS_URL" ]; then
            PROMETHEUS_URL_EXISTS=true
        fi
        if [ "$secret" = "MCP_PROMETHEUS_BASE_URL" ]; then
            MCP_PROMETHEUS_EXISTS=true
        fi
    done
    
    if [ "$PROMETHEUS_URL_EXISTS" = true ] || [ "$MCP_PROMETHEUS_EXISTS" = true ]; then
        echo "  ✅ PROMETHEUS_URL veya MCP_PROMETHEUS_BASE_URL mevcut"
        
        # Eğer PROMETHEUS_URL eksik ama MCP_PROMETHEUS_BASE_URL varsa, PROMETHEUS_URL'i eksik listeden çıkar
        if [ "$PROMETHEUS_URL_EXISTS" = false ] && [ "$MCP_PROMETHEUS_EXISTS" = true ]; then
            MISSING_SECRETS=("${MISSING_SECRETS[@]/PROMETHEUS_URL}")
        fi
    else
        echo "  ❌ PROMETHEUS_URL veya MCP_PROMETHEUS_BASE_URL eksik (en az biri gerekli)"
    fi
fi

# Özet
echo ""
echo "=== Özet ==="
echo "Mevcut secrets: ${#PRESENT_SECRETS[@]}"
echo "Eksik secrets: ${#MISSING_SECRETS[@]}"

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo ""
    echo "❌ Eksik secrets:"
    for secret in "${MISSING_SECRETS[@]}"; do
        if [ -n "$secret" ]; then
            echo "  - $secret"
        fi
    done
    
    echo ""
    echo "Secrets eklemek için:"
    echo "  1. GitHub Repository > Settings > Secrets and variables > Actions"
    echo "  2. 'New repository secret' butonuna tıklayın"
    echo "  3. Secret adını ve değerini girin"
    echo "  4. 'Add secret' butonuna tıklayın"
    echo ""
    echo "Detaylı bilgi için: docs/GITHUB_ACTIONS_SECRETS.md"
    
    exit 1
else
    echo ""
    echo "✅ Tüm gerekli secrets tanımlı!"
    exit 0
fi

