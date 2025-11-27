import { Request, Response } from 'express';
import { billingService } from './billing.service.js';
import { paymentService } from './payment.service.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { logger } from '@/utils/logger.js';

export class BillingController {
  
  /**
   * List Invoices
   * GET /api/saas/invoices
   */
  listInvoices = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Organization ID required' });
    }

    const invoices = await billingService.listInvoices(organizationId);
    res.json(invoices);
  });

  /**
   * Get Invoice Details
   * GET /api/saas/invoices/:id
   */
  getInvoice = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Organization ID required' });
    }

    const invoice = await billingService.getInvoiceById(id, organizationId);
    
    if (!invoice) {
      return res.status(404).json({ error: 'not_found', message: 'Invoice not found' });
    }

    res.json(invoice);
  });

  /**
   * Pay Invoice
   * POST /api/saas/invoices/:id/pay
   */
  payInvoice = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Organization ID required' });
    }

    const result = await paymentService.processInvoicePayment(id, organizationId);
    res.json({ success: true, invoice: result });
  });

  /**
   * Download Invoice PDF
   * GET /api/saas/invoices/:id/download
   */
  downloadInvoice = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Organization ID required' });
    }

    const invoice = await billingService.getInvoiceById(id, organizationId);
    if (!invoice) {
      return res.status(404).json({ error: 'not_found', message: 'Invoice not found' });
    }

    const pdfUrl = await billingService.generateInvoicePdf(id);
    
    // In real implementation, this might stream the file or redirect
    res.json({ url: pdfUrl });
  });

  /**
   * List Payment Methods
   * GET /api/saas/payment-methods
   */
  listPaymentMethods = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Organization ID required' });
    }

    const methods = await paymentService.listPaymentMethods(organizationId);
    res.json(methods);
  });

  /**
   * Add Payment Method
   * POST /api/saas/payment-methods
   */
  addPaymentMethod = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user?.organizationId;
    const { token, isDefault } = req.body; // Token from Stripe Elements/Card Element

    if (!organizationId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Organization ID required' });
    }

    if (!token) {
      return res.status(400).json({ error: 'bad_request', message: 'Payment token required' });
    }

    const method = await paymentService.addPaymentMethod(organizationId, token, isDefault);
    res.status(201).json(method);
  });

  /**
   * Remove Payment Method
   * DELETE /api/saas/payment-methods/:id
   */
  removePaymentMethod = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Organization ID required' });
    }

    await paymentService.removePaymentMethod(id, organizationId);
    res.json({ success: true, message: 'Payment method removed' });
  });
}

export const billingController = new BillingController();

