# 🔐 Production Environment Variables Checklist - v6.8.2

**Version:** 6.8.2  
**Last Update:** 2025-01-27

---

## ✅ Kritik Environment Variables (Zorunlu)

### Security (MUTLAKA DEĞİŞTİR!)

- [ ] `JWT_SECRET` - Güçlü, benzersiz, min 32 karakter
- [ ] `COOKIE_KEY` - Güçlü, benzersiz, min 32 karakter (Passport.js session için)
- [ ] `DB_PASSWORD` - Güçlü database şifresi
- [ ] `REDIS_PASSWORD` - Production Redis şifresi (opsiyonel ama önerilir)

### Database

- [ ] `DATABASE_URL` - Production PostgreSQL connection string
- [ ] `DB_HOST` - Production database host
- [ ] `DB_PORT` - Database port (genellikle 5432)
- [ ] `DB_NAME` - Production database adı
- [ ] `DB_USER` - Database kullanıcı adı
- [ ] `DB_PASSWORD` - Database şifresi

### Redis

- [ ] `REDIS_URL` - Production Redis connection string
- [ ] `REDIS_HOST` - Production Redis host
- [ ] `REDIS_PORT` - Redis port (genellikle 6379)
- [ ] `REDIS_PASSWORD` - Redis şifresi (production için önerilir)

### Server Configuration

- [ ] `NODE_ENV=production` - Production modu
- [ ] `PORT=3000` - Backend port
- [ ] `CORS_ORIGIN` - Production frontend URL (örn: `https://dese.ai`)
- [ ] `API_VERSION=v1` - API versiyonu

---

## 🔑 Opsiyonel Environment Variables

### Google OAuth (Eğer kullanılıyorsa)

- [ ] `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- [ ] `GOOGLE_CALLBACK_URL` - Production callback URL (örn: `https://api.dese.ai/api/v1/auth/google/callback`)

### External APIs

- [ ] `OPENAI_API_KEY` - OpenAI API key (opsiyonel)
- [ ] `GOOGLE_SEARCH_CONSOLE_API_KEY` - Google Search Console API key (opsiyonel)
- [ ] `AHREFS_API_KEY` - Ahrefs API key (opsiyonel)
- [ ] `LIGHTHOUSE_CI_TOKEN` - Lighthouse CI token (opsiyonel)

### Monitoring & Observability

- [ ] `PROMETHEUS_ENABLED=true` - Prometheus monitoring
- [ ] `GRAFANA_ENABLED=true` - Grafana visualization
- [ ] `MCP_PROMETHEUS_BASE_URL` - Prometheus base URL
- [ ] `MCP_PROMETHEUS_AUTH_TOKEN` - Prometheus auth token

---

## 📋 Production Environment Variables Template

```env
# ============================================
# PRODUCTION ENVIRONMENT VARIABLES
# Dese EA Plan v6.8.2
# ============================================

# Server Configuration
NODE_ENV=production
PORT=3000
API_VERSION=v1
CORS_ORIGIN=https://dese.ai

# Security (MUTLAKA DEĞİŞTİR!)
JWT_SECRET=your-production-jwt-secret-min-32-chars-change-this
JWT_EXPIRES_IN=24h
COOKIE_KEY=your-production-cookie-key-min-32-chars-change-this
BCRYPT_ROUNDS=12

# Database Configuration
DATABASE_URL=postgresql://user:password@db-host:5432/dese_ea_plan_v5
DB_HOST=db-host
DB_PORT=5432
DB_NAME=dese_ea_plan_v5
DB_USER=user
DB_PASSWORD=password

# Redis Configuration
REDIS_URL=redis://redis-host:6379
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://api.dese.ai/api/v1/auth/google/callback

# External APIs (Opsiyonel)
OPENAI_API_KEY=your-openai-api-key
GOOGLE_SEARCH_CONSOLE_API_KEY=your-google-api-key
AHREFS_API_KEY=your-ahrefs-api-key

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
MCP_PROMETHEUS_BASE_URL=http://prometheus:9090
MCP_PROMETHEUS_AUTH_TOKEN=your-prometheus-token

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

---

## 🔒 Security Best Practices

1. **JWT_SECRET ve COOKIE_KEY:**
   - Minimum 32 karakter
   - Rastgele, güçlü string kullan
   - Production'da asla default değerleri kullanma
   - Her environment için farklı secret kullan

2. **Database Credentials:**
   - Güçlü şifreler kullan
   - Database'e sadece gerekli IP'lerden erişim izni ver
   - SSL/TLS bağlantı kullan (production)

3. **API Keys:**
   - Secrets management sistemi kullan (Kubernetes Secrets, AWS Secrets Manager, vb.)
   - API key'leri asla kod içine gömme
   - Düzenli olarak rotate et

4. **Environment Variables:**
   - `.env` dosyasını Git'e commit etme
   - Production'da environment variables'ı güvenli şekilde yönet
   - Kubernetes Secrets veya benzeri sistemler kullan

---

## ✅ Production Deployment Öncesi Kontrol

- [ ] Tüm kritik environment variables ayarlandı
- [ ] JWT_SECRET ve COOKIE_KEY production için değiştirildi
- [ ] Database connection string test edildi
- [ ] Redis connection test edildi
- [ ] CORS_ORIGIN production domain'e ayarlandı
- [ ] Google OAuth callback URL production domain'e ayarlandı
- [ ] Tüm API keys güvenli şekilde saklanıyor
- [ ] Environment variables secrets management sisteminde saklanıyor

---

## 📚 İlgili Dokümantasyon

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Genel deployment rehberi
- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) - Production checklist
- [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) - Google OAuth kurulumu

