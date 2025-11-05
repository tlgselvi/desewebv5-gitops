# 🔧 Backend Rules - Dese EA Plan v6.8.0

**Versiyon:** 6.8.0  
**Tech Stack:** Node.js + Express + PostgreSQL (Drizzle ORM)

---

## ✅ API Endpoint Kuralları

### 1. Route Yapısı
- ✅ Router export edilmeli
- ✅ Zod validation şeması tanımlı
- ✅ Service katmanı kullanılmalı
- ✅ `asyncHandler` kullanılmalı

```typescript
// ✅ Doğru Route Yapısı
import { Router } from 'express';
import { z } from 'zod';
import { logger } from '@/utils/logger.js';
import { exampleService } from '@/services/exampleService.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { withAuth } from '@/rbac/decorators.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  value: z.number().positive('Value must be positive'),
});

router.post('/',
  ...withAuth('example.create', 'write'),
  asyncHandler(async (req, res) => {
    const validated = createSchema.parse(req.body);
    const result = await exampleService.create(validated);
    
    logger.info('Example created', { id: result.id });
    res.status(201).json(result);
  })
);

export { router as exampleRoutes };
```

### 2. Service Katmanı
- ✅ Business logic service katmanında
- ✅ Drizzle ORM kullanılmalı
- ✅ Error handling ve logging zorunlu

```typescript
// ✅ Doğru Service Yapısı
import { db } from '@/db/index.js';
import { users } from '@/db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';

export const userService = {
  async findById(id: string): Promise<User | null> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      return user ?? null;
    } catch (error) {
      logger.error('Failed to find user', { id, error });
      throw error;
    }
  },
};
```

---

## 🔒 Security Kuralları

### Input Validation
- ✅ Zod schemas kullanın
- ✅ API endpoints'de validation

### SQL Injection Prevention
- ✅ Drizzle ORM kullanın (type-safe, SQL injection proof)
- ❌ Raw SQL queries kullanmayın

---

## 📚 Referanslar

- `.cursorrules` - Ana rules dosyası
- `DESE_JARVIS_CONTEXT.md` - Proje context

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 6.8.0

