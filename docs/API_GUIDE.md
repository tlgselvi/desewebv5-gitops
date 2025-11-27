# API Development Guide - DESE EA PLAN v7.0

**Version:** 7.0.0  
**Last Updated:** 2025-01-27

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Module Structure](#module-structure)
3. [Creating a New Endpoint](#creating-a-new-endpoint)
4. [Authentication & Authorization](#authentication--authorization)
5. [Multi-tenancy & RLS](#multi-tenancy--rls)
6. [Request/Response Patterns](#requestresponse-patterns)
7. [Error Handling](#error-handling)
8. [Validation](#validation)
9. [Swagger Documentation](#swagger-documentation)
10. [Best Practices](#best-practices)

---

## Overview

The DESE EA PLAN v7.0 backend follows a **Modular Monolith** architecture with **Domain-Driven Design (DDD)** principles. Each business domain (Finance, CRM, Inventory, HR, IoT, etc.) is organized as a separate module with clear boundaries.

### Tech Stack
- **Framework:** Express.js 5
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL 16 with Drizzle ORM
- **Authentication:** JWT (Bearer tokens)
- **Authorization:** Module-based RBAC (Role-Based Access Control)
- **Multi-tenancy:** Row-Level Security (RLS) with `organization_id` isolation

---

## Module Structure

Each module follows this structure:

```
src/modules/{module_name}/
├── routes.ts          # Express route definitions
├── controller.ts      # HTTP request/response handling
├── service.ts         # Business logic (domain layer)
└── __tests__/         # Unit tests (optional)
    └── service.test.ts
```

### Example: Finance Module

```typescript
// src/modules/finance/routes.ts
import { Router } from 'express';
import { financeController } from './controller.js';
import { authenticate } from '@/middleware/auth.js';
import { requireModulePermission } from '@/middleware/rbac.js';
import { setRLSContextMiddleware } from '@/middleware/rls.js';

const router = Router();

// Apply middleware to all routes
router.use(authenticate);
router.use(setRLSContextMiddleware);
router.use(requireModulePermission('finance', 'read'));

// Define routes
router.post('/invoices', 
  requireModulePermission('finance', 'write'), 
  (req, res) => financeController.createInvoice(req, res)
);

export const financeRoutes: Router = router;
```

---

## Creating a New Endpoint

### Step 1: Define the Route

Add your route in `src/modules/{module}/routes.ts`:

```typescript
/**
 * @swagger
 * /api/v1/{module}/resource:
 *   post:
 *     summary: Create a new resource
 *     tags: [{Module}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateResourceDTO'
 *     responses:
 *       201:
 *         description: Resource created successfully
 */
router.post('/resource', 
  requireModulePermission('{module}', 'write'),
  (req, res) => controller.createResource(req, res)
);
```

### Step 2: Implement the Controller

In `src/modules/{module}/controller.ts`:

```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { moduleService } from './service.js';

export class ModuleController {
  async createResource(req: Request, res: Response) {
    try {
      // 1. Validate input
      const schema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      });
      const data = schema.parse(req.body);

      // 2. Get organization context
      const organizationId = (req.user as any)?.organizationId;
      const userId = (req.user as any)?.id;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      // 3. Call service layer
      const result = await moduleService.createResource(
        organizationId,
        userId,
        data
      );

      // 4. Return response
      return res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
```

### Step 3: Implement the Service

In `src/modules/{module}/service.ts`:

```typescript
import { db } from '@/db/index.js';
import { resources } from '@/db/schema/{module}.js';
import { eq, and } from 'drizzle-orm';

export class ModuleService {
  async createResource(
    organizationId: string,
    userId: string,
    data: { name: string; description?: string }
  ) {
    // Business logic here
    // RLS is automatically applied via middleware
    
    const [resource] = await db
      .insert(resources)
      .values({
        organizationId, // REQUIRED for multi-tenancy
        name: data.name,
        description: data.description,
        createdBy: userId,
      })
      .returning();

    return resource;
  }

  async getResources(organizationId: string) {
    // RLS ensures only organization's data is returned
    return await db
      .select()
      .from(resources)
      .where(eq(resources.organizationId, organizationId));
  }
}
```

### Step 4: Register the Route

In `src/routes/index.ts`:

```typescript
import { moduleRoutes } from '../modules/{module}/routes.js';

export function setupRoutes(app: Application): void {
  const apiPrefix = `/api/${config.apiVersion}`;
  
  // ... other routes ...
  app.use(`${apiPrefix}/{module}`, moduleRoutes);
}
```

---

## Authentication & Authorization

### Authentication

All protected routes require JWT authentication via the `authenticate` middleware:

```typescript
router.use(authenticate);
```

The JWT token must be sent in the `Authorization` header:
```
Authorization: Bearer <token>
```

### Authorization (RBAC)

The system uses **module-based RBAC** with three permission levels:

- **`read`**: View/list resources
- **`write`**: Create/update resources
- **`delete`**: Delete resources

#### Module-Level Permission

Apply to all routes in a module:

```typescript
router.use(requireModulePermission('finance', 'read'));
```

#### Route-Level Permission

Override for specific routes:

```typescript
router.post('/invoices', 
  requireModulePermission('finance', 'write'), // Override: requires 'write'
  controller.createInvoice
);
```

#### Available Modules

- `finance` - Finance & Accounting
- `crm` - Customer Relationship Management
- `inventory` - Inventory & Stock Management
- `hr` - Human Resources
- `iot` - IoT Device Management
- `saas` - SaaS & Organization Management
- `seo` - SEO Management
- `service` - Service Management

---

## Multi-tenancy & RLS

### Organization ID

Every request must include the user's `organizationId` (automatically set by `authenticate` middleware from JWT).

### Row-Level Security (RLS)

PostgreSQL RLS policies automatically filter data by `organization_id`. The `setRLSContextMiddleware` sets session variables:

```typescript
router.use(setRLSContextMiddleware);
```

This middleware:
1. Sets `app.current_organization_id` from JWT
2. Sets `app.current_user_id` from JWT
3. Sets `app.current_user_role` from JWT

**Important:** Always include `organizationId` in:
- Database inserts
- Service method parameters
- Query filters

---

## Request/Response Patterns

### Standard Response Format

```typescript
// Success (200/201)
{
  "id": "uuid",
  "name": "Resource Name",
  "createdAt": "2025-01-27T10:00:00Z"
}

// Error (400/500)
{
  "error": "Error message",
  "details": [...] // Optional: validation errors
}
```

### Pagination

For list endpoints, use query parameters:

```
GET /api/v1/{module}/resources?page=1&limit=20&sortBy=name&sortOrder=asc
```

Response:

```typescript
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Error Handling

### Use `asyncHandler` for Async Routes

```typescript
import { asyncHandler } from '@/middleware/errorHandler.js';

router.get('/resource/:id', 
  asyncHandler(async (req: Request, res: Response) => {
    // Your async code here
    const resource = await service.getResource(req.params.id);
    res.json(resource);
  })
);
```

### Custom Errors

```typescript
import { CustomError } from '@/middleware/errorHandler.js';

throw new CustomError('Resource not found', 404);
```

### Error Response Format

```typescript
{
  "error": "Error message",
  "statusCode": 404,
  "details": {} // Optional
}
```

---

## Validation

### Use Zod for Input Validation

```typescript
import { z } from 'zod';

const CreateResourceSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  age: z.number().int().min(0).max(150),
});

// In controller
const data = CreateResourceSchema.parse(req.body);
```

### Validation Error Response

```typescript
{
  "error": "Validation error",
  "details": [
    {
      "path": ["name"],
      "message": "String must contain at least 1 character(s)"
    }
  ]
}
```

---

## Swagger Documentation

### Add Swagger Comments

```typescript
/**
 * @swagger
 * /api/v1/{module}/resource:
 *   post:
 *     summary: Create a new resource
 *     tags: [{Module}]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateResourceDTO'
 *     responses:
 *       201:
 *         description: Resource created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resource'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
```

### Define Schemas

```typescript
/**
 * @swagger
 * components:
 *   schemas:
 *     Resource:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *     CreateResourceDTO:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 */
```

Access Swagger UI at: `http://localhost:3000/api-docs`

---

## Best Practices

### 1. **Service Layer First**
- Keep business logic in `service.ts`, not in controllers
- Controllers should only handle HTTP concerns (request/response)

### 2. **Always Include Organization ID**
- Every service method must accept `organizationId`
- Every database insert must include `organizationId`

### 3. **Use TypeScript Strictly**
- Avoid `any` type
- Define interfaces for request/response types
- Use Zod schemas for runtime validation

### 4. **Error Handling**
- Use `asyncHandler` for async routes
- Return appropriate HTTP status codes
- Log errors with context

### 5. **Logging**
- Use `logger` utility, not `console.log`
- Include context (userId, organizationId, etc.)

```typescript
import { logger } from '@/utils/logger.js';

logger.info('Resource created', {
  resourceId: resource.id,
  organizationId,
  userId,
});
```

### 6. **Testing**
- Write unit tests for service layer
- Test business logic, not HTTP details
- Use test database for integration tests

### 7. **Database Queries**
- Use Drizzle ORM, avoid raw SQL when possible
- Always filter by `organizationId` (RLS helps, but be explicit)
- Use transactions for multi-step operations

### 8. **Performance**
- Use database indexes for frequently queried fields
- Implement pagination for list endpoints
- Use Redis cache for expensive operations

---

## Example: Complete Module

See `src/modules/finance/` for a complete example with:
- Routes with authentication and RBAC
- Controller with validation
- Service with business logic
- Swagger documentation
- Error handling

---

## Questions?

- Check existing modules for patterns
- Review `src/middleware/` for available middleware
- See `src/db/schema/` for database schema examples
- Read `ARCHITECTURE.md` for system overview

