---
alwaysApply: true
priority: high
globs:
  - "src/**/*.ts"
version: 6.7.0
lastUpdated: 2025-11-03
---

# 📊 Logging Kuralları

## Structured Logging

```typescript
// ✅ Doğru Logging
import { logger } from '@/utils/logger.js';

logger.info('User created', {
  userId: user.id,
  email: user.email,
  timestamp: new Date().toISOString(),
  action: 'create_user',
});

logger.error('Failed to process payment', {
  orderId,
  userId,
  error: error.message,
  stack: error.stack,
  context: { amount, currency },
});

// ❌ YANLIŞ
console.log('User created:', user); // ❌ Never use console.log
console.error('Error:', error);     // ❌ Never use console.error
```

**Kurallar:**
- ✅ Structured logging (JSON format)
- ✅ Context bilgisi eklenmeli
- ✅ Sensitive data log'lanmamalı (passwords, tokens, credit cards)
- ✅ Log levels: `debug`, `info`, `warn`, `error`

## Log Levels Kullanımı

```typescript
// Debug - Development için detaylı bilgi
logger.debug('Processing request', { data, headers });

// Info - Normal işlemler
logger.info('User logged in', { userId, timestamp });

// Warn - Potansiyel sorunlar
logger.warn('Rate limit approaching', { userId, count });

// Error - Hata durumları
logger.error('Database connection failed', { error, stack });
```

