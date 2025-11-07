import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { contentGenerator } from '@/services/contentGenerator.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { contentLogger } from '@/utils/logger.js';

const router = Router();

// Validation schemas
const ContentGenerationSchema = z.object({
  projectId: z.string().uuid(),
  contentType: z.enum(['landing_page', 'blog_post', 'service_page', 'product_page']),
  templateId: z.string().uuid().optional(),
  keywords: z.array(z.string()).min(1),
  targetAudience: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'technical', 'friendly']).default('professional'),
  wordCount: z.number().min(100).max(5000).default(1000),
  includeImages: z.boolean().default(true),
  eEatCompliance: z.boolean().default(true),
});

const TemplateCreateSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1),
  template: z.string().min(1),
  variables: z.record(z.string(), z.unknown()).optional(),
});

const ContentQuerySchema = z.object({
  projectId: z.string().uuid(),
  contentType: z.enum(['landing_page', 'blog_post', 'service_page', 'product_page']).optional(),
});

/**
 * @swagger
 * /content/generate:
 *   post:
 *     summary: Generate content
 *     tags: [Content]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - contentType
 *               - keywords
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               contentType:
 *                 type: string
 *                 enum: [landing_page, blog_post, service_page, product_page]
 *               templateId:
 *                 type: string
 *                 format: uuid
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *               targetAudience:
 *                 type: string
 *               tone:
 *                 type: string
 *                 enum: [professional, casual, technical, friendly]
 *                 default: professional
 *               wordCount:
 *                 type: integer
 *                 minimum: 100
 *                 maximum: 5000
 *                 default: 1000
 *               includeImages:
 *                 type: boolean
 *                 default: true
 *               eEatCompliance:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Content generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 title:
 *                   type: string
 *                 content:
 *                   type: string
 *                 qualityScore:
 *                   type: number
 *                 eEatScore:
 *                   type: object
 *                   properties:
 *                     expertise:
 *                       type: number
 *                     experience:
 *                       type: number
 *                     authoritativeness:
 *                       type: number
 *                     trustworthiness:
 *                       type: number
 *                     overall:
 *                       type: number
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 *       404:
 *         description: Project not found
 */
router.post('/generate', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const validatedData = ContentGenerationSchema.parse(req.body);

  contentLogger.info('Starting content generation', {
    projectId: validatedData.projectId,
    contentType: validatedData.contentType,
    keywords: validatedData.keywords,
  });

  const result = await contentGenerator.generateContent(validatedData);

  contentLogger.info('Content generation completed', {
    contentId: result.id,
    eEatScore: result.eEatScore.overall,
    qualityScore: result.qualityScore,
  });

  return res.json(result);
}));

/**
 * @swagger
 * /content/templates:
 *   get:
 *     summary: Get content templates
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by template type
 *     responses:
 *       200:
 *         description: List of templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 templates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       template:
 *                         type: string
 *                       variables:
 *                         type: object
 *                       eEatScore:
 *                         type: number
 *                       isActive:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 */
router.get('/templates', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const { type } = req.query as { type?: string };

  const templates = await contentGenerator.getTemplates(type ?? undefined);

  return res.json({ templates });
}));

/**
 * @swagger
 * /content/templates:
 *   post:
 *     summary: Create content template
 *     tags: [Content]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - template
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               type:
 *                 type: string
 *               template:
 *                 type: string
 *               variables:
 *                 type: object
 *     responses:
 *       201:
 *         description: Template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 type:
 *                   type: string
 *                 template:
 *                   type: string
 *                 variables:
 *                   type: object
 *                 eEatScore:
 *                   type: number
 *                 isActive:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 */
router.post('/templates', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const validatedData = TemplateCreateSchema.parse(req.body);

  contentLogger.info('Creating content template', {
    name: validatedData.name,
    type: validatedData.type,
  });

  const { variables, ...templateBase } = validatedData;
  const templatePayload = variables ? { ...templateBase, variables } : templateBase;

  const template = await contentGenerator.createTemplate(templatePayload);

  return res.status(201).json({ template });
}));

/**
 * @swagger
 * /content/generated:
 *   get:
 *     summary: Get generated content
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: contentType
 *         schema:
 *           type: string
 *           enum: [landing_page, blog_post, service_page, product_page]
 *     responses:
 *       200:
 *         description: List of generated content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       projectId:
 *                         type: string
 *                         format: uuid
 *                       templateId:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                       content:
 *                         type: string
 *                       contentType:
 *                         type: string
 *                       url:
 *                         type: string
 *                       keywords:
 *                         type: array
 *                         items:
 *                           type: string
 *                       eEatScore:
 *                         type: number
 *                       qualityScore:
 *                         type: number
 *                       status:
 *                         type: string
 *                       publishedAt:
 *                         type: string
 *                         format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Validation error
 */
router.get('/generated', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const { projectId, contentType } = ContentQuerySchema.parse(req.query);

  const content = await contentGenerator.getGeneratedContent(projectId, contentType);

  return res.json({ content });
}));

export { router as contentRoutes };
