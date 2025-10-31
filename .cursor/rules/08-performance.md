---
alwaysApply: true
priority: medium
globs:
  - "src/**/*.ts"
version: 5.0.0
lastUpdated: 2025-01-27
---

# 🚀 Performance Kuralları

## Async Operations

```typescript
// ✅ Doğru - Parallel execution
const [users, posts, comments] = await Promise.all([
  getUserById(id),
  getPostsByUserId(id),
  getCommentsByUserId(id),
]);

// ❌ YANLIŞ - Sequential execution
const users = await getUserById(id);      // ❌ Slow
const posts = await getPostsByUserId(id); // ❌ Slow
const comments = await getCommentsByUserId(id); // ❌ Slow
```

## Database Optimization

```typescript
// ✅ Doğru - Select only needed fields
const projects = await db.query.seoProjects.findMany({
  where: eq(seoProjects.status, 'active'),
  columns: {
    id: true,
    name: true,
    domain: true,
  },
  limit: 100,
});

// ❌ YANLIŞ - Select all fields
const projects = await db.query.seoProjects.findMany(); // ❌ Too much data
```

## Caching

```typescript
// ✅ Doğru - Redis caching
import { redis } from '@/services/storage/redisClient.js';

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

## Connection Pooling

```typescript
// ✅ Doğru - Connection pooling (Drizzle ORM otomatik yapar)
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = config.database.url;
const client = postgres(connectionString, {
  max: 10, // Connection pool size
});

export const db = drizzle(client, { schema });
```

