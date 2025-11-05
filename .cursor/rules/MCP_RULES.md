# 🤖 MCP Server Rules - Dese EA Plan v6.8.0

**Versiyon:** 6.8.0  
**Son Güncelleme:** 2025-01-27

---

## 🎯 MCP Server Kuralları

### MCP Server Yapısı

**4 Adet MCP Server:**
1. **FinBot MCP** (Port 5555) - `/finbot`
2. **MuBot MCP** (Port 5556) - `/mubot`
3. **DESE MCP** (Port 5557) - `/dese`
4. **Observability MCP** (Port 5558) - `/observability`

---

## ✅ Zorunlu Kurallar

### 1. Authentication
- ✅ **HER ZAMAN** `authenticate` middleware kullanılmalı
- ✅ JWT token validation zorunlu
- ✅ RBAC permission check zorunlu

### 2. Gerçek API Entegrasyonu
- ✅ **ASLA** mock data döndürmeyin
- ✅ Gerçek backend API'lerine bağlanmalı
- ✅ Error handling zorunlu

### 3. Caching
- ✅ Redis cache kullanılmalı
- ✅ Cache TTL: 60 saniye (varsayılan)
- ✅ Cache invalidation stratejisi

### 4. Error Handling
- ✅ `asyncHandler` middleware kullanılmalı
- ✅ Structured logging zorunlu
- ✅ Error'ları log'layın

### 5. Logging
- ✅ `logger` utility kullanın (console.log değil)
- ✅ Structured logging (JSON format)
- ✅ Context bilgisi eklenmeli

---

## 📋 Kod Örneği

```typescript
// ✅ Doğru MCP Server Yapısı
import express, { Request, Response } from 'express';
import { logger } from '@/utils/logger.js';
import { authenticate } from '@/middleware/auth.js';
import { withAuth } from '@/rbac/decorators.js';
import { redis } from '@/services/storage/redisClient.js';
import { asyncHandler } from '@/middleware/errorHandler.js';

const app = express();
const PORT = process.env.MCP_PORT || 5555;

app.use(express.json());
app.use(authenticate); // ZORUNLU!

// Health check endpoint
app.get('/finbot/health', async (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'finbot-mcp',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Query endpoint (cache ile)
app.post('/finbot/query',
  ...withAuth('mcp.finbot.query', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { query, context } = req.body;
    
    // Cache kontrolü
    const cacheKey = `mcp:finbot:query:${JSON.stringify(req.body)}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    // Gerçek API çağrısı (mock değil!)
    const finbotResponse = await fetch(`${FINBOT_BASE}/api/v1/accounts`);
    const accounts = await finbotResponse.json();
    
    const result = {
      query,
      response: {
        module: 'finbot',
        context: { accounts },
      },
    };
    
    // Cache'e kaydet (60 saniye TTL)
    await redis.setex(cacheKey, 60, JSON.stringify(result));
    
    logger.info('MCP query processed', { module: 'finbot', query });
    res.json(result);
  })
);

export default app;
```

---

## ❌ YAPILMAMASI GEREKENLER

1. ❌ **Mock data döndürmeyin** - Gerçek API çağrıları yapın
2. ❌ **Authentication eksik** - Her zaman auth ekleyin
3. ❌ **console.log kullanmayın** - Logger utility kullanın
4. ❌ **Raw SQL queries** - Drizzle ORM kullanın
5. ❌ **Unhandled promises** - Her zaman handle edin

---

## 📚 Referanslar

- `.cursorrules` - Ana rules dosyası
- `src/mcp/finbot-server.ts` - FinBot MCP örneği
- `MCP_KAPSAMLI_ANALIZ_VE_PLAN.md` - MCP planları
- `MCP_GERCEK_DURUM.md` - MCP gerçek durum

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 6.8.0

