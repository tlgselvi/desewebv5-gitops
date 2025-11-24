import { Router } from 'express';
import { financeController } from './controller.js';
import { authenticate } from '@/middleware/auth.js'; // Auth middleware import

const router = Router();

// Tüm finans rotaları authentication gerektirir
router.use(authenticate);

// Invoices
router.post('/invoices', (req, res) => financeController.createInvoice(req, res));
router.post('/invoices/:id/approve', (req, res) => financeController.approveInvoice(req, res));

// E-Invoice
router.get('/einvoice/check/:vkn', (req, res) => financeController.checkEInvoiceUser(req, res));

// Dashboard
router.get('/dashboard/summary', (req, res) => financeController.getDashboardSummary(req, res));

// Integrations
router.get('/exchange-rates', (req, res) => financeController.getExchangeRates(req, res));
router.post('/bank-sync', (req, res) => financeController.syncBankTransactions(req, res));

export const financeRoutes = router;
