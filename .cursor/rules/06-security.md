---
alwaysApply: true
priority: critical
globs:
  - "src/**/*.ts"
version: 5.0.0
lastUpdated: 2025-01-27
---

# 🔒 Security Kuralları

## Input Validation

```typescript
// ✅ Doğru Validation
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number'),
});

export async function createUser(data: unknown) {
  const validated = createUserSchema.parse(data); // Throws if invalid
  // Process validated data
}
```

## SQL Injection Prevention

```typescript
// ✅ Doğru - Drizzle ORM (Type-safe, SQL injection proof)
import { eq } from 'drizzle-orm';

const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
});

// ❌ YANLIŞ - Raw SQL (NEVER DO THIS)
// const user = await db.query(`SELECT * FROM users WHERE id = '${userId}'`);
```

## Authentication & Authorization

```typescript
// ✅ Doğru - JWT Verification
import { verify } from 'jsonwebtoken';
import { config } from '@/config/index.js';

export async function authenticateToken(token: string) {
  try {
    const decoded = verify(token, config.security.jwtSecret);
    return decoded;
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
}
```

## Secrets Management

✅ **Doğru:**
- Environment variables kullanın
- `.env` dosyasını `.gitignore`'a ekleyin
- Production'da Kubernetes Secrets kullanın

❌ **Yanlış:**
- Hardcoded passwords/secrets
- Secrets'ları kod içine yazmak
- `.env` dosyasını commit etmek

