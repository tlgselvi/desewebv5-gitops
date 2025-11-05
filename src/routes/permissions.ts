import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@/utils/logger.js';
import { permissionService } from '@/services/rbac/permissionService.js';
import { authorize } from '@/rbac/authorize.js';
import { logAuditEvent, AuditActions } from '@/utils/auditLogger.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';

const router = Router();

// Validation schemas
const createPermissionSchema = z.object({
  resource: z.string().min(1, 'Resource is required'),
  action: z.string().min(1, 'Action is required'),
  description: z.string().optional(),
  category: z.string().optional(),
});

const updatePermissionSchema = z.object({
  description: z.string().optional(),
  category: z.string().optional(),
});

/**
 * @swagger
 * /api/v1/permissions:
 *   get:
 *     summary: List all permissions with their roles
 *     description: Retrieves all permissions in the system along with their assigned roles. Requires system.permissions:read permission.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Permission'
 *                 count:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/',
  authorize({ resource: 'system.permissions', action: 'read' }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const permissions = await permissionService.findAll();

      logger.info('Permissions listed', {
        count: permissions.length,
        userId: (req as AuthenticatedRequest).user?.id,
      });

      res.status(200).json({
        success: true,
        data: permissions,
        count: permissions.length,
      });
    } catch (error) {
      logger.error('Failed to list permissions', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to list permissions',
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/permissions/{id}:
 *   get:
 *     summary: Get permission by ID
 *     description: Retrieves a specific permission by its UUID along with assigned roles. Requires system.permissions:read permission.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Permission UUID
 *     responses:
 *       200:
 *         description: Permission details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Permission'
 *       404:
 *         description: Permission not found
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  '/:id',
  authorize({ resource: 'system.permissions', action: 'read' }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const permission = await permissionService.findById(id);

      if (!permission) {
        res.status(404).json({
          success: false,
          error: 'Permission not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: permission,
      });
    } catch (error) {
      logger.error('Failed to get permission', {
        id: req.params.id,
        error,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get permission',
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/permissions:
 *   post:
 *     summary: Create a new permission
 *     description: Creates a new permission with resource, action, optional description and category. Requires system.permissions:write permission.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resource
 *               - action
 *             properties:
 *               resource:
 *                 type: string
 *                 description: Resource identifier (e.g., finbot.accounts, seo.projects)
 *                 example: finbot.accounts
 *               action:
 *                 type: string
 *                 description: Action type (read, write, delete, *)
 *                 example: read
 *               description:
 *                 type: string
 *                 description: Human-readable permission description
 *                 example: Read access to financial accounts
 *               category:
 *                 type: string
 *                 description: Permission category (finance, seo, analytics, system)
 *                 example: finance
 *     responses:
 *       201:
 *         description: Permission created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Permission'
 *       400:
 *         description: Invalid request body
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/',
  authorize({ resource: 'system.permissions', action: 'write' }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const validated = createPermissionSchema.parse(req.body);
      const authReq = req as AuthenticatedRequest;

      // Check if permission already exists
      const existing = await permissionService.findByResourceAndAction(
        validated.resource,
        validated.action
      );

      if (existing) {
        res.status(409).json({
          success: false,
          error: 'Permission already exists',
          data: existing,
        });
        return;
      }

      // Ensure required fields are present (already validated by schema, but double-check)
      if (!validated.resource || !validated.action) {
        res.status(400).json({
          error: 'Validation error',
          message: 'resource and action are required fields',
        });
        return;
      }

      const permission = await permissionService.create({
        resource: validated.resource,
        action: validated.action,
        description: validated.description,
        category: validated.category,
      });

      // Audit log
      await logAuditEvent({
        userId: authReq.user?.id,
        action: AuditActions.PERMISSION_CHANGE,
        resourceType: 'permission',
        resourceId: permission.id,
        method: req.method,
        endpoint: req.path,
        ipAddress: req.ip,
        statusCode: 201,
        success: true,
        metadata: {
          resource: validated.resource,
          action: validated.action,
        },
      });

      logger.info('Permission created', {
        permissionId: permission.id,
        userId: authReq.user?.id,
      });

      res.status(201).json({
        success: true,
        data: permission,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      logger.error('Failed to create permission', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create permission',
      });
    }
  }
);

/**
 * PATCH /api/v1/permissions/:id
 * Update permission
 */
