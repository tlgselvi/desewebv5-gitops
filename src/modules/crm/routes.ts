import { Router } from 'express';
import { crmController } from './controller.js';
import { authenticate } from '@/middleware/auth.js';
import { requireModulePermission } from '@/middleware/rbac.js';
import { setRLSContextMiddleware } from '@/middleware/rls.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: CRM
 *   description: Customer Relationship Management (SalesBot)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Deal:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         value:
 *           type: number
 *         stageId:
 *           type: string
 *     CreateDealDTO:
 *       type: object
 *       required:
 *         - title
 *         - value
 *         - stageId
 *       properties:
 *         title:
 *           type: string
 *         value:
 *           type: number
 *         stageId:
 *           type: string
 *         contactId:
 *           type: string
 */

router.use(authenticate);
router.use(setRLSContextMiddleware); // Set RLS context for tenant isolation
// Module-based RBAC: CRM modülü için read permission gerekli
router.use(requireModulePermission('crm', 'read'));

/**
 * @swagger
 * /api/v1/crm/kanban:
 *   get:
 *     summary: Get Kanban board data
 *     tags: [CRM]
 *     responses:
 *       200:
 *         description: Kanban stages and deals
 */
router.get('/kanban', (req, res) => crmController.getKanban(req, res));

/**
 * @swagger
 * /api/v1/crm/deals:
 *   post:
 *     summary: Create a new deal
 *     tags: [CRM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDealDTO'
 *     responses:
 *       201:
 *         description: Deal created successfully
 */
router.post('/deals', requireModulePermission('crm', 'write'), (req, res) => crmController.createDeal(req, res));

/**
 * @swagger
 * /api/v1/crm/deals/{id}/stage:
 *   put:
 *     summary: Move deal to another stage
 *     tags: [CRM]
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
 *               stageId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Deal moved successfully
 */
router.put('/deals/:id/stage', requireModulePermission('crm', 'write'), (req, res) => crmController.moveDeal(req, res));

/**
 * @swagger
 * /api/v1/crm/activities:
 *   post:
 *     summary: Create a new activity
 *     tags: [CRM]
 *     responses:
 *       201:
 *         description: Activity created
 */
router.post('/activities', requireModulePermission('crm', 'write'), (req, res) => crmController.createActivity(req, res));

/**
 * @swagger
 * /api/v1/crm/whatsapp/send:
 *   post:
 *     summary: Send WhatsApp message
 *     tags: [CRM]
 *     responses:
 *       200:
 *         description: Message sent
 */
router.post('/whatsapp/send', requireModulePermission('crm', 'write'), (req, res) => crmController.sendWhatsApp(req, res));

/**
 * WhatsApp Webhook endpoint (no authentication required - Meta verifies via signature)
 * Meta will send POST requests to this endpoint for incoming messages and status updates
 */
router.post('/whatsapp/webhook', (req, res) => crmController.handleWhatsAppWebhook(req, res));

/**
 * Get WhatsApp message history for a contact
 */
router.get('/whatsapp/history/:contactId', (req, res) => crmController.getWhatsAppHistory(req, res));

// Contacts
// ... contacts controller eklenebilir ...

export const crmRoutes: Router = router;
