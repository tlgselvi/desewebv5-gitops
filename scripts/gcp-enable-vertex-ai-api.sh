#!/bin/bash
# Google Cloud Vertex AI API Aktifleştirme Scripti
# Dese EA Plan v7.0 - GenAI App Builder Entegrasyonu
# Tarih: 2025-01-27

set -e

echo "🚀 Vertex AI API Aktifleştiriliyor"
echo "================================="
echo ""

# Proje kontrolü
PROJECT_ID=${GCP_PROJECT_ID:-"ea-plan-seo-project"}

CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "$CURRENT_PROJECT" ]; then
    echo "📌 Proje ayarlanıyor: $PROJECT_ID"
    gcloud config set project "$PROJECT_ID"
elif [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo "⚠️  Aktif proje ($CURRENT_PROJECT) farklı, doğru projeye geçiliyor..."
    gcloud config set project "$PROJECT_ID"
fi

echo "✅ Proje ID: $PROJECT_ID"
echo ""

# Vertex AI API aktifleştirme
echo "📦 Vertex AI API aktifleştiriliyor..."
echo "   Bu işlem birkaç dakika sürebilir..."
echo ""

gcloud services enable aiplatform.googleapis.com --project="$PROJECT_ID"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Vertex AI API başarıyla aktifleştirildi!"
    echo ""
else
    echo "❌ Hata: Vertex AI API aktifleştirilemedi!"
    exit 1
fi

# Document AI API aktifleştirme (opsiyonel ama önerilir)
echo "📦 Document AI API aktifleştiriliyor..."
if gcloud services enable documentai.googleapis.com --project="$PROJECT_ID" 2>/dev/null; then
    echo "✅ Document AI API aktifleştirildi!"
else
    echo "⚠️  Document AI API aktifleştirilemedi (opsiyonel)"
fi

# Discovery Engine API aktifleştirme (Search için)
echo "📦 Discovery Engine API aktifleştiriliyor..."
if gcloud services enable discoveryengine.googleapis.com --project="$PROJECT_ID" 2>/dev/null; then
    echo "✅ Discovery Engine API aktifleştirildi!"
else
    echo "⚠️  Discovery Engine API aktifleştirilemedi (opsiyonel)"
fi

echo ""
echo "📋 Sonraki Adımlar:"
echo "1. Vertex AI Studio'yu yenileyin: https://console.cloud.google.com/vertex-ai/studio"
echo "2. Agent Builder'a gidin: https://console.cloud.google.com/vertex-ai/agent-builder"
echo "3. Yeni bir agent oluşturun"
echo "4. Agent ID'yi .env dosyanıza ekleyin: GENAI_AGENT_ID=your-agent-id"
echo ""

