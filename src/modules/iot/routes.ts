import { Router, type Router as ExpressRouter } from 'express';
import { iotController } from './controller.js';
import { authenticate } from '@/middleware/auth.js';
import { requireModulePermission } from '@/middleware/rbac.js';
import { setRLSContextMiddleware } from '@/middleware/rls.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

const router: ExpressRouter = Router();

/**
 * @swagger
 * tags:
 *   name: IoT
 *   description: IoT Device Management and Telemetry (IoTBot)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     IoTDevice:
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
 *         type:
 *           type: string
 *         status:
 *           type: string
 *           enum: [online, offline, maintenance]
 *         location:
 *           type: string
 *         metadata:
 *           type: object
 *     CreateDeviceDTO:
 *       type: object
 *       required:
 *         - name
 *         - type
 *       properties:
 *         name:
 *           type: string
 *         type:
 *           type: string
 *         location:
 *           type: string
 *         metadata:
 *           type: object
 *     Telemetry:
 *       type: object
 *       properties:
 *         deviceId:
 *           type: string
 *           format: uuid
 *         timestamp:
 *           type: string
 *           format: date-time
 *         data:
 *           type: object
 *     IoTAlert:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         deviceId:
 *           type: string
 *           format: uuid
 *         severity:
 *           type: string
 *           enum: [critical, high, medium, low]
 *         message:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 */

router.use(authenticate);
router.use(setRLSContextMiddleware); // Set RLS context for tenant isolation
// Module-based RBAC: IoT modülü için read permission gerekli
router.use(requireModulePermission('iot', 'read'));

/**
 * @swagger
 * /api/v1/iot/devices:
 *   get:
 *     summary: Get all IoT devices
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of IoT devices
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/IoTDevice'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/devices', asyncHandler(iotController.getDevices));

/**
 * @swagger
 * /api/v1/iot/devices:
 *   post:
 *     summary: Create a new IoT device
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDeviceDTO'
 *     responses:
 *       201:
 *         description: Device created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IoTDevice'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/devices', requireModulePermission('iot', 'write'), asyncHandler(iotController.createDevice));

/**
 * @swagger
 * /api/v1/iot/telemetry/{deviceId}:
 *   get:
 *     summary: Get telemetry data for a device
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Device ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Maximum number of records to return
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Telemetry data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Telemetry'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/telemetry/:deviceId', asyncHandler(iotController.getTelemetry));

/**
 * @swagger
 * /api/v1/iot/alerts:
 *   get:
 *     summary: Get IoT device alerts
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [critical, high, medium, low]
 *         description: Filter by severity
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by device ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of alerts to return
 *     responses:
 *       200:
 *         description: Alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/IoTAlert'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/alerts', asyncHandler(iotController.getAlerts));

/**
 * @swagger
 * /api/v1/iot/devices/{deviceId}/commands:
 *   post:
 *     summary: Send command to IoT device
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Device ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - command
 *             properties:
 *               command:
 *                 type: string
 *                 description: Command name (e.g., set_pump, set_ph_target)
 *               parameters:
 *                 type: object
 *                 description: Command parameters
 *               timeout:
 *                 type: number
 *                 description: Command timeout in seconds (default: 30)
 *     responses:
 *       200:
 *         description: Command sent successfully
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/devices/:deviceId/commands', requireModulePermission('iot', 'write'), asyncHandler(iotController.sendCommand));

/**
 * @swagger
 * /api/v1/iot/devices/{deviceId}/commands:
 *   get:
 *     summary: Get device commands
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Device ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of commands to return
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sent, executed, failed, timeout]
 *         description: Filter by command status
 *     responses:
 *       200:
 *         description: Commands retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/devices/:deviceId/commands', asyncHandler(iotController.getCommands));

/**
 * @swagger
 * /api/v1/iot/devices/{deviceId}/status-history:
 *   get:
 *     summary: Get device status history
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Device ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of records to return
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Status history retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/devices/:deviceId/status-history', asyncHandler(iotController.getStatusHistory));

/**
 * @swagger
 * /api/v1/iot/devices/{deviceId}/config:
 *   put:
 *     summary: Update device configuration
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Device ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - config
 *             properties:
 *               config:
 *                 type: object
 *                 description: Device configuration object
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/devices/:deviceId/config', requireModulePermission('iot', 'write'), asyncHandler(iotController.updateDeviceConfig));

/**
 * @swagger
 * /api/v1/iot/devices/{deviceId}/health:
 *   get:
 *     summary: Get device health metrics
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Device health metrics retrieved successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/devices/:deviceId/health', asyncHandler(iotController.getDeviceHealth));

/**
 * @swagger
 * /api/v1/iot/dashboard:
 *   get:
 *     summary: Get IoT dashboard summary
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/dashboard', asyncHandler(iotController.getDashboardSummary));

/**
 * @swagger
 * /api/v1/iot/health-check:
 *   post:
 *     summary: Check device health and generate alerts
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health check completed
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/health-check', requireModulePermission('iot', 'write'), asyncHandler(iotController.checkDeviceHealth));

export const iotRoutes: ExpressRouter = router;
