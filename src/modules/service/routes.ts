import { Router, type Router as ExpressRouter } from 'express';
import { serviceController } from './controller.js';
import { authenticate } from '@/middleware/auth.js';
import { setRLSContextMiddleware } from '@/middleware/rls.js';
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
router.use(setRLSContextMiddleware); // Set RLS context for tenant isolation

/**
 * @swagger
 * components:
 *   schemas:
 *     ServiceRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         organizationId:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [open, assigned, in_progress, completed, cancelled]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         technicianId:
 *           type: string
 *           format: uuid
 *     CreateServiceRequestDTO:
 *       type: object
 *       required:
 *         - title
 *         - description
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *     Technician:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         organizationId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         specialization:
 *           type: string
 *         status:
 *           type: string
 *           enum: [available, busy, offline]
 *     MaintenancePlan:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         organizationId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         frequency:
 *           type: string
 *           enum: [daily, weekly, monthly, quarterly, yearly]
 *         nextServiceDate:
 *           type: string
 *           format: date
 */

/**
 * @swagger
 * /api/v1/service/requests:
 *   post:
 *     summary: Create a new service request
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateServiceRequestDTO'
 *     responses:
 *       201:
 *         description: Service request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceRequest'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
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
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, assigned, in_progress, completed, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by priority
 *     responses:
 *       200:
 *         description: List of service requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ServiceRequest'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/requests', asyncHandler(async (req, res) => {
  return serviceController.getServiceRequests(req as RequestWithUser, res);
}));

/**
 * @swagger
 * /api/v1/service/requests/{requestId}/assign:
 *   post:
 *     summary: Assign technician to service request
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - technicianId
 *             properties:
 *               technicianId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Technician assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceRequest'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               specialization:
 *                 type: string
 *     responses:
 *       201:
 *         description: Technician created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Technician'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
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
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, busy, offline]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of technicians
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Technician'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - frequency
 *             properties:
 *               name:
 *                 type: string
 *               frequency:
 *                 type: string
 *                 enum: [daily, weekly, monthly, quarterly, yearly]
 *               nextServiceDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Maintenance plan created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenancePlan'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
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
 *     responses:
 *       200:
 *         description: List of maintenance plans
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MaintenancePlan'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/maintenance-plans', asyncHandler(async (req, res) => {
  return serviceController.getMaintenancePlans(req as RequestWithUser, res);
}));

export { router as serviceRoutes };

