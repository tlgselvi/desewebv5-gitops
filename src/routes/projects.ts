import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db, seoProjects, users } from '@/db/index.js';
import { and, eq } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { logger } from '@/utils/logger.js';

const router: Router = Router();

// Validation schemas
const ProjectsListQuerySchema = z.object({
  ownerId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

const ProjectIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  domain: z.string().url(),
  targetRegion: z.string().default('Türkiye'),
  primaryKeywords: z.array(z.string()).min(1),
  targetDomainAuthority: z.number().min(0).max(100).default(50),
  targetCtrIncrease: z.number().min(0).max(100).default(25),
  ownerId: z.string().uuid(),
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
router.get('/', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const { ownerId, status } = ProjectsListQuerySchema.parse(req.query);

  const conditions: SQL[] = [];
  if (ownerId) {
    conditions.push(eq(seoProjects.ownerId, ownerId));
  }

  if (status) {
    conditions.push(eq(seoProjects.status, status));
  }

  const baseQuery = db
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

  const whereClause =
    conditions.length === 1
      ? conditions[0]
      : conditions.length > 1
        ? and(...conditions)
        : undefined;

  const projects = await (whereClause ? baseQuery.where(whereClause) : baseQuery);

  return res.json({ projects });
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
router.get('/:id', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const { id } = ProjectIdParamsSchema.parse(req.params);

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

  return res.json(project[0]);
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
router.post('/', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const validatedData = CreateProjectSchema.parse(req.body);

  // Verify owner exists
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

  const createdProjects = await db
    .insert(seoProjects)
    .values(validatedData)
    .returning();

  const [project] = createdProjects;

  if (!project) {
    logger.error('Project creation returned empty result', { ownerId: validatedData.ownerId });
    return res.status(500).json({
      error: 'creation_failed',
      message: 'Project could not be created',
    });
  }

  logger.info('Project created', {
    projectId: project.id,
    name: project.name,
    domain: project.domain,
    ownerId: validatedData.ownerId,
  });

  return res.status(201).json(project);
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
router.put('/:id', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const { id } = ProjectIdParamsSchema.parse(req.params);
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

  const [project] = updatedProject;

  if (!project) {
    logger.error('Project update returned empty result', { projectId: id });
    return res.status(500).json({
      error: 'update_failed',
      message: 'Project could not be updated',
    });
  }

  logger.info('Project updated', {
    projectId: id,
    changes: Object.keys(validatedData),
  });

  return res.json(project);
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
router.delete('/:id', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const { id } = ProjectIdParamsSchema.parse(req.params);

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

  return res.status(204).send();
}));

export { router as projectRoutes };
