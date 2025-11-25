import { Router, type Router as ExpressRouter } from 'express';
import { integrationController } from './integration.controller.js';
import { authorize } from '@/middleware/auth.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

const router: ExpressRouter = Router();

// All routes require authentication
router.use(authorize(['admin', 'user']));

/**
 * @swagger
 * /api/v1/integrations:
 *   get:
 *     summary: Get all integrations for organization
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of integrations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Integration'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/', asyncHandler(async (req, res, next) => {
  await integrationController.list(req, res);
  next();
}));

/**
 * @swagger
 * /api/v1/integrations:
 *   post:
 *     summary: Create a new integration
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateIntegrationRequest'
 *     responses:
 *       201:
 *         description: Integration created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Integration'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/', asyncHandler(async (req, res, next) => {
  await integrationController.create(req, res);
  next();
}));

/**
 * @swagger
 * /api/v1/integrations/{id}:
 *   get:
 *     summary: Get integration by ID
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Integration details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Integration'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/:id', asyncHandler((req, res) => integrationController.getById(req, res)));

/**
 * @swagger
 * /api/v1/integrations/{id}:
 *   put:
 *     summary: Update integration
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateIntegrationRequest'
 *     responses:
 *       200:
 *         description: Integration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Integration'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.put('/:id', asyncHandler((req, res) => integrationController.update(req, res)));

/**
 * @swagger
 * /api/v1/integrations/{id}:
 *   delete:
 *     summary: Delete integration
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Integration deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.delete('/:id', asyncHandler((req, res) => integrationController.delete(req, res)));

/**
 * @swagger
 * /api/v1/integrations/{id}/test:
 *   post:
 *     summary: Test integration connection
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connection test result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestConnectionResponse'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Connection test failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/test', asyncHandler((req, res) => integrationController.testConnection(req, res)));

export { router as integrationRoutes };

