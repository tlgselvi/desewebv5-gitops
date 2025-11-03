---
alwaysApply: true
priority: high
globs:
  - "src/routes/**/*.ts"
  - "src/services/**/*.ts"
  - "src/middleware/**/*.ts"
  - "src/db/**/*.ts"
  - "src/utils/**/*.ts"
  - "src/schemas/**/*.ts"
version: 6.7.0
lastUpdated: 2025-11-03
---

# 📁 Dosya/Glob Bazlı Kurallar

## `src/routes/**/*.ts` - Route Handlers

Route dosyaları Express Router kullanmalı ve şu yapıya uymalıdır:

```typescript
// ✅ Doğru Route Yapısı
import { Router } from 'express';
import { z } from 'zod';
import { logger } from '@/utils/logger.js';
import { exampleService } from '@/services/exampleService.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

/**
 * @swagger
 * /api/v1/example:
 *   post:
 *     summary: Create example
 */
router.post('/', async (req, res, next) => {
  try {
    const validated = createSchema.parse(req.body);
    const result = await exampleService.create(validated);
    logger.info('Resource created', { id: result.id });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export { router as exampleRoutes };
```

**Kurallar:**
- ✅ Router export edilmeli
- ✅ Zod validation şeması tanımlı
- ✅ Service katmanı kullanılmalı (direct DB access ❌)
- ✅ Swagger annotations eklenmeli
- ✅ Error handling middleware'e gönderilmeli

## `src/services/**/*.ts` - Business Logic

Service dosyaları business logic içermeli:

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

**Kurallar:**
- ✅ Business logic burada olmalı
- ✅ Drizzle ORM kullanılmalı
- ✅ Error handling ve logging zorunlu
- ✅ Type safety sağlanmalı

## `src/middleware/**/*.ts` - Express Middleware

Middleware dosyaları standard Express signature kullanmalı:

```typescript
// ✅ Doğru Middleware Yapısı
import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger.js';

export function customMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Middleware logic
    logger.debug('Middleware executed', { path: req.path });
    next();
  } catch (error) {
    logger.error('Middleware error', { error });
    next(error);
  }
}
```

**Kurallar:**
- ✅ Standard Express middleware signature
- ✅ Error handling zorunlu
- ✅ Logging eklenmeli

## `src/db/**/*.ts` - Database Schema

Schema dosyaları Drizzle ORM syntax kullanmalı:

```typescript
// ✅ Doğru Schema Yapısı
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Kurallar:**
- ✅ Drizzle ORM schema syntax kullanılmalı
- ✅ Indexes ve constraints tanımlanmalı
- ✅ Relations doğru kurulmalı

