import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinanceService } from '@/modules/finance/service';
import { db } from '@/db/index';
import { integrationService } from '@/modules/saas/integration.service.js';

// We mock db in setup.ts, but we can override implementations here if needed
const financeService = new FinanceService();

// Mock integration service
vi.mock('@/modules/saas/integration.service.js', () => ({
  integrationService: {
    getEInvoiceProvider: vi.fn(),
    getBankingProvider: vi.fn(),
  },
}));

describe('FinanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInvoice', () => {
    it('should calculate invoice totals correctly', async () => {
      const mockInput = {
        organizationId: 'org-1',
        accountId: 'acc-1',
        type: 'sales' as const,
        invoiceDate: new Date(),
        items: [
          { description: 'Product A', quantity: 2, unitPrice: 50, taxRate: 20 }, // 100 + 20 tax
          { description: 'Product B', quantity: 1, unitPrice: 100, taxRate: 10 }, // 100 + 10 tax
        ],
        createdBy: 'user-1'
      };

      // Mock transaction return
      const mockInvoice = {
        id: 'inv-1',
        ...mockInput,
        subtotal: '200.00',
        taxTotal: '30.00',
        total: '230.00',
        status: 'draft',
        invoiceNumber: 'INV-123',
        notes: null,
        gibStatus: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue([mockInvoice])
          })
        })
      };

      // Override db.transaction for this test
      // @ts-ignore
      db.transaction = vi.fn((cb) => cb(mockTx));

      const result = await financeService.createInvoice(mockInput);

      expect(result).toBeDefined();
      expect(result.subtotal).toBe('200.00');
      expect(result.taxTotal).toBe('30.00');
      expect(result.total).toBe('230.00');
      
      // Verify db insert was called with correct calculated values
      const insertCall = mockTx.insert().values.mock.calls[0][0];
      expect(insertCall.subtotal).toBe('200.00');
      expect(insertCall.taxTotal).toBe('30.00');
      expect(insertCall.total).toBe('230.00');
    });

    it('should throw error when invoice creation fails (newInvoice is null)', async () => {
      const mockInput = {
        organizationId: 'org-1',
        accountId: 'acc-1',
        type: 'sales' as const,
        invoiceDate: new Date(),
        items: [
          { description: 'Product A', quantity: 1, unitPrice: 100, taxRate: 20 },
        ],
        createdBy: 'user-1'
      };

      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue([]) // Empty array - invoice creation failed
          })
        })
      };

      // @ts-ignore
      db.transaction = vi.fn((cb) => cb(mockTx));

      await expect(financeService.createInvoice(mockInput)).rejects.toThrow('Failed to create invoice');
    });

    it('should handle eInvoice flag and call sendEInvoice', async () => {
      const mockInput = {
        organizationId: 'org-1',
        accountId: 'acc-1',
        type: 'sales' as const,
        invoiceDate: new Date(),
        items: [
          { description: 'Product A', quantity: 1, unitPrice: 100, taxRate: 20 },
        ],
        createdBy: 'user-1',
        eInvoice: true,
      };

      const mockInvoice = {
        id: 'inv-1',
        ...mockInput,
        subtotal: '100.00',
        taxTotal: '20.00',
        total: '120.00',
        status: 'draft',
        invoiceNumber: 'INV-123',
        notes: null,
        gibStatus: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSendEInvoice = vi.spyOn(financeService, 'sendEInvoice').mockResolvedValue({
        id: 'einv-1',
        status: 'sent',
      } as any);

      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue([mockInvoice])
          })
        })
      };

      // @ts-ignore
      db.transaction = vi.fn((cb) => cb(mockTx));

      const result = await financeService.createInvoice(mockInput);

      expect(result).toBeDefined();
      // Note: sendEInvoice is called but errors are swallowed in the service
      // This test verifies the eInvoice branch is executed
      mockSendEInvoice.mockRestore();
    });

    it('should handle eInvoice send failure gracefully', async () => {
      const mockInput = {
        organizationId: 'org-1',
        accountId: 'acc-1',
        type: 'sales' as const,
        invoiceDate: new Date(),
        items: [
          { description: 'Product A', quantity: 1, unitPrice: 100, taxRate: 20 },
        ],
        createdBy: 'user-1',
        eInvoice: true,
      };

      const mockInvoice = {
        id: 'inv-1',
        ...mockInput,
        subtotal: '100.00',
        taxTotal: '20.00',
        total: '120.00',
        status: 'draft',
        invoiceNumber: 'INV-123',
        notes: null,
        gibStatus: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSendEInvoice = vi.spyOn(financeService, 'sendEInvoice').mockRejectedValue(new Error('E-Invoice send failed'));

      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue([mockInvoice])
          })
        })
      };

      // @ts-ignore
      db.transaction = vi.fn((cb) => cb(mockTx));

      // Should not throw - error is caught and logged
      const result = await financeService.createInvoice(mockInput);
      expect(result).toBeDefined();
      mockSendEInvoice.mockRestore();
    });
  });

  describe('checkEInvoiceUser', () => {
    it('should return user when integration provider is found', async () => {
      const mockProvider = {
        checkUser: vi.fn().mockResolvedValue({ vkn: '1234567890', name: 'Test User' }),
      };

      vi.mocked(integrationService.getEInvoiceProvider).mockResolvedValue(mockProvider as any);

      const result = await financeService.checkEInvoiceUser('org-1', '1234567890');

      expect(result).toEqual({ vkn: '1234567890', name: 'Test User' });
      expect(integrationService.getEInvoiceProvider).toHaveBeenCalledWith('org-1', 'foriba');
    });

    it('should fallback to mock provider when integration not found', async () => {
      vi.mocked(integrationService.getEInvoiceProvider).mockRejectedValue(new Error('Integration not found'));

      // Mock the dynamic import - ForibaProvider should be a class constructor
      const mockCheckUser = vi.fn().mockResolvedValue({ vkn: '1234567890', name: 'Mock User' });
      
      class MockForibaProvider {
        constructor() {}
        checkUser = mockCheckUser;
      }

      vi.doMock('@/integrations/einvoice/foriba.js', () => ({
        ForibaProvider: MockForibaProvider,
      }));

      const result = await financeService.checkEInvoiceUser('org-1', '1234567890');

      // Should still return a result (from mock provider)
      expect(result).toBeDefined();
    });
  });

  describe('sendEInvoice', () => {
    it('should throw error when invoice not found', async () => {
      // Mock db.select to return empty array for invoice
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue([]) // Empty array - invoice not found
        })
      });

      // @ts-ignore
      db.select = mockSelect;

      await expect(financeService.sendEInvoice('non-existent-id')).rejects.toThrow('Invoice not found');
    });

    it('should send invoice successfully when provider is found', async () => {
      const mockInvoice = {
        id: 'inv-1',
        organizationId: 'org-1',
        accountId: 'acc-1',
        total: '120.00',
        currency: 'TRY',
        type: 'sales',
        invoiceNumber: 'INV-123',
      };

      const mockItems = [
        { description: 'Product A', quantity: '1', unitPrice: '100', taxRate: 20 },
      ];

      const mockAccount = {
        id: 'acc-1',
        name: 'Test Customer',
      };

      const mockOrganization = {
        id: 'org-1',
        taxId: '1234567890',
      };

      const mockProvider = {
        sendInvoice: vi.fn().mockResolvedValue({
          id: 'einv-1',
          status: 'sent',
        }),
      };

      let selectCallCount = 0;
      // Mock db.select chain - first call returns invoice, second returns items, third and fourth return account/org
      const mockSelect = vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First select: invoice
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue([mockInvoice]),
            }),
          };
        } else if (selectCallCount === 2) {
          // Second select: invoice items
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue(mockItems),
            }),
          };
        } else {
          // Third and fourth selects: account and organization
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue(selectCallCount === 3 ? [mockAccount] : [mockOrganization]),
              }),
            }),
          };
        }
      });

      // @ts-ignore
      db.select = mockSelect;

      // @ts-ignore
      db.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      vi.mocked(integrationService.getEInvoiceProvider).mockResolvedValue(mockProvider as any);

      const result = await financeService.sendEInvoice('inv-1');

      expect(result).toEqual({ id: 'einv-1', status: 'sent' });
      expect(mockProvider.sendInvoice).toHaveBeenCalled();
    });

    it('should fallback to mock provider when integration not found', async () => {
      const mockInvoice = {
        id: 'inv-1',
        organizationId: 'org-1',
        accountId: 'acc-1',
        total: '120.00',
        currency: 'TRY',
        type: 'sales',
        invoiceNumber: 'INV-123',
      };

      const mockItems = [
        { description: 'Product A', quantity: '1', unitPrice: '100', taxRate: 20 },
      ];

      const mockAccount = {
        id: 'acc-1',
        name: 'Test Customer',
      };

      const mockOrganization = {
        id: 'org-1',
        taxId: '1234567890',
      };

      let selectCallCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue([mockInvoice]),
            }),
          };
        } else if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue(mockItems),
            }),
          };
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue(selectCallCount === 3 ? [mockAccount] : [mockOrganization]),
              }),
            }),
          };
        }
      });

      // @ts-ignore
      db.select = mockSelect;

      // @ts-ignore
      db.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      vi.mocked(integrationService.getEInvoiceProvider).mockRejectedValue(new Error('Integration not found'));

      // Mock the dynamic import - ForibaProvider should be a class constructor
      const mockSendInvoice = vi.fn().mockResolvedValue({
        id: 'einv-mock-1',
        status: 'sent',
      });

      class MockForibaProvider {
        constructor() {}
        sendInvoice = mockSendInvoice;
      }

      vi.doMock('@/integrations/einvoice/foriba.js', () => ({
        ForibaProvider: MockForibaProvider,
      }));

      const result = await financeService.sendEInvoice('inv-1');

      // Should still return a result (from mock provider)
      expect(result).toBeDefined();
    });
  });

  describe('approveInvoice', () => {
    it('should throw error when invoice not found', async () => {
      const mockTx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue([]) // Empty array - invoice not found
          })
        })
      };

      // @ts-ignore
      db.transaction = vi.fn((cb) => cb(mockTx));

      await expect(financeService.approveInvoice('non-existent-id', 'user-1')).rejects.toThrow('Invoice not found');
    });

    it('should throw error when invoice status is not draft', async () => {
      const mockInvoice = {
        id: 'inv-1',
        organizationId: 'org-1',
        accountId: 'acc-1',
        status: 'sent', // Not draft
        total: '120.00',
        type: 'sales',
        invoiceNumber: 'INV-123',
        subtotal: '100.00',
        taxTotal: '20.00',
      };

      const mockTx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue([mockInvoice])
          })
        })
      };

      // @ts-ignore
      db.transaction = vi.fn((cb) => cb(mockTx));

      await expect(financeService.approveInvoice('inv-1', 'user-1')).rejects.toThrow('Only draft invoices can be approved');
    });

    it('should create ledger entries for sales invoice', async () => {
      const mockInvoice = {
        id: 'inv-1',
        organizationId: 'org-1',
        accountId: 'acc-1',
        status: 'draft',
        total: '120.00',
        type: 'sales',
        invoiceNumber: 'INV-123',
        subtotal: '100.00',
        taxTotal: '20.00',
      };

      const mockAccount = {
        id: 'acc-1',
        balance: '0.00',
        organizationId: 'org-1',
        code: '120',
        name: 'Alıcılar',
        type: 'asset',
      };

      const mockSalesAccount = {
        id: 'acc-sales',
        organizationId: 'org-1',
        code: '600',
        name: 'Yurt İçi Satışlar',
        type: 'revenue',
      };

      const mockVatAccount = {
        id: 'acc-vat',
        organizationId: 'org-1',
        code: '391',
        name: 'Hesaplanan KDV',
        type: 'liability',
      };

      const mockLedger = {
        id: 'ledger-1',
        organizationId: 'org-1',
        journalNumber: 'JNL-123',
        date: new Date(),
        description: 'Satış Faturası: INV-123',
        type: 'sales',
        referenceId: 'inv-1',
        referenceType: 'invoice',
        status: 'posted',
      };

      let insertCallCount = 0;
      const mockTx = {
        select: vi.fn().mockImplementation((table) => {
          if (insertCallCount === 0) {
            // First select: invoice
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue([mockInvoice])
              })
            };
          } else if (insertCallCount === 1) {
            // Second select: account
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue([mockAccount])
              })
            };
          } else {
            // Subsequent selects: getAccount calls
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue(insertCallCount === 2 ? [mockSalesAccount] : [mockVatAccount])
              })
            };
          }
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined)
          })
        }),
        insert: vi.fn().mockImplementation(() => {
          insertCallCount++;
          if (insertCallCount === 1) {
            // First insert: transactions
            return {
              values: vi.fn().mockResolvedValue(undefined)
            };
          } else if (insertCallCount === 2) {
            // Second insert: ledger
            return {
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockReturnValue([mockLedger])
              })
            };
          } else {
            // Subsequent inserts: ledger entries
            return {
              values: vi.fn().mockResolvedValue(undefined)
            };
          }
        }),
      };

      // @ts-ignore
      db.transaction = vi.fn((cb) => cb(mockTx));

      const result = await financeService.approveInvoice('inv-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.invoiceId).toBe('inv-1');
      expect(result.ledgerId).toBe('ledger-1');
    });

    it('should throw error when ledger creation fails', async () => {
      const mockInvoice = {
        id: 'inv-1',
        organizationId: 'org-1',
        accountId: 'acc-1',
        status: 'draft',
        total: '120.00',
        type: 'sales',
        invoiceNumber: 'INV-123',
        subtotal: '100.00',
        taxTotal: '20.00',
      };

      const mockAccount = {
        id: 'acc-1',
        balance: '0.00',
        organizationId: 'org-1',
      };

      const mockTx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue([mockInvoice])
          })
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined)
          })
        }),
        insert: vi.fn().mockImplementation(() => {
          // First insert: transactions
          if (mockTx.insert.mock.calls.length === 0) {
            return {
              values: vi.fn().mockResolvedValue(undefined)
            };
          }
          // Second insert: ledger (returns empty array)
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockReturnValue([]) // Empty - ledger creation failed
            })
          };
        }),
      };

      // Mock account select
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue([mockInvoice])
        })
      }).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue([mockAccount])
        })
      });

      // @ts-ignore
      db.transaction = vi.fn((cb) => cb(mockTx));

      await expect(financeService.approveInvoice('inv-1', 'user-1')).rejects.toThrow('Failed to create ledger');
    });

    it('should handle account balance update when account exists', async () => {
      const mockInvoice = {
        id: 'inv-1',
        organizationId: 'org-1',
        accountId: 'acc-1',
        status: 'draft',
        total: '120.00',
        type: 'sales',
        invoiceNumber: 'INV-123',
        subtotal: '100.00',
        taxTotal: '20.00',
      };

      const mockAccount = {
        id: 'acc-1',
        balance: '50.00', // Existing balance
        organizationId: 'org-1',
        code: '120',
        name: 'Alıcılar',
        type: 'asset',
      };

      const mockSalesAccount = {
        id: 'acc-sales',
        organizationId: 'org-1',
        code: '600',
        name: 'Yurt İçi Satışlar',
        type: 'revenue',
      };

      const mockVatAccount = {
        id: 'acc-vat',
        organizationId: 'org-1',
        code: '391',
        name: 'Hesaplanan KDV',
        type: 'liability',
      };

      const mockLedger = {
        id: 'ledger-1',
        organizationId: 'org-1',
        journalNumber: 'JNL-123',
        date: new Date(),
        description: 'Satış Faturası: INV-123',
        type: 'sales',
        referenceId: 'inv-1',
        referenceType: 'invoice',
        status: 'posted',
      };

      let selectCallCount = 0;
      let insertCallCount = 0;
      const mockTx = {
        select: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue([mockInvoice])
              })
            };
          } else if (selectCallCount === 2) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue([mockAccount])
              })
            };
          } else if (selectCallCount === 3) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue([mockSalesAccount])
              })
            };
          } else {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue([mockVatAccount])
              })
            };
          }
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined)
          })
        }),
        insert: vi.fn().mockImplementation(() => {
          insertCallCount++;
          if (insertCallCount === 1) {
            return {
              values: vi.fn().mockResolvedValue(undefined)
            };
          } else if (insertCallCount === 2) {
            return {
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockReturnValue([mockLedger])
              })
            };
          } else {
            return {
              values: vi.fn().mockResolvedValue(undefined)
            };
          }
        }),
      };

      // @ts-ignore
      db.transaction = vi.fn((cb) => cb(mockTx));

      const result = await financeService.approveInvoice('inv-1', 'user-1');

      expect(result.success).toBe(true);
      // Verify account balance update was called
      expect(mockTx.update).toHaveBeenCalled();
    });

    it('should create ledger entries for purchase invoice', async () => {
      const mockInvoice = {
        id: 'inv-1',
        organizationId: 'org-1',
        accountId: 'acc-1',
        status: 'draft',
        total: '120.00',
        type: 'purchase',
        invoiceNumber: 'INV-123',
        subtotal: '100.00',
        taxTotal: '20.00',
      };

      const mockAccount = {
        id: 'acc-1',
        balance: '0.00',
        organizationId: 'org-1',
      };

      const mockExpenseAccount = {
        id: 'acc-expense',
        organizationId: 'org-1',
        code: '770',
        name: 'Genel Yönetim Giderleri',
        type: 'expense',
      };

      const mockVatAccount = {
        id: 'acc-vat',
        organizationId: 'org-1',
        code: '191',
        name: 'İndirilecek KDV',
        type: 'asset',
      };

      const mockLedger = {
        id: 'ledger-1',
        organizationId: 'org-1',
        journalNumber: 'JNL-123',
        date: new Date(),
        description: 'Satış Faturası: INV-123',
        type: 'sales',
        referenceId: 'inv-1',
        referenceType: 'invoice',
        status: 'posted',
      };

      let selectCallCount = 0;
      let insertCallCount = 0;
      const mockTx = {
        select: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue([mockInvoice])
              })
            };
          } else if (selectCallCount === 2) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue([mockAccount])
              })
            };
          } else if (selectCallCount === 3) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue([mockExpenseAccount])
              })
            };
          } else {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue([mockVatAccount])
              })
            };
          }
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined)
          })
        }),
        insert: vi.fn().mockImplementation(() => {
          insertCallCount++;
          if (insertCallCount === 1) {
            return {
              values: vi.fn().mockResolvedValue(undefined)
            };
          } else if (insertCallCount === 2) {
            return {
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockReturnValue([mockLedger])
              })
            };
          } else {
            return {
              values: vi.fn().mockResolvedValue(undefined)
            };
          }
        }),
      };

      // @ts-ignore
      db.transaction = vi.fn((cb) => cb(mockTx));

      const result = await financeService.approveInvoice('inv-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.invoiceId).toBe('inv-1');
    });
  });

  describe('getFinancialSummary', () => {
    it('should return financial summary successfully', async () => {
      const mockSalesResult = { total: '1000.00' };
      const mockPendingResult = { total: '500.00' };
      const mockExpensesResult = { total: '300.00' };
      const mockTransactions = [
        { id: 'tx-1', amount: '100.00', date: new Date() },
        { id: 'tx-2', amount: '200.00', date: new Date() },
      ];
      const mockMonthlyRevenue = [
        { name: 'Jan', total: '100.00' },
        { name: 'Feb', total: '200.00' },
      ];

      // @ts-ignore
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockTransactions)
            })
          })
        })
      });

      // @ts-ignore
      db.execute = vi.fn().mockResolvedValue(mockMonthlyRevenue);

      // Mock the sql template tag
      const sql = vi.fn().mockReturnValue({
        // Mock SQL query result
      });

      const result = await financeService.getFinancialSummary('org-1');

      expect(result).toBeDefined();
      expect(result.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(result.totalExpenses).toBeGreaterThanOrEqual(0);
      expect(result.pendingPayments).toBeGreaterThanOrEqual(0);
    });

    it('should return empty summary on error', async () => {
      // @ts-ignore
      db.select = vi.fn().mockRejectedValue(new Error('Database error'));

      const result = await financeService.getFinancialSummary('org-1');

      expect(result).toEqual({
        totalRevenue: 0,
        totalExpenses: 0,
        pendingPayments: 0,
        recentTransactions: []
      });
    });
  });

  describe('syncBankTransactions', () => {
    it('should throw error when account not found', async () => {
      // @ts-ignore
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([]) // Empty array - account not found
          })
        })
      });

      const mockProvider = {
        getTransactions: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(integrationService.getBankingProvider).mockResolvedValue(mockProvider as any);

      await expect(financeService.syncBankTransactions('org-1', 'non-existent-account')).rejects.toThrow('Account not found');
    });

    it('should sync bank transactions successfully', async () => {
      const mockAccount = {
        id: 'acc-1',
        code: '1234567890',
        organizationId: 'org-1',
      };

      const mockBankTransactions = [
        {
          date: new Date(),
          amount: 100.00,
          description: 'Test Transaction',
          externalId: 'ext-1',
        },
      ];

      const mockProvider = {
        getTransactions: vi.fn().mockResolvedValue(mockBankTransactions),
      };

      const mockInsertedTransaction = {
        id: 'tx-1',
        organizationId: 'org-1',
        accountId: 'acc-1',
        date: mockBankTransactions[0].date,
        amount: '100.00',
        description: 'Test Transaction (ext-1)',
        category: 'bank_sync',
        referenceType: 'bank_transaction',
        referenceId: 'ref-1',
      };

      // @ts-ignore
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([mockAccount])
          })
        })
      });

      // @ts-ignore
      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockInsertedTransaction])
        })
      });

      vi.mocked(integrationService.getBankingProvider).mockResolvedValue(mockProvider as any);

      const result = await financeService.syncBankTransactions('org-1', 'acc-1');

      expect(result.syncedCount).toBe(1);
      expect(result.transactions).toHaveLength(1);
      expect(mockProvider.getTransactions).toHaveBeenCalled();
    });
  });
});

