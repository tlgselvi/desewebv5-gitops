---
alwaysApply: true
priority: critical
globs:
  - "**/*.ts"
  - "**/*.tsx"
version: 6.7.0
lastUpdated: 2025-11-03
---

# 🤖 AI Asistanı için Özel Direktifler

> **ÖNEMLİ:** Cursor AI asistanı kod önerirken ve üretirken **MUTLAKA** aşağıdaki kurallara uymalıdır:

## Zorunlu Kurallar

### 1. Path Aliases
**HER ZAMAN** `@/` prefix'ini kullanın

✅ **Doğru:**
```typescript
import { config } from '@/config/index.js';
import { db } from '@/db/index.js';
import { logger } from '@/utils/logger.js';
```

❌ **Yanlış:**
```typescript
import { config } from '../../config/index.js';
import { db } from '../db/index.js';
```

### 2. Type Safety
**ASLA** `any` tipi önermeyin

✅ **Doğru:**
```typescript
async function getUserById(id: string): Promise<User | null> {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  return user ?? null;
}
```

❌ **Yanlış:**
```typescript
async function getUser(id: any) {
  return await db.query.users.findFirst({ where: eq(users.id, id) });
}
```

### 3. Logging
**ASLA** `console.log` önermeyin, **HER ZAMAN** `logger` kullanın

✅ **Doğru:**
```typescript
logger.info('User created', { userId: user.id, email: user.email });
logger.error('Failed to process', { error: error.message, context });
```

❌ **Yanlış:**
```typescript
console.log('User created:', user);
console.error('Error:', error);
```

### 4. Error Handling
**HER async fonksiyonda** try-catch kullanın

✅ **Doğru:**
```typescript
async function fetchData(id: string) {
  try {
    const data = await db.query.findById(id);
    return data;
  } catch (error) {
    logger.error('Failed to fetch data', { id, error });
    throw error;
  }
}
```

❌ **Yanlış:**
```typescript
async function fetchData(id: string) {
  const data = await db.query.findById(id);
  return data;
}
```

### 5. Database Queries
**ASLA** raw SQL önermeyin, **HER ZAMAN** Drizzle ORM kullanın

✅ **Doğru:**
```typescript
const user = await db.query.users.findFirst({
  where: eq(users.id, id),
});
```

❌ **Yanlış:**
```typescript
const user = await db.query(`SELECT * FROM users WHERE id = '${id}'`);
```

## Dosya Yapısı Kuralları

AI asistanı yeni dosya oluştururken şu yapıyı izlemelidir:

- `src/routes/**/*.ts` → Route handlers (Express Router)
- `src/services/**/*.ts` → Business logic
- `src/middleware/**/*.ts` → Express middleware
- `src/db/**/*.ts` → Database schema & connection
- `src/utils/**/*.ts` → Utility functions
- `src/schemas/**/*.ts` → Zod validation schemas

