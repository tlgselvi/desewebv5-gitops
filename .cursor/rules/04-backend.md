---
alwaysApply: false
priority: high
globs:
  - "src/routes/**/*.ts"
  - "src/services/**/*.ts"
  - "src/middleware/**/*.ts"
version: 5.0.0
lastUpdated: 2025-01-27
---

# 🔧 Backend Kuralları (Node.js + Express)

## API Endpoint Yapısı

```typescript
// ✅ Doğru Endpoint Yapısı
import { Router } from 'express';
import { z } from 'zod';
import { logger } from '@/utils/logger.js';
import { exampleService } from '@/services/exampleService.js';

const router = Router();

const createExampleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  value: z.number().positive('Value must be positive'),
});

/**
 * @swagger
 * /api/v1/example:
 *   post:
 *     summary: Create a new example
 *     tags: [Examples]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               value:
 *                 type: number
 *     responses:
 *       201:
 *         description: Example created successfully
 */
router.post('/', async (req, res, next) => {
  try {
    const validated = createExampleSchema.parse(req.body);
    const result = await exampleService.create(validated);
    
    logger.info('Example created', { 
      id: result.id,
      name: validated.name,
    });
    
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export { router as exampleRoutes };
```

## Health Check Endpoints

Health check endpoint'leri database ve Redis kontrolü yapmalı:

```typescript
// ✅ Doğru Health Check
router.get('/health', async (req, res) => {
  try {
    const dbStatus = await checkDatabaseConnection();
    const redisStatus = await checkRedisConnection();
    const allHealthy = dbStatus && redisStatus;
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      database: dbStatus,
      redis: redisStatus,
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({ status: 'unhealthy' });
  }
});
```

