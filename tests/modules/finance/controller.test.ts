import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { FinanceController } from '@/modules/finance/controller.js';
import { financeService } from '@/modules/finance/service.js';
import { tcmbService } from '@/services/finance/tcmb.js';
import { ZodError } from 'zod';

// Mock dependencies
vi.mock('@/modules/finance/service.js', () => ({
  financeService: {
    checkEInvoiceUser: vi.fn(),
    createInvoice: vi.fn(),
    approveInvoice: vi.fn(),
    getFinancialSummary: vi.fn(),
    syncBankTransactions: vi.fn(),
  },
}));

vi.mock('@/services/finance/tcmb.js', () => ({
  tcmbService: {
    getExchangeRates: vi.fn(),
  },
}));

describe('Finance Controller - Error Handling Branch Tests', () => {
  let controller: FinanceController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new FinanceController();

    mockReq = {
      params: {},
      body: {},
      user: {
        id: 'user-1',
        organizationId: 'org-1',
      } as any,
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('checkEInvoiceUser', () => {
    it('should return 400 when VKN is missing', async () => {
      mockReq.params = {};

      await controller.checkEInvoiceUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'VKN/TCKN required' });
    });

    it('should handle service error and return 500', async () => {
      mockReq.params = { vkn: '1234567890' };
      vi.mocked(financeService.checkEInvoiceUser).mockRejectedValue(new Error('Service error'));

      await controller.checkEInvoiceUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to check e-invoice user' });
    });

    it('should return success when VKN is provided', async () => {
      mockReq.params = { vkn: '1234567890' };
      const mockUser = { vkn: '1234567890', name: 'Test User' };
      vi.mocked(financeService.checkEInvoiceUser).mockResolvedValue(mockUser as any);

      await controller.checkEInvoiceUser(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({ isEInvoiceUser: true, user: mockUser });
    });
  });

  describe('createInvoice', () => {
    it('should return 400 when organizationId is missing', async () => {
      mockReq.user = { id: 'user-1' } as any; // No organizationId
      mockReq.body = {
        accountId: 'acc-1',
        type: 'sales',
        invoiceDate: '2024-01-01',
        items: [{ description: 'Item', quantity: 1, unitPrice: 100, taxRate: 20 }],
      };

      await controller.createInvoice(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Organization context required' });
    });

    it('should return 400 when validation fails', async () => {
      mockReq.body = {
        accountId: 'acc-1',
        type: 'invalid_type', // Invalid enum value
        invoiceDate: '2024-01-01',
        items: [],
      };

      await controller.createInvoice(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when items array is empty', async () => {
      mockReq.body = {
        accountId: 'acc-1',
        type: 'sales',
        invoiceDate: '2024-01-01',
        items: [], // Empty array
      };

      await controller.createInvoice(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle service error and return 400', async () => {
      mockReq.body = {
        accountId: 'acc-1',
        type: 'sales',
        invoiceDate: '2024-01-01',
        items: [{ description: 'Item', quantity: 1, unitPrice: 100, taxRate: 20 }],
      };
      vi.mocked(financeService.createInvoice).mockRejectedValue(new Error('Service error'));

      await controller.createInvoice(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 201 when invoice is created successfully', async () => {
      mockReq.body = {
        accountId: 'acc-1',
        type: 'sales',
        invoiceDate: '2024-01-01',
        items: [{ description: 'Item', quantity: 1, unitPrice: 100, taxRate: 20 }],
      };
      const mockInvoice = { id: 'inv-1', total: '120.00' };
      vi.mocked(financeService.createInvoice).mockResolvedValue(mockInvoice as any);

      await controller.createInvoice(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockInvoice);
    });
  });

  describe('approveInvoice', () => {
    it('should return 400 when invoice ID is missing', async () => {
      mockReq.params = {};

      await controller.approveInvoice(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invoice ID required' });
    });

    it('should handle service error and return 400', async () => {
      mockReq.params = { id: 'inv-1' };
      vi.mocked(financeService.approveInvoice).mockRejectedValue(new Error('Invoice not found'));

      await controller.approveInvoice(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invoice not found' });
    });

    it('should return success when invoice is approved', async () => {
      mockReq.params = { id: 'inv-1' };
      const mockResult = { success: true, invoiceId: 'inv-1' };
      vi.mocked(financeService.approveInvoice).mockResolvedValue(mockResult as any);

      await controller.approveInvoice(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('getDashboardSummary', () => {
    it('should return 400 when organizationId is missing in production', async () => {
      process.env.NODE_ENV = 'production';
      mockReq.user = { id: 'user-1' } as any; // No organizationId

      await controller.getDashboardSummary(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Organization context required' });
    });

    it('should return mock data in development when organizationId is missing', async () => {
      process.env.NODE_ENV = 'development';
      mockReq.user = { id: 'user-1' } as any; // No organizationId

      await controller.getDashboardSummary(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        totalRevenue: 150000,
        pendingPayments: 45000,
        recentTransactions: [],
      });
    });

    it('should handle service error and return 500', async () => {
      vi.mocked(financeService.getFinancialSummary).mockRejectedValue(new Error('Service error'));

      await controller.getDashboardSummary(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should return summary when organizationId is provided', async () => {
      const mockSummary = { totalRevenue: 100000, pendingPayments: 20000 };
      vi.mocked(financeService.getFinancialSummary).mockResolvedValue(mockSummary as any);

      await controller.getDashboardSummary(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockSummary);
    });
  });

  describe('syncBankTransactions', () => {
    it('should return 400 when organizationId is missing', async () => {
      mockReq.user = { id: 'user-1' } as any; // No organizationId
      mockReq.body = { accountId: 'acc-1' };

      await controller.syncBankTransactions(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Organization context required' });
    });

    it('should return 400 when accountId is missing', async () => {
      mockReq.body = {};

      await controller.syncBankTransactions(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Account ID required' });
    });

    it('should handle service error and return 500', async () => {
      mockReq.body = { accountId: 'acc-1' };
      vi.mocked(financeService.syncBankTransactions).mockRejectedValue(new Error('Service error'));

      await controller.syncBankTransactions(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should return success when sync is successful', async () => {
      mockReq.body = { accountId: 'acc-1' };
      const mockResult = { syncedCount: 5, transactions: [] };
      vi.mocked(financeService.syncBankTransactions).mockResolvedValue(mockResult as any);

      await controller.syncBankTransactions(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('getExchangeRates', () => {
    it('should handle service error and return 500', async () => {
      vi.mocked(tcmbService.getExchangeRates).mockRejectedValue(new Error('Service error'));

      await controller.getExchangeRates(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to fetch exchange rates' });
    });

    it('should return exchange rates successfully', async () => {
      const mockRates = { USD: 34.5, EUR: 37.2 };
      vi.mocked(tcmbService.getExchangeRates).mockResolvedValue(mockRates as any);

      await controller.getExchangeRates(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockRates);
    });
  });
});

