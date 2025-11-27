import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { billingController } from './billing.controller.js';
import { authenticate } from '@/middleware/auth.js';

const router: ExpressRouter = Router();

// All routes require authentication
router.use(authenticate);

// Invoice Routes
router.get('/invoices', billingController.listInvoices);
router.get('/invoices/:id', billingController.getInvoice);
router.post('/invoices/:id/pay', billingController.payInvoice);
router.get('/invoices/:id/download', billingController.downloadInvoice);

// Payment Method Routes
router.get('/payment-methods', billingController.listPaymentMethods);
router.post('/payment-methods', billingController.addPaymentMethod);
router.delete('/payment-methods/:id', billingController.removePaymentMethod);

export { router as billingRoutes };

