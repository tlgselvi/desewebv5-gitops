# 📐 Kod Standartları ve Best Practices

Bu dokümantasyon, Dese EA Plan v5.0 projesi için kod standartlarını ve en iyi uygulamaları tanımlar.

## 📋 İçindekiler

1. [TypeScript Standartları](#typescript-standartları)
2. [Kod Organizasyonu](#kod-organizasyonu)
3. [Naming Conventions](#naming-conventions)
4. [Error Handling](#error-handling)
5. [Logging](#logging)
6. [Testing Standards](#testing-standards)
7. [Security Guidelines](#security-guidelines)
8. [Performance](#performance)

---

## 💻 TypeScript Standartları

### Type Safety

```typescript
// ✅ İyi - Explicit types
function getUser(id: string): Promise<User | null> {
  // ...
}

// ❌ Kötü - Implicit any
function getUser(id) {
  // ...
}
```

### Path Aliases

Her zaman `@/` prefix'ini kullanın:

```typescript
// ✅ İyi
import { config } from '@/config/index.js';
import { db } from '@/db/index.js';
import { logger } from '@/utils/logger.js';

// ❌ Kötü
import { config } from '../../config/index.js';
```

### Type Definitions

```typescript
// ✅ İyi - Interface kullan
interface User {
  id: string;
  email: string;
  role: UserRole;
}

// ✅ İyi - Type alias kullan
type UserRole = 'admin' | 'user' | 'guest';

// ❌ Kötü - any kullanma
function process(data: any) {
  // ...
}
```

### Strict Mode (Kademeli Geçiş)

Şu anda strict mode kapalı ama açılması hedefleniyor. Yeni kod yazarken strict mode'a uyumlu yazın:

```typescript
// ✅ İyi - Null safety
const user = await getUser(id);
if (!user) {
  throw new Error('User not found');
}

// ❌ Kötü - Null check yok
const user = await getUser(id);
user.email; // Potansiyel null reference
```

---

## 📁 Kod Organizasyonu

### Dosya Yapısı

```
src/
├── config/           # Configuration files
│   └── index.ts      # Main config export
├── db/               # Database
│   ├── index.ts      # DB connection
│   └── schema.ts     # Drizzle schema
├── middleware/       # Express middleware
│   ├── errorHandler.ts
│   ├── requestLogger.ts
│   └── prometheus.ts
├── routes/           # API routes
│   ├── index.ts      # Route setup
│   ├── health.ts
│   └── seo.ts
├── services/         # Business logic
│   ├── seoAnalyzer.ts
│   └── contentGenerator.ts
├── schemas/          # Zod validation
│   └── feedback.ts
└── utils/            # Utilities
    ├── logger.ts
    └── gracefulShutdown.ts
```

### Module Exports

```typescript
// ✅ İyi - Named exports
export function calculateScore() { }
export const DEFAULT_CONFIG = { };

// ✅ İyi - Default export (sadece gerekirse)
export default router;

// ❌ Kötü - Karışık kullanım
export function func1() { }
export default class MyClass { }
```

---

## 🏷️ Naming Conventions

### Variables & Functions

```typescript
// ✅ camelCase
const userName = 'john';
function getUserById() { }

// ❌ snake_case veya PascalCase
const user_name = 'john';  // ❌
function GetUserById() { } // ❌
```

### Classes & Interfaces

```typescript
// ✅ PascalCase
class UserService { }
interface SeoAnalysis { }

// ❌ camelCase
class userService { }  // ❌
```

### Constants

```typescript
// ✅ UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT = 5000;

// ✅ Object constants
const CONFIG = {
  API_URL: 'https://api.example.com',
  TIMEOUT: 5000,
} as const;
```

### Files & Directories

```
✅ kebab-case
- seo-analyzer.ts
- content-generator.ts
- request-logger.ts

❌ camelCase veya PascalCase
- seoAnalyzer.ts
- ContentGenerator.ts
```

---

## ⚠️ Error Handling

### Try-Catch Blocks

```typescript
// ✅ İyi - Specific error handling
async function fetchData(id: string) {
  try {
    const data = await db.query.findById(id);
    if (!data) {
      throw new NotFoundError(`Data with id ${id} not found`);
    }
    return data;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error; // Re-throw known errors
    }
    logger.error('Failed to fetch data', { id, error });
    throw new InternalServerError('Failed to fetch data');
  }
}
```

### Custom Error Classes

```typescript
// ✅ İyi - Custom error types
export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string, public details: any) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### Error Response Format

```typescript
// ✅ İyi - Consistent error format
{
  error: 'Validation Error',
  message: 'Invalid input',
  details: {
    field: 'email',
    issue: 'Must be a valid email address'
  },
  timestamp: '2025-01-27T10:00:00Z'
}
```

---

## 📝 Logging

### Logger Usage

```typescript
// ✅ İyi - Structured logging
logger.info('User created', {
  userId: user.id,
  email: user.email,
  timestamp: new Date().toISOString(),
});

logger.error('Failed to process payment', {
  orderId,
  error: error.message,
  stack: error.stack,
});

// ❌ Kötü - console.log
console.log('User created', user); // ❌
console.error('Error:', error); // ❌
```

### Log Levels

```typescript
// Debug - Development için detaylı bilgi
logger.debug('Processing request', { data });

// Info - Normal işlemler
logger.info('User logged in', { userId });

// Warn - Potansiyel sorunlar
logger.warn('Rate limit approaching', { userId, count });

// Error - Hata durumları
logger.error('Database connection failed', { error });
```

---

## 🧪 Testing Standards

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('UserService', () => {
  beforeEach(() => {
    // Setup
  });

  describe('getUserById', () => {
    it('should return user when exists', async () => {
      // Arrange
      const userId = '123';
      
      // Act
      const user = await getUserById(userId);
      
      // Assert
      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
    });

    it('should return null when not exists', async () => {
      // Arrange
      const userId = 'nonexistent';
      
      // Act
      const user = await getUserById(userId);
      
      // Assert
      expect(user).toBeNull();
    });
  });
});
```

### Test Naming

```typescript
// ✅ İyi - Descriptive test names
it('should throw NotFoundError when user does not exist', () => { });
it('should return user with correct email format', () => { });

// ❌ Kötü - Vague names
it('test 1', () => { });
it('works', () => { });
```

---

## 🔒 Security Guidelines

### Input Validation

```typescript
// ✅ İyi - Zod validation
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['user', 'admin']),
});

export async function createUser(data: unknown) {
  const validated = createUserSchema.parse(data); // Throws if invalid
  // ...
}
```

### SQL Injection Prevention

```typescript
// ✅ İyi - Drizzle ORM (parametrized queries)
import { eq } from 'drizzle-orm';
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
});

// ❌ Kötü - Raw SQL (asla kullanmayın)
const user = await db.query(`SELECT * FROM users WHERE id = '${userId}'`); // ❌
```

### Authentication

```typescript
// ✅ İyi - JWT verification
import { verify } from 'jsonwebtoken';

export async function authenticateToken(token: string) {
  try {
    const decoded = verify(token, config.security.jwtSecret);
    return decoded;
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
}
```

---

## ⚡ Performance

### Async/Await

```typescript
// ✅ İyi - Proper async/await
async function processUsers(userIds: string[]) {
  const users = await Promise.all(
    userIds.map(id => getUserById(id))
  );
  return users;
}

// ❌ Kötü - Sequential awaits
async function processUsers(userIds: string[]) {
  const users = [];
  for (const id of userIds) {
    const user = await getUserById(id); // ❌ Slow
    users.push(user);
  }
  return users;
}
```

### Caching

```typescript
// ✅ İyi - Redis caching
async function getSeoMetrics(projectId: string) {
  const cacheKey = `seo:metrics:${projectId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const metrics = await calculateMetrics(projectId);
  await redis.setex(cacheKey, 3600, JSON.stringify(metrics));
  return metrics;
}
```

### Database Queries

```typescript
// ✅ İyi - Indexed queries, select only needed fields
const projects = await db.query.seoProjects.findMany({
  where: eq(seoProjects.status, 'active'),
  columns: {
    id: true,
    name: true,
    domain: true,
  },
  limit: 100,
});

// ❌ Kötü - Full table scan, all columns
const projects = await db.query(`SELECT * FROM seo_projects`); // ❌
```

---

## 📚 Code Comments

### When to Comment

```typescript
// ✅ İyi - Complex logic explanation
// Calculate weighted score using exponential decay:
// score = baseScore * e^(-decay * daysSinceUpdate)
const score = baseScore * Math.exp(-decay * daysSinceUpdate);

// ✅ İyi - Business rule explanation
// Minimum DR threshold: 50
// Maximum spam score: 5%
// These values are based on industry standards
const isValidTarget = domainRating >= 50 && spamScore <= 5;

// ❌ Kötü - Obvious comments
const name = 'John'; // Set name to John
```

### JSDoc for Public APIs

```typescript
/**
 * Analyzes SEO metrics for a given URL using Lighthouse and Core Web Vitals
 * 
 * @param url - The URL to analyze (must be publicly accessible)
 * @param options - Analysis options
 * @param options.includeLighthouse - Whether to run Lighthouse analysis
 * @param options.includeCoreWebVitals - Whether to measure Core Web Vitals
 * @returns Promise resolving to comprehensive SEO analysis results
 * @throws {ValidationError} If URL is invalid or unreachable
 * 
 * @example
 * ```typescript
 * const analysis = await analyzeSeo('https://example.com', {
 *   includeLighthouse: true,
 *   includeCoreWebVitals: true,
 * });
 * ```
 */
export async function analyzeSeo(
  url: string,
  options?: AnalysisOptions
): Promise<SeoAnalysis> {
  // Implementation
}
```

---

## ✅ Checklist

Kod yazarken şunları kontrol edin:

- [ ] TypeScript types tanımlı
- [ ] Error handling var
- [ ] Input validation yapıldı (Zod)
- [ ] Logging eklendi (logger kullanıldı)
- [ ] Unit testler yazıldı
- [ ] JSDoc comments eklendi (public APIs için)
- [ ] Path aliases kullanıldı (`@/`)
- [ ] Naming conventions'a uyuldu
- [ ] SQL injection koruması var (Drizzle ORM)
- [ ] Async/await doğru kullanıldı

---

**Son Güncelleme**: 2025-01-27  
**Versiyon**: 5.0.0

