import { Router } from 'express';
import { crmController } from './controller.js';
import { authenticate } from '@/middleware/auth.js';

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
router.post('/deals', (req, res) => crmController.createDeal(req, res));

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
router.put('/deals/:id/stage', (req, res) => crmController.moveDeal(req, res));

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
router.post('/activities', (req, res) => crmController.createActivity(req, res));

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
router.post('/whatsapp/send', (req, res) => crmController.sendWhatsApp(req, res));

// Contacts
// ... contacts controller eklenebilir ...

export const crmRoutes = router;
