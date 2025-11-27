import { Router } from 'express';
import { financeController } from './controller.js';
import { authenticate } from '@/middleware/auth.js';
import { requireModulePermission } from '@/middleware/rbac.js';
import { setRLSContextMiddleware } from '@/middleware/rls.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Finance
 *   description: Finance & Accounting Module (FinBot)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Invoice:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         invoiceNumber:
 *           type: string
 *         total:
 *           type: number
 *         status:
 *           type: string
 *           enum: [draft, sent, paid, cancelled]
 *     CreateInvoiceDTO:
 *       type: object
 *       required:
 *         - accountId
 *         - items
 *       properties:
 *         accountId:
 *           type: string
 *           format: uuid
 *         type:
 *           type: string
 *           enum: [sales, purchase]
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               quantity:
 *                 type: number
 *               unitPrice:
 *                 type: number
 *               taxRate:
 *                 type: number
 */

// Tüm finans rotaları authentication, RLS context ve module permission gerektirir
router.use(authenticate);
router.use(setRLSContextMiddleware); // Set RLS context for tenant isolation
// Module-based RBAC: Finance modülü için read permission gerekli (route bazında override edilebilir)
router.use(requireModulePermission('finance', 'read'));

/**
 * @swagger
 * /api/v1/finance/invoices:
 *   post:
 *     summary: Create a new invoice
 *     tags: [Finance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInvoiceDTO'
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 */
router.post('/invoices', requireModulePermission('finance', 'write'), (req, res) => financeController.createInvoice(req, res));

/**
 * @swagger
 * /api/v1/finance/invoices/{id}/approve:
 *   post:
 *     summary: Approve a draft invoice
 *     tags: [Finance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invoice approved
 */
router.post('/invoices/:id/approve', requireModulePermission('finance', 'write'), (req, res) => financeController.approveInvoice(req, res));

/**
 * @swagger
 * /api/v1/finance/einvoice/check/{vkn}:
 *   get:
 *     summary: Check if a VKN is an E-Invoice user
 *     tags: [Finance]
 *     parameters:
 *       - in: path
 *         name: vkn
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User status
 */
router.get('/einvoice/check/:vkn', (req, res) => financeController.checkEInvoiceUser(req, res));

/**
 * @swagger
 * /api/v1/finance/dashboard/summary:
 *   get:
 *     summary: Get financial dashboard summary
 *     tags: [Finance]
 *     responses:
 *       200:
 *         description: Financial summary data
 */
router.get('/dashboard/summary', (req, res) => financeController.getDashboardSummary(req, res));

/**
 * @swagger
 * /api/v1/finance/exchange-rates:
 *   get:
 *     summary: Get current exchange rates from TCMB
 *     tags: [Finance]
 *     responses:
 *       200:
 *         description: Exchange rates
 */
router.get('/exchange-rates', (req, res) => financeController.getExchangeRates(req, res));

/**
 * @swagger
 * /api/v1/finance/bank-sync:
 *   post:
 *     summary: Trigger bank transaction synchronization
 *     tags: [Finance]
 *     responses:
 *       200:
 *         description: Sync result
 */
router.post('/bank-sync', requireModulePermission('finance', 'write'), (req, res) => financeController.syncBankTransactions(req, res));

export const financeRoutes: Router = router;
