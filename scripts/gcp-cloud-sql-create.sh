#!/bin/bash
# Google Cloud SQL PostgreSQL Instance Oluşturma Scripti
# Dese EA Plan v6.8.0 - Cloud Migration Faz 1
# Tarih: 2025-01-27

set -e  # Hata durumunda dur

echo "🚀 Google Cloud SQL PostgreSQL Instance Oluşturma"
echo "=================================================="
echo ""

# Proje ID kontrolü ve ayarlama
if [ -z "$GCP_PROJECT_ID" ]; then
    echo "⚠️  GCP_PROJECT_ID environment variable bulunamadı."
    echo "📝 Lütfen önce Google Cloud projenizi ayarlayın:"
    echo ""
    echo "   gcloud config set project [PROJE_ID_BURAYA]"
    echo ""
    echo "veya:"
    echo ""
    echo "   export GCP_PROJECT_ID=[PROJE_ID_BURAYA]"
    echo ""
    read -p "Proje ID'nizi girin (veya Enter ile devam edin): " PROJECT_ID
    
    if [ -n "$PROJECT_ID" ]; then
        echo "📌 Proje ayarlanıyor: $PROJECT_ID"
        gcloud config set project "$PROJECT_ID"
    else
        CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
        if [ -z "$CURRENT_PROJECT" ]; then
            echo "❌ Hata: Google Cloud proje ID'si bulunamadı!"
            echo "   Lütfen 'gcloud config set project [PROJE_ID_BURAYA]' komutunu çalıştırın."
            exit 1
        else
            echo "✅ Mevcut proje kullanılıyor: $CURRENT_PROJECT"
        fi
    fi
fi

# Instance oluşturma komutu
echo ""
echo "📦 Instance oluşturuluyor..."
echo ""

gcloud sql instances create dese-ea-plan-db \
  --database-version=POSTGRES_15 \
  --region=europe-west3 \
  --tier=db-g1-small \
  --root-password="<GUVENLI_BIR_SIFRE_YAZIN>" \
  --storage-type=SSD \
  --storage-size=20GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4 \
  --maintenance-release-channel=production \
  --deletion-protection \
  --labels=project=dese-ea-plan,version=v6.8.0,environment=production

echo ""
echo "✅ Instance başarıyla oluşturuldu!"
echo ""
echo "📋 Sonraki Adımlar:"
echo "1. Instance durumunu kontrol edin:"
echo "   gcloud sql instances describe dese-ea-plan-db"
echo ""
echo "2. Connection string'i alın:"
echo "   gcloud sql instances describe dese-ea-plan-db --format='value(connectionName)'"
echo ""
echo "3. Veritabanı oluşturun (opsiyonel):"
echo "   gcloud sql databases create dese_db --instance=dese-ea-plan-db"
echo ""
echo "4. Environment variable'ı güncelleyin:"
echo "   DATABASE_URL=postgresql://postgres:<GUVENLI_BIR_SIFRE_YAZIN>@<IP_ADRESI>:5432/dese_db"
echo ""

