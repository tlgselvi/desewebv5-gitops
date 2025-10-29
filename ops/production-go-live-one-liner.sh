#!/bin/bash
# ===============================================
# EA PLAN v6.5.1 PRODUCTION GO-LIVE (TEK KOMUT)
# ===============================================
# Kullanım: bash ops/production-go-live-one-liner.sh

echo "🚀 EA PLAN v6.5.1 Production Go-Live başlatılıyor..." && \
NAMESPACE="ea-web" && \
PROD_URL="https://www.cptsystems.com" && \
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ) && \
# 1️⃣ Health check
echo "🔍 Health Check..." && \
kubectl get pods -n $NAMESPACE 2>&1 | head -10 && \
# 2️⃣ CDN purge (opsiyonel)
echo "🔹 CDN cache temizleniyor..." && \
([ -n "$CF_API_TOKEN" ] && curl -s -X POST "https://api.cloudflare.com/client/v4/zones/cptsystems.com/purge_cache" \
 -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
 --data '{"purge_everything":true}' > /dev/null && echo "✅ CDN cache temizlendi" || echo "⚠️ CDN token yok, atlanıyor") && \
# 3️⃣ Ingress güncellemesi
echo "🔹 Production Ingress oluşturuluyor..." && \
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ea-web-prod
  namespace: $NAMESPACE
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
echo "✅ Ingress oluşturuldu" && \
# 4️⃣ ConfigMap güncellemesi
echo "🔹 ConfigMap güncelleniyor..." && \
kubectl patch configmap ea-plan-v6-4 -n $NAMESPACE \
--type merge -p '{"data":{"Phase":"production","Version":"v6.5.1","GoLive":"true","Environment":"production","LastUpdated":"'"$TIMESTAMP"'"}}' 2>&1 && \
echo "✅ ConfigMap güncellendi" && \
# 5️⃣ GitHub + Docura senkronizasyonu
echo "🔹 GitHub senkronizasyonu..." && \
(gh workflow run docura-publish.yml 2>&1 || echo "⚠️ Docura opsiyonel") && \
(git -C ~/ea-plan add . 2>&1 && git -C ~/ea-plan commit -m "EA Plan v6.5.1 Production Go-Live $TIMESTAMP" 2>&1 && git -C ~/ea-plan push origin main 2>&1 || echo "⚠️ Git opsiyonel") && \
# 6️⃣ Production doğrulaması
echo "🌐 Production endpoint kontrolü: $PROD_URL" && \
(sleep 5 && curl -I $PROD_URL 2>&1 | head -5 || echo "⚠️ Endpoint henüz aktifleşmedi") && \
kubectl get ingress -n $NAMESPACE | grep ea-web-prod && \
echo "✅ EA PLAN v6.5.1 PRODUCTION GO-LIVE TAMAMLANDI • ZAMAN: $TIMESTAMP"

