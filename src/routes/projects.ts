import { Router } from 'express';
import { z } from 'zod';
import { db, seoProjects, users } from '@/db/index.js';
import { eq } from 'drizzle-orm';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate, authorize } from '@/middleware/auth.js';
import { logger } from '@/utils/logger.js';
import { logAuditEvent, AuditActions, createAuditEntryFromRequest } from '@/utils/auditLogger.js';

const router = Router();

// All project routes require authentication
router.use(authenticate);

// Validation schemas
const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  domain: z.string().url(),
  targetRegion: z.string().default('Türkiye'),
  primaryKeywords: z.array(z.string()).min(1),
  targetDomainAuthority: z.number().min(0).max(100).default(50),
  targetCtrIncrease: z.number().min(0).max(100).default(25),
  ownerId: z.string().uuid().optional(), // Optional - will use authenticated user if not provided
});

const UpdateProjectSchema = CreateProjectSchema.partial().omit({ ownerId: true });

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Get all SEO projects
 *     tags: [Projects]
 *     parameters:
 *       - in: query
 *         name: ownerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by owner ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, archived]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projects:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SeoProject'
 */
router.get('/', cacheMiddleware({ ttl: 60 }), asyncHandler(async (req, res) => {
  const authenticatedReq = req as import('@/middleware/auth.js').AuthenticatedRequest;
  const { ownerId, status } = req.query;

  // Non-admin users can only see their own projects
  const effectiveOwnerId = authenticatedReq.user?.role === 'admin' 
    ? (ownerId as string | undefined)
    : authenticatedReq.user?.id;

  let query = db
    .select({
      id: seoProjects.id,
      name: seoProjects.name,
      description: seoProjects.description,
      domain: seoProjects.domain,
      targetRegion: seoProjects.targetRegion,
      primaryKeywords: seoProjects.primaryKeywords,
      targetDomainAuthority: seoProjects.targetDomainAuthority,
      targetCtrIncrease: seoProjects.targetCtrIncrease,
      status: seoProjects.status,
      createdAt: seoProjects.createdAt,
      updatedAt: seoProjects.updatedAt,
      owner: {
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      },
    })
    .from(seoProjects)
    .leftJoin(users, eq(seoProjects.ownerId, users.id));

  if (effectiveOwnerId) {
    query = query.where(eq(seoProjects.ownerId, effectiveOwnerId));
  }

  if (status) {
    query = query.where(eq(seoProjects.status, status as string));
  }

  const projects = await query;

  res.json({ projects });
}));

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Project details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SeoProject'
 *       404:
 *         description: Project not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const project = await db
    .select({
      id: seoProjects.id,
      name: seoProjects.name,
      description: seoProjects.description,
      domain: seoProjects.domain,
      targetRegion: seoProjects.targetRegion,
      primaryKeywords: seoProjects.primaryKeywords,
      targetDomainAuthority: seoProjects.targetDomainAuthority,
      targetCtrIncrease: seoProjects.targetCtrIncrease,
      status: seoProjects.status,
      createdAt: seoProjects.createdAt,
      updatedAt: seoProjects.updatedAt,
      owner: {
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      },
    })
    .from(seoProjects)
    .leftJoin(users, eq(seoProjects.ownerId, users.id))
    .where(eq(seoProjects.id, id))
    .limit(1);

  if (project.length === 0) {
    return res.status(404).json({
      error: 'Project not found',
      message: `Project with ID ${id} not found`,
    });
  }

  res.json(project[0]);
}));

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create new project
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - domain
 *               - primaryKeywords
 *               - ownerId
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               domain:
 *                 type: string
 *                 format: uri
 *               targetRegion:
 *                 type: string
 *                 default: Türkiye
 *               primaryKeywords:
 *                 type: array
 *                 items:
 *                   type: string
 *               targetDomainAuthority:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 50
 *               targetCtrIncrease:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 25
 *               ownerId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SeoProject'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Owner not found
 */
router.post('/', asyncHandler(async (req, res) => {
  const authenticatedReq = req as import('@/middleware/auth.js').AuthenticatedRequest;
  const validatedData = CreateProjectSchema.parse(req.body);

  // Use authenticated user's ID if ownerId not provided
  const ownerId = validatedData.ownerId || authenticatedReq.user?.id;

  if (!ownerId) {
    return res.status(400).json({
      error: 'Owner ID required',
      message: 'Owner ID must be provided or user must be authenticated',
    });
  }

  // Verify owner exists (or use authenticated user)
  if (validatedData.ownerId && validatedData.ownerId !== authenticatedReq.user?.id) {
    // Only admins can create projects for other users
    if (authenticatedReq.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only create projects for yourself',
      });
    }

    const owner = await db
      .select()
      .from(users)
      .where(eq(users.id, validatedData.ownerId))
      .limit(1);

    if (owner.length === 0) {
      return res.status(404).json({
        error: 'Owner not found',
        message: `User with ID ${validatedData.ownerId} not found`,
      });
    }
  }

  const project = await db
    .insert(seoProjects)
    .values({
      ...validatedData,
      ownerId,
    })
    .returning();

  logger.info('Project created', {
    projectId: project[0].id,
    name: project[0].name,
    domain: project[0].domain,
    ownerId,
    createdBy: authenticatedReq.user?.id,
  });

  // Audit log
  await logAuditEvent(
    createAuditEntryFromRequest(authenticatedReq, AuditActions.PROJECT_CREATE, {
      resourceId: project[0].id,
      resourceType: 'project',
      success: true,
      metadata: { name: project[0].name, domain: project[0].domain },
    })
  );

  res.status(201).json(project[0]);
}));

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Update project
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               domain:
 *                 type: string
 *                 format: uri
 *               targetRegion:
 *                 type: string
 *               primaryKeywords:
 *                 type: array
 *                 items:
 *                   type: string
 *               targetDomainAuthority:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               targetCtrIncrease:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               status:
 *                 type: string
 *                 enum: [active, inactive, archived]
 *     responses:
 *       200:
 *         description: Project updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SeoProject'
 *       404:
 *         description: Project not found
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const validatedData = UpdateProjectSchema.parse(req.body);

  // Check if project exists
  const existingProject = await db
    .select()
    .from(seoProjects)
    .where(eq(seoProjects.id, id))
    .limit(1);

  if (existingProject.length === 0) {
    return res.status(404).json({
      error: 'Project not found',
      message: `Project with ID ${id} not found`,
    });
  }

  const updatedProject = await db
    .update(seoProjects)
    .set({
      ...validatedData,
      updatedAt: new Date(),
    })
    .where(eq(seoProjects.id, id))
    .returning();

  logger.info('Project updated', {
    projectId: id,
    changes: Object.keys(validatedData),
  });

  res.json(updatedProject[0]);
}));

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Delete project
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Project deleted successfully
 *       404:
 *         description: Project not found
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if project exists
  const existingProject = await db
    .select()
    .from(seoProjects)
    .where(eq(seoProjects.id, id))
    .limit(1);

  if (existingProject.length === 0) {
    return res.status(404).json({
      error: 'Project not found',
      message: `Project with ID ${id} not found`,
    });
  }

  await db
    .update(seoProjects)
    .set({
      status: 'archived',
      updatedAt: new Date(),
    })
    .where(eq(seoProjects.id, id));

  logger.info('Project archived', { projectId: id });

  res.status(204).send();
}));

export { router as projectRoutes };
