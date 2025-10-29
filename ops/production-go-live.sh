#!/bin/bash
# ===============================================
# EA PLAN v6.5.1 PRODUCTION ACTIVATION SCRIPT
# ===============================================

set -e

echo "🚀 EA PLAN PRODUCTION GO-LIVE başlatılıyor..."

# 1️⃣ Ortam değişkenleri
NAMESPACE_WEB="ea-web"
GITHUB_REPO="github.com/CPTSystems/ea-plan"
CDN_ZONE="cptsystems.com"
PROD_URL="https://www.cptsystems.com"
PREPROD_URL="https://staging.cptsystems.io"
DNS_PROVIDER="cloudflare"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
CF_API_TOKEN="${CF_API_TOKEN:-}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "📅 Timestamp: $TIMESTAMP"
echo ""

# 2️⃣ Pre-Prod health check
echo "🔍 Pre-Production Health Check..."
echo "---"

HEALTHY_PODS=$(kubectl get pods -n $NAMESPACE_WEB --no-headers 2>/dev/null | grep -E 'Running|Completed' | wc -l || echo "0")
TOTAL_PODS=$(kubectl get pods -n $NAMESPACE_WEB --no-headers 2>/dev/null | wc -l || echo "0")

if [ "$TOTAL_PODS" -gt 0 ]; then
    if [ "$HEALTHY_PODS" -eq "$TOTAL_PODS" ]; then
        echo -e "${GREEN}✅ Tüm pod'lar sağlıklı ($HEALTHY_PODS/$TOTAL_PODS)${NC}"
    else
        echo -e "${YELLOW}⚠️  Bazı pod'lar hazır değil ($HEALTHY_PODS/$TOTAL_PODS)${NC}"
        kubectl get pods -n $NAMESPACE_WEB | grep -vE 'Running|Completed'
    fi
else
    echo -e "${RED}❌ Namespace bulunamadı veya pod yok${NC}"
fi

echo ""
echo "Pre-Prod endpoint kontrolü..."
PREPROD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $PREPROD_URL 2>/dev/null || echo "000")
if [ "$PREPROD_STATUS" = "200" ] || [ "$PREPROD_STATUS" = "301" ] || [ "$PREPROD_STATUS" = "302" ]; then
    echo -e "${GREEN}✅ Pre-Prod endpoint erişilebilir (HTTP $PREPROD_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠️  Pre-Prod endpoint erişilemedi (HTTP $PREPROD_STATUS)${NC}"
fi
echo ""

# 3️⃣ CDN ve DNS yönlendirmesi
if [ -n "$CF_API_TOKEN" ]; then
    echo "🔹 CDN önbelleği temizleniyor..."
    CDN_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CDN_ZONE}/purge_cache" \
         -H "Authorization: Bearer $CF_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{"purge_everything":true}' || echo "{\"success\":false}")
    
    if echo "$CDN_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ CDN cache temizlendi${NC}"
    else
        echo -e "${YELLOW}⚠️  CDN cache temizliği başarısız (CF_API_TOKEN kontrol edin)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  CF_API_TOKEN ayarlanmamış, CDN temizliği atlanıyor${NC}"
fi
echo ""

echo "🔹 Production Ingress yapılandırması..."
INGRESS_YAML=$(cat <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ea-web-prod
  namespace: $NAMESPACE_WEB
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  rules:
  - host: www.cptsystems.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ea-web
            port:
              number: 80
  tls:
  - hosts:
    - www.cptsystems.com
    secretName: tls-cpt-prod
EOF
)

echo "$INGRESS_YAML" | kubectl apply -f - 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Production Ingress oluşturuldu/güncellendi${NC}"
else
    echo -e "${RED}❌ Ingress oluşturma hatası${NC}"
    exit 1
fi
echo ""

# 4️⃣ Production ConfigMap güncellemesi
echo "🔹 Production ConfigMap güncelleniyor..."
PATCH_DATA="{\"data\":{\"Phase\":\"production\",\"Version\":\"v6.5.1\",\"GoLive\":\"true\",\"Environment\":\"production\",\"LastUpdated\":\"$TIMESTAMP\"}}"

kubectl patch configmap ea-plan-v6-4 -n $NAMESPACE_WEB \
  --type merge -p "$PATCH_DATA" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ ConfigMap güncellendi (Phase: production)${NC}"
else
    echo -e "${YELLOW}⚠️  ConfigMap güncelleme hatası${NC}"
fi
echo ""

# 5️⃣ Docura & GitHub senkronizasyonu
if command -v gh >/dev/null 2>&1; then
    echo "🔹 Docura production build tetikleniyor..."
    gh workflow run docura-publish.yml 2>&1 || echo -e "${YELLOW}⚠️  Docura pipeline tetiklenemedi (opsiyonel)${NC}"
else
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) bulunamadı, Docura pipeline atlanıyor${NC}"
fi
echo ""

echo "🔹 Git commit ve push..."
if [ -d ~/ea-plan ] && [ -f ~/ea-plan/.git/config ]; then
    cd ~/ea-plan
    git add . 2>&1 || echo "Git add başarısız"
    git commit -m "EA Plan Production Go-Live $TIMESTAMP" 2>&1 || echo "Git commit başarısız (değişiklik yok)"
    git push origin main 2>&1 || echo -e "${YELLOW}⚠️  Git push başarısız${NC}"
    echo -e "${GREEN}✅ Git işlemleri tamamlandı${NC}"
else
    echo -e "${YELLOW}⚠️  ~/ea-plan repository bulunamadı${NC}"
fi
echo ""

# 6️⃣ Health doğrulama
echo "🔹 Production doğrulaması..."
echo "---"

INGRESS_STATUS=$(kubectl get ingress ea-web-prod -n $NAMESPACE_WEB 2>&1)
if echo "$INGRESS_STATUS" | grep -q "ea-web-prod"; then
    echo -e "${GREEN}✅ Production Ingress mevcut${NC}"
    echo "$INGRESS_STATUS"
else
    echo -e "${RED}❌ Production Ingress bulunamadı${NC}"
fi
echo ""

echo "Production endpoint kontrolü..."
sleep 5  # DNS propagation için bekleme
PROD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $PROD_URL 2>/dev/null || echo "000")
if [ "$PROD_STATUS" = "200" ] || [ "$PROD_STATUS" = "301" ] || [ "$PROD_STATUS" = "302" ]; then
    echo -e "${GREEN}✅ Production endpoint aktif (HTTP $PROD_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠️  Production endpoint henüz aktifleşmedi (HTTP $PROD_STATUS)${NC}"
    echo "DNS propagation için birkaç dakika bekleyin"
fi
echo ""

# Final Summary
echo "==============================================="
echo "✅ EA PLAN v6.5.1 PRODUCTION GO-LIVE tamamlandı"
echo "==============================================="
echo ""
echo "🌐 Production URL: $PROD_URL"
echo "📅 Zaman Damgası: $TIMESTAMP"
echo "📊 Phase: production"
echo "🏷️  Version: v6.5.1"
echo ""
echo "📋 Sonraki Adımlar:"
echo "  1. DNS propagation kontrolü (5-15 dakika)"
echo "  2. SSL sertifika kontrolü (cert-manager)"
echo "  3. Monitoring dashboard kontrolü"
echo "  4. Production load test"
echo ""

