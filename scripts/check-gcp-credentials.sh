#!/bin/bash
# Google Cloud Credentials Kontrol Script
# Bu script gcp-credentials.json dosyasının varlığını kontrol eder

echo "🔍 Google Cloud Credentials Kontrolü"
echo ""

CREDENTIALS_FILE="gcp-credentials.json"
ENV_FILE=".env"

# 1. gcp-credentials.json kontrolü
if [ -f "$CREDENTIALS_FILE" ]; then
    echo "✅ $CREDENTIALS_FILE bulundu"
    
    # JSON dosyasını kontrol et
    if command -v jq &> /dev/null; then
        PROJECT_ID=$(jq -r '.project_id' "$CREDENTIALS_FILE" 2>/dev/null)
        CLIENT_EMAIL=$(jq -r '.client_email' "$CREDENTIALS_FILE" 2>/dev/null)
        TYPE=$(jq -r '.type' "$CREDENTIALS_FILE" 2>/dev/null)
        
        if [ "$PROJECT_ID" != "null" ] && [ -n "$PROJECT_ID" ]; then
            echo "   - Project ID: $PROJECT_ID"
            echo "   - Client Email: $CLIENT_EMAIL"
            echo "   - Type: $TYPE"
        else
            echo "   ⚠️  JSON dosyası geçersiz format"
        fi
    else
        echo "   ℹ️  jq yüklü değil, JSON içeriği kontrol edilemiyor"
    fi
else
    echo "❌ $CREDENTIALS_FILE bulunamadı!"
    echo "   📝 Lütfen Google Cloud Console'dan Service Account JSON key indirin"
    echo "   📚 Detaylar: docs/DOCKER_GOOGLE_CLOUD_SETUP.md"
fi

echo ""

# 2. .env dosyası kontrolü
if [ -f "$ENV_FILE" ]; then
    echo "✅ $ENV_FILE bulundu"
    
    # Google Cloud environment variable'larını kontrol et
    REQUIRED_VARS=("GSC_PROJECT_ID" "GSC_CLIENT_EMAIL" "GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET")
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" "$ENV_FILE"; then
            VALUE=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2-)
            if echo "$VALUE" | grep -qE "your-|YOUR_|^$"; then
                echo "   ⚠️  $var ayarlanmamış (placeholder değer)"
            else
                echo "   ✅ $var ayarlanmış"
            fi
        else
            echo "   ❌ $var eksik"
        fi
    done
else
    echo "❌ $ENV_FILE bulunamadı!"
    echo "   📝 Lütfen env.example'dan .env dosyası oluşturun:"
    echo "      cp env.example .env"
fi

echo ""
echo "📚 Daha fazla bilgi: docs/DOCKER_GOOGLE_CLOUD_SETUP.md"

