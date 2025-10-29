#!/bin/bash
# ===============================================
# Docura Image Cleanup Script
# Projede kullanılmayan image'ları tespit eder
# ===============================================

set -e

echo ""
echo "🧹 DOCURA IMAGE TEMİZLİĞİ"
echo "================================"
echo ""

# Projede KULLANILAN image'lar (BUNLARI SİLMEYELİM!)
USED_IMAGES=(
    "ghcr.io/cptsystems/finbot:latest"
    "ghcr.io/cptsystems/mubot:latest"
    "ghcr.io/cptsystems/frontend:latest"
    "ghcr.io/cptsystems/dese-web:latest"
)

# Projede KULLANILMAYAN image'lar (BUNLARI SİLEBİLİRİZ)
UNUSED_IMAGES=(
    "ghcr.io/cptsystems/aiops-trainer:latest"  # Sadece reports'ta, aktif kullanım yok
    "ghcr.io/cptseo/observer:latest"             # ImagePullBackOff hataları, kullanılmıyor
)

echo "📊 ANALİZ SONUÇLARI:"
echo ""
echo "✅ KULLANILAN IMAGE'LAR (SİLMEYİN!):"
for img in "${USED_IMAGES[@]}"; do
    echo "   - $img"
done

echo ""
echo "❌ KULLANILMAYAN IMAGE'LAR (SİLİNEBİLİR):"
for img in "${UNUSED_IMAGES[@]}"; do
    echo "   - $img"
done

echo ""
echo "🔍 PROJE DOSYALARINDA KONTROL:"
echo ""

# YAML dosyalarını kontrol et
yaml_files=$(find . -type f \( -name "*.yaml" -o -name "*.yml" \) ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.next/*" 2>/dev/null | wc -l)
echo "Toplam YAML dosyası: $yaml_files"

echo ""
echo "📋 IMAGE REFERANS KONTROLÜ:"
echo ""

for img in "${USED_IMAGES[@]}" "${UNUSED_IMAGES[@]}"; do
    image_name=$(echo "$img" | cut -d':' -f1)
    count=$(grep -r "$image_name" . --include="*.yaml" --include="*.yml" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.next 2>/dev/null | wc -l)
    if [ "$count" -gt 0 ]; then
        echo "   $img"
        echo "   → $count dosyada bulundu"
    fi
done

echo ""
echo "⚠️  DİKKAT:"
echo "Bu script sadece ANALİZ yapar. Image'ları otomatik silmez."
echo ""
echo "Docura'dan manuel silme için:"
echo ""
echo "KULLANILMAYAN IMAGE'LARI SİLMEK İÇİN:"
echo ""
echo "1. GitHub Container Registry'ye gidin:"
echo "   https://github.com/orgs/cptsystems/packages"
echo ""
echo "2. Her image için:"
for img in "${UNUSED_IMAGES[@]}"; do
    repo=$(echo "$img" | sed 's|.*/||' | cut -d':' -f1)
    echo "   - $repo paketini bulun"
    echo "   - 'Package settings' > 'Delete this package'"
done
echo ""
echo "3. VEYA GitHub CLI ile:"
echo "   gh api delete /orgs/cptsystems/packages/container/[IMAGE_NAME]/versions/[VERSION_ID]"
echo "   (Önce package listesini alın: gh api /orgs/cptsystems/packages)"
echo ""
echo "✅ ANALİZ TAMAMLANDI!"
echo ""

