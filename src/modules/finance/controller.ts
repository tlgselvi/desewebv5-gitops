import { Request, Response } from 'express';
import { financeService } from './service.js';
import { tcmbService } from '@/services/finance/tcmb.js';
import { z } from 'zod';

export class FinanceController {
  
  async getExchangeRates(req: Request, res: Response) {
    try {
      const rates = await tcmbService.getExchangeRates();
      return res.json(rates);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to fetch exchange rates' });
    }
  }

  async checkEInvoiceUser(req: Request, res: Response) {
    try {
      const { vkn } = req.params;
      if (!vkn) return res.status(400).json({ error: 'VKN/TCKN required' });
      
      const organizationId = (req.user as any)?.organizationId || 'default-org-id';
      const result = await financeService.checkEInvoiceUser(organizationId, vkn);
      return res.json({ isEInvoiceUser: !!result, user: result });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to check e-invoice user' });
    }
  }

  async createInvoice(req: Request, res: Response) {
    try {
      const schema = z.object({
        accountId: z.string(),
        type: z.enum(['sales', 'purchase']),
        invoiceDate: z.string().transform((str) => new Date(str)),
        dueDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
        items: z.array(z.object({
          description: z.string(),
          quantity: z.number().min(0.01),
          unitPrice: z.number().min(0),
          taxRate: z.number().min(0),
        })).min(1),
        notes: z.string().optional(),
        eInvoice: z.boolean().optional(),
      });

      const data = schema.parse(req.body);
      const organizationId = (req.user as any)?.organizationId;
      const userId = (req.user as any)?.id;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization context required' });
      }

      const invoiceData: any = {
        organizationId,
        accountId: data.accountId,
        type: data.type,
        invoiceDate: data.invoiceDate,
        items: data.items,
        createdBy: userId || 'system', // Fallback for dev/test
      };
      if (data.dueDate) invoiceData.dueDate = data.dueDate;
      if (data.notes) invoiceData.notes = data.notes;
      if (data.eInvoice !== undefined) invoiceData.eInvoice = data.eInvoice;

      const invoice = await financeService.createInvoice(invoiceData);

      return res.status(201).json(invoice);
    } catch (error: any) {
      console.error('Create Invoice Error:', error);
      return res.status(400).json({ error: error.message || 'Failed to create invoice' });
    }
  }

  async approveInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'Invoice ID required' });
      
      const userId = (req.user as any)?.id || 'system';
      
      const result = await financeService.approveInvoice(id, userId);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async getDashboardSummary(req: Request, res: Response) {
    try {
      const organizationId = (req.user as any)?.organizationId;
      
      if (!organizationId) {
        // Development mock
        if (process.env.NODE_ENV === 'development') {
           return res.json({
             totalRevenue: 150000,
             pendingPayments: 45000,
             recentTransactions: []
           });
        }
        return res.status(400).json({ error: 'Organization context required' });
      }

      const summary = await financeService.getFinancialSummary(organizationId);
      return res.json(summary);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async syncBankTransactions(req: Request, res: Response) {
    try {
      const organizationId = (req.user as any)?.organizationId;
      const { accountId } = req.body;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization context required' });
      }
      if (!accountId) {
        return res.status(400).json({ error: 'Account ID required' });
      }

      const result = await financeService.syncBankTransactions(organizationId, accountId);
      return res.json(result);
    } catch (error: any) {
      console.error('Bank Sync Error:', error);
      return res.status(500).json({ error: error.message || 'Bank sync failed' });
    }
  }
}

export const financeController = new FinanceController();
