import { Router, type Router as ExpressRouter } from 'express';
import { serviceController } from './controller.js';
import { authenticate } from '@/middleware/auth.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import type { RequestWithUser } from '@/middleware/auth.js';

const router: ExpressRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Service
 *   description: Service Management (Service Requests, Technicians, Maintenance Plans)
 */

router.use(authenticate);

/**
 * @swagger
 * /api/v1/service/requests:
 *   post:
 *     summary: Create a new service request
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 */
router.post('/requests', asyncHandler(async (req, res) => {
  return serviceController.createServiceRequest(req as RequestWithUser, res);
}));

/**
 * @swagger
 * /api/v1/service/requests:
 *   get:
 *     summary: Get service requests
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 */
router.get('/requests', asyncHandler(async (req, res) => {
  return serviceController.getServiceRequests(req as RequestWithUser, res);
}));

/**
 * @swagger
 * /api/v1/service/requests/{id}/assign:
 *   post:
 *     summary: Assign technician to service request
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 */
router.post('/requests/:requestId/assign', asyncHandler(async (req, res) => {
  return serviceController.assignTechnician(req as RequestWithUser, res);
}));

/**
 * @swagger
 * /api/v1/service/technicians:
 *   post:
 *     summary: Create a new technician
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 */
router.post('/technicians', asyncHandler(async (req, res) => {
  return serviceController.createTechnician(req as RequestWithUser, res);
}));

/**
 * @swagger
 * /api/v1/service/technicians:
 *   get:
 *     summary: Get technicians
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 */
router.get('/technicians', asyncHandler(async (req, res) => {
  return serviceController.getTechnicians(req as RequestWithUser, res);
}));

/**
 * @swagger
 * /api/v1/service/maintenance-plans:
 *   post:
 *     summary: Create a new maintenance plan
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 */
router.post('/maintenance-plans', asyncHandler(async (req, res) => {
  return serviceController.createMaintenancePlan(req as RequestWithUser, res);
}));

/**
 * @swagger
 * /api/v1/service/maintenance-plans:
 *   get:
 *     summary: Get maintenance plans
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 */
router.get('/maintenance-plans', asyncHandler(async (req, res) => {
  return serviceController.getMaintenancePlans(req as RequestWithUser, res);
}));

export { router as serviceRoutes };

