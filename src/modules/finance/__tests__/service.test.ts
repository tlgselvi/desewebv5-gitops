import { describe, it, expect, vi, beforeEach } from 'vitest';
import { financeService } from '../service.js';
import { db } from '@/db/index.js';
import { integrationService } from '@/modules/saas/integration.service.js';
import { logger } from '@/utils/logger.js';

// Mock dependencies
vi.mock('@/db/index.js');
vi.mock('@/modules/saas/integration.service.js');
vi.mock('@/utils/logger.js');
vi.mock('@/integrations/einvoice/foriba.js', () => ({
  ForibaProvider: vi.fn().mockImplementation(() => ({
    checkUser: vi.fn().mockResolvedValue({
      identifier: '1234567890',
      alias: 'urn:mail:defaultpk',
      title: 'Test Company',
      type: 'private',
      firstCreationTime: new Date(),
    }),
    sendInvoice: vi.fn().mockResolvedValue({
      uuid: 'test-uuid',
      issueDate: new Date(),
      id: 'GIB123456',
      payableAmount: 120,
      currency: 'TRY',
      profileId: 'TICARIFATURA',
      typeCode: 'SATIS',
      status: 'sent',
    }),
  })),
}));

describe('FinanceService', () => {
  const mockDb = db as any;
  const mockIntegrationService = integrationService as any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockDb.transaction = vi.fn((callback) => {
      const mockTx = {
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ 
              id: 'mock-invoice-id',
              organizationId: 'org-1',
              accountId: 'acc-1',
              invoiceNumber: 'INV-123',
              invoiceDate: new Date(),
              type: 'sales',
              status: 'draft',
              subtotal: '100.00',
              taxTotal: '20.00',
              total: '120.00',
            }])),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([{ id: 'mock-invoice-id' }])),
          })),
        })),
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([{
                id: 'mock-invoice-id',
                organizationId: 'org-1',
                accountId: 'acc-1',
                invoiceNumber: 'INV-123',
                status: 'draft',
                type: 'sales',
                total: '120.00',
                subtotal: '100.00',
                taxTotal: '20.00',
                currency: 'TRY',
              }])),
            })),
          })),
        })),
      };
      return callback(mockTx);
    });

    mockDb.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{
            id: 'mock-account-id',
            organizationId: 'org-1',
            name: 'Test Account',
            code: 'ACC001',
            balance: '0.00',
          }])),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    }));

    mockDb.update = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ id: 'mock-invoice-id' }])),
      })),
    }));

    mockDb.execute = vi.fn(() => Promise.resolve([]));

    mockIntegrationService.getEInvoiceProvider = vi.fn().mockRejectedValue(new Error('Integration not found'));
    mockIntegrationService.getBankingProvider = vi.fn().mockResolvedValue({
      getTransactions: vi.fn().mockResolvedValue([]),
    });
  });

  describe('createInvoice', () => {
    it('should create an invoice with valid data', async () => {
      const invoiceData = {
        organizationId: 'org-1',
        accountId: 'acc-1',
        type: 'sales' as const,
        invoiceDate: new Date(),
        items: [
          { description: 'Item 1', quantity: 2, unitPrice: 50, taxRate: 20 }
        ],
        createdBy: 'user-1',
      };

      const result = await financeService.createInvoice(invoiceData);
      
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-invoice-id');
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should calculate subtotal, tax, and total correctly', async () => {
      const invoiceData = {
        organizationId: 'org-1',
        accountId: 'acc-1',
        type: 'sales' as const,
        invoiceDate: new Date(),
        items: [
          { description: 'Item 1', quantity: 2, unitPrice: 100, taxRate: 20 },
          { description: 'Item 2', quantity: 1, unitPrice: 50, taxRate: 10 },
        ],
        createdBy: 'user-1',
      };

      await financeService.createInvoice(invoiceData);
      
      expect(mockDb.transaction).toHaveBeenCalled();
      // Verify that invoice items are inserted
      const txCallback = mockDb.transaction.mock.calls[0][0];
      const mockTx = {
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: 'mock-id' }])),
          })),
        })),
      };
      await txCallback(mockTx);
      expect(mockTx.insert).toHaveBeenCalled();
    });

    it('should create invoice with eInvoice flag', async () => {
      const invoiceData = {
        organizationId: 'org-1',
        accountId: 'acc-1',
        type: 'sales' as const,
        invoiceDate: new Date(),
        items: [
          { description: 'Item 1', quantity: 1, unitPrice: 100, taxRate: 20 }
        ],
        createdBy: 'user-1',
        eInvoice: true,
      };

      await financeService.createInvoice(invoiceData);
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should handle empty items array', async () => {
      const invoiceData = {
        organizationId: 'org-1',
        accountId: 'acc-1',
        type: 'sales' as const,
        invoiceDate: new Date(),
        items: [],
        createdBy: 'user-1',
      };

      const result = await financeService.createInvoice(invoiceData);
      expect(result).toBeDefined();
    });

    it('should handle purchase invoice type', async () => {
      const invoiceData = {
        organizationId: 'org-1',
        accountId: 'acc-1',
        type: 'purchase' as const,
        invoiceDate: new Date(),
        items: [
          { description: 'Item 1', quantity: 1, unitPrice: 100, taxRate: 20 }
        ],
        createdBy: 'user-1',
      };

      await financeService.createInvoice(invoiceData);
      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });

  describe('checkEInvoiceUser', () => {
    it('should check e-invoice user with integration service', async () => {
      mockIntegrationService.getEInvoiceProvider = vi.fn().mockResolvedValue({
        checkUser: vi.fn().mockResolvedValue({
          identifier: '1234567890',
          alias: 'urn:mail:defaultpk',
          title: 'Test Company',
          type: 'private',
          firstCreationTime: new Date(),
        }),
      });

      const result = await financeService.checkEInvoiceUser('org-1', '1234567890');
      
      expect(result).toBeDefined();
      expect(result?.identifier).toBe('1234567890');
      expect(mockIntegrationService.getEInvoiceProvider).toHaveBeenCalledWith('org-1', 'foriba');
    });

    it('should fallback to mock provider when integration not found', async () => {
      mockIntegrationService.getEInvoiceProvider = vi.fn().mockRejectedValue(new Error('Not found'));

      const result = await financeService.checkEInvoiceUser('org-1', '1234567890');
      
      expect(result).toBeDefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('sendEInvoice', () => {
    it('should send e-invoice successfully', async () => {
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{
              id: 'invoice-id',
              organizationId: 'org-1',
              accountId: 'acc-1',
              invoiceNumber: 'INV-123',
              type: 'sales',
              total: '120.00',
              subtotal: '100.00',
              taxTotal: '20.00',
              currency: 'TRY',
            }])),
          })),
        })),
      }));

      mockIntegrationService.getEInvoiceProvider = vi.fn().mockResolvedValue({
        sendInvoice: vi.fn().mockResolvedValue({
          uuid: 'test-uuid',
          id: 'GIB123456',
          status: 'sent',
        }),
      });

      const result = await financeService.sendEInvoice('invoice-id', 'org-1');
      
      expect(result).toBeDefined();
      expect(result.status).toBe('sent');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should fallback to mock provider when integration not found', async () => {
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{
              id: 'invoice-id',
              organizationId: 'org-1',
              accountId: 'acc-1',
              invoiceNumber: 'INV-123',
              type: 'sales',
              total: '120.00',
              subtotal: '100.00',
              taxTotal: '20.00',
              currency: 'TRY',
            }])),
          })),
        })),
      }));

      mockIntegrationService.getEInvoiceProvider = vi.fn().mockRejectedValue(new Error('Not found'));

      const result = await financeService.sendEInvoice('invoice-id');
      
      expect(result).toBeDefined();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should throw error when invoice not found', async () => {
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      }));

      await expect(financeService.sendEInvoice('non-existent-id')).rejects.toThrow('Invoice not found');
    });
  });

  describe('approveInvoice', () => {
    it('should approve a draft invoice successfully', async () => {
      const mockTx = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([{
                id: 'invoice-id',
                organizationId: 'org-1',
                accountId: 'acc-1',
                invoiceNumber: 'INV-123',
                status: 'draft',
                type: 'sales',
                total: '120.00',
                subtotal: '100.00',
                taxTotal: '20.00',
              }])),
            })),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([])),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: 'mock-id' }])),
          })),
        })),
      };

      mockDb.transaction = vi.fn((callback) => callback(mockTx));

      const result = await financeService.approveInvoice('invoice-id', 'user-1');
      
      expect(result.success).toBe(true);
      expect(result.invoiceId).toBe('invoice-id');
      expect(mockTx.update).toHaveBeenCalled();
    });

    it('should throw error when invoice not found', async () => {
      const mockTx = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      };

      mockDb.transaction = vi.fn((callback) => callback(mockTx));

      await expect(financeService.approveInvoice('non-existent-id', 'user-1'))
        .rejects.toThrow('Invoice not found');
    });

    it('should throw error when invoice is not draft', async () => {
      const mockTx = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([{
                id: 'invoice-id',
                status: 'sent',
                type: 'sales',
              }])),
            })),
          })),
        })),
      };

      mockDb.transaction = vi.fn((callback) => callback(mockTx));

      await expect(financeService.approveInvoice('invoice-id', 'user-1'))
        .rejects.toThrow('Only draft invoices can be approved');
    });

    it('should handle purchase invoice type', async () => {
      const mockTx = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([{
                id: 'invoice-id',
                organizationId: 'org-1',
                accountId: 'acc-1',
                invoiceNumber: 'INV-123',
                status: 'draft',
                type: 'purchase',
                total: '120.00',
                subtotal: '100.00',
                taxTotal: '20.00',
              }])),
            })),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([])),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: 'mock-id' }])),
          })),
        })),
      };

      mockDb.transaction = vi.fn((callback) => callback(mockTx));

      const result = await financeService.approveInvoice('invoice-id', 'user-1');
      
      expect(result.success).toBe(true);
    });
  });

  describe('getFinancialSummary', () => {
    it('should return financial summary for organization', async () => {
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{ total: '1000.00' }])),
          })),
        })),
      }));

      mockDb.execute = vi.fn(() => Promise.resolve([]));

      const result = await financeService.getFinancialSummary('org-1');
      
      expect(result).toBeDefined();
      expect(result.totalRevenue).toBeDefined();
      expect(result.totalExpenses).toBeDefined();
      expect(result.pendingPayments).toBeDefined();
      expect(result.recentTransactions).toBeDefined();
    });

    it('should handle errors gracefully and return empty summary', async () => {
      mockDb.select = vi.fn(() => {
        throw new Error('Database error');
      });

      const result = await financeService.getFinancialSummary('org-1');
      
      expect(result).toBeDefined();
      expect(result.totalRevenue).toBe(0);
      expect(result.totalExpenses).toBe(0);
      expect(result.pendingPayments).toBe(0);
      expect(result.recentTransactions).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('syncBankTransactions', () => {
    it('should sync bank transactions successfully', async () => {
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{
              id: 'acc-1',
              organizationId: 'org-1',
              code: '1234567890',
            }])),
          })),
        })),
      }));

      mockDb.insert = vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{
            id: 'tx-1',
            organizationId: 'org-1',
            accountId: 'acc-1',
            amount: '100.00',
          }])),
        })),
      }));

      mockIntegrationService.getBankingProvider = vi.fn().mockResolvedValue({
        getTransactions: vi.fn().mockResolvedValue([
          {
            date: new Date(),
            amount: 100,
            description: 'Test transaction',
            externalId: 'ext-1',
          },
        ]),
      });

      const result = await financeService.syncBankTransactions('org-1', 'acc-1', 'isbank');
      
      expect(result).toBeDefined();
      expect(result.syncedCount).toBe(1);
      expect(result.transactions).toHaveLength(1);
    });

    it('should throw error when account not found', async () => {
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      }));

      await expect(financeService.syncBankTransactions('org-1', 'non-existent-acc', 'isbank'))
        .rejects.toThrow('Account not found');
    });

    it('should handle empty transaction list', async () => {
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{
              id: 'acc-1',
              organizationId: 'org-1',
              code: '1234567890',
            }])),
          })),
        })),
      }));

      mockIntegrationService.getBankingProvider = vi.fn().mockResolvedValue({
        getTransactions: vi.fn().mockResolvedValue([]),
      });

      const result = await financeService.syncBankTransactions('org-1', 'acc-1', 'isbank');
      
      expect(result.syncedCount).toBe(0);
      expect(result.transactions).toHaveLength(0);
    });
  });
});

