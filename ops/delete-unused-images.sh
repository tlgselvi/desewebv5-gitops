#!/bin/bash
# ===============================================
# GitHub Container Registry - Unused Images Delete Script
# Kullanılmayan image'ları otomatik siler
# ===============================================

set -e

echo "🗑️  KULLANILMAYAN IMAGE'LARI SİLİYOR..."
echo ""

# Kullanılmayan image'lar
UNUSED_IMAGES=(
    "aiops-trainer"
    "observer"
)

# GitHub org
ORG="cptsystems"

echo "⚠️  DİKKAT: Bu işlem GERİ ALINAMAZ!"
echo ""
echo "Silinecek image'lar:"
for img in "${UNUSED_IMAGES[@]}"; do
    echo "  - ghcr.io/$ORG/$img"
done

echo ""
read -p "Devam etmek istiyor musunuz? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "İptal edildi."
    exit 0
fi

echo ""
echo "🔍 Package listesi alınıyor..."

# Her image için package bilgilerini al ve sil
for img in "${UNUSED_IMAGES[@]}"; do
    echo ""
    echo "📦 $img paketi kontrol ediliyor..."
    
    # Package ID'yi bul
    package_info=$(gh api "/orgs/$ORG/packages?package_type=container" 2>/dev/null | jq ".[] | select(.name == \"$img\")")
    
    if [ -z "$package_info" ]; then
        echo "   ⚠️  Paket bulunamadı veya zaten silinmiş: $img"
        continue
    fi
    
    package_id=$(echo "$package_info" | jq -r '.id')
    package_name=$(echo "$package_info" | jq -r '.name')
    
    echo "   ✅ Paket bulundu: $package_name (ID: $package_id)"
    
    # Versiyon listesi al
    versions=$(gh api "/orgs/$ORG/packages/container/$img/versions" 2>/dev/null | jq -r '.[].id')
    
    if [ -z "$versions" ]; then
        echo "   ⚠️  Versiyon bulunamadı"
        continue
    fi
    
    echo "   📋 Bulunan versiyonlar:"
    version_count=0
    for version_id in $versions; do
        version_count=$((version_count + 1))
        echo "      - Version ID: $version_id"
    done
    
    echo ""
    echo "   🗑️  Tüm versiyonlar siliniyor..."
    
    for version_id in $versions; do
        echo "      Siliniyor: $version_id"
        gh api -X DELETE "/orgs/$ORG/packages/container/$img/versions/$version_id" 2>/dev/null && \
            echo "      ✅ Silindi: $version_id" || \
            echo "      ❌ Silinemedi: $version_id"
    done
    
    echo "   ✅ $img paketi temizlendi!"
done

echo ""
echo "🎉 TEMİZLEME TAMAMLANDI!"
echo ""
echo "📋 Kontrol için:"
echo "   gh api /orgs/$ORG/packages?package_type=container"