router.patch(
  '/:id',
  authorize({ resource: 'system.permissions', action: 'write' }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const validated = updatePermissionSchema.parse(req.body);
      const authReq = req as AuthenticatedRequest;

      const permission = await permissionService.update(id, validated);

      // Audit log
      await logAuditEvent({
        userId: authReq.user?.id,
        action: AuditActions.PERMISSION_CHANGE,
        resourceType: 'permission',
        resourceId: id,
        method: req.method,
        endpoint: req.path,
        ipAddress: req.ip,
        statusCode: 200,
        success: true,
        metadata: validated,
      });

      logger.info('Permission updated', {
        permissionId: id,
        userId: authReq.user?.id,
      });

      res.status(200).json({
        success: true,
        data: permission,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      logger.error('Failed to update permission', {
        id: req.params.id,
        error,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to update permission',
      });
    }
  }
);

/**
 * DELETE /api/v1/permissions/:id
 * Delete permission
 */
router.delete(
  '/:id',
  authorize({ resource: 'system.permissions', action: 'write' }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const authReq = req as AuthenticatedRequest;

      await permissionService.delete(id);

      // Audit log
      await logAuditEvent({
        userId: authReq.user?.id,
        action: AuditActions.PERMISSION_CHANGE,
        resourceType: 'permission',
        resourceId: id,
        method: req.method,
        endpoint: req.path,
        ipAddress: req.ip,
        statusCode: 200,
        success: true,
      });

      logger.info('Permission deleted', {
        permissionId: id,
        userId: authReq.user?.id,
      });

      res.status(200).json({
        success: true,
        message: 'Permission deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete permission', {
        id: req.params.id,
        error,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to delete permission',
      });
    }
  }
);

/**
 * POST /api/v1/permissions/:id/roles/:roleId
 * Assign permission to role
 */
router.post(
  '/:id/roles/:roleId',
  authorize({ resource: 'system.permissions', action: 'write' }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: permissionId, roleId } = req.params;
      const authReq = req as AuthenticatedRequest;

      await permissionService.assignToRole(permissionId, roleId);

      // Audit log
      await logAuditEvent({
        userId: authReq.user?.id,
        action: AuditActions.PERMISSION_CHANGE,
        resourceType: 'permission',
        resourceId: permissionId,
        method: req.method,
        endpoint: req.path,
        ipAddress: req.ip,
        statusCode: 200,
        success: true,
        metadata: { roleId },
      });

      logger.info('Permission assigned to role', {
        permissionId,
        roleId,
        userId: authReq.user?.id,
      });

      res.status(200).json({
        success: true,
        message: 'Permission assigned to role successfully',
      });
    } catch (error) {
      logger.error('Failed to assign permission to role', {
        permissionId: req.params.id,
        roleId: req.params.roleId,
        error,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to assign permission to role',
      });
    }
  }
);

/**
 * DELETE /api/v1/permissions/:id/roles/:roleId
 * Remove permission from role
 */
router.delete(
  '/:id/roles/:roleId',
  authorize({ resource: 'system.permissions', action: 'write' }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: permissionId, roleId } = req.params;
      const authReq = req as AuthenticatedRequest;

      await permissionService.removeFromRole(permissionId, roleId);

      // Audit log
      await logAuditEvent({
        userId: authReq.user?.id,
        action: AuditActions.PERMISSION_CHANGE,
        resourceType: 'permission',
        resourceId: permissionId,
        method: req.method,
        endpoint: req.path,
        ipAddress: req.ip,
        statusCode: 200,
        success: true,
        metadata: { roleId },
      });

      logger.info('Permission removed from role', {
        permissionId,
        roleId,
        userId: authReq.user?.id,
      });

      res.status(200).json({
        success: true,
        message: 'Permission removed from role successfully',
      });
    } catch (error) {
      logger.error('Failed to remove permission from role', {
        permissionId: req.params.id,
        roleId: req.params.roleId,
        error,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to remove permission from role',
      });
    }
  }
);

/**
 * GET /api/v1/permissions/category/:category
 * Get permissions by category
 */
router.get(
  '/category/:category',
  authorize({ resource: 'system.permissions', action: 'read' }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { category } = req.params;
      const permissions = await permissionService.findByCategory(category);

      res.status(200).json({
        success: true,
        data: permissions,
        count: permissions.length,
      });
    } catch (error) {
      logger.error('Failed to get permissions by category', {
        category: req.params.category,
        error,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get permissions by category',
      });
    }
  }
);

export { router as permissionRoutes };

