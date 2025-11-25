import { describe, it, expect, vi, beforeEach } from 'vitest';
import { financeService } from '../service.js';

// Mock db
vi.mock('@/db/index.js', () => ({
  db: {
    transaction: vi.fn((callback) => callback({
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 'mock-id' }]))
        }))
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
             returning: vi.fn(() => Promise.resolve([{ id: 'mock-id' }]))
          }))
        }))
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ id: 'mock-id', status: 'draft', total: 100, subtotal: 80, taxTotal: 20, type: 'sales', organizationId: 'org-id', accountId: 'acc-id' }]))
        }))
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([]))
          }))
        }))
      }))
    }))
  }
}));

describe('FinanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an invoice', async () => {
    const invoiceData = {
      organizationId: 'org-1',
      accountId: 'acc-1',
      type: 'sales' as const,
      invoiceDate: new Date(),
      items: [
        { description: 'Item 1', quantity: 1, unitPrice: 100, taxRate: 20 }
      ],
      createdBy: 'user-1'
    };

    const result = await financeService.createInvoice(invoiceData);
    expect(result).toBeDefined();
    expect(result.id).toBe('mock-id');
  });

  it('should approve an invoice', async () => {
    const result = await financeService.approveInvoice('inv-1', 'user-1');
    expect(result.success).toBe(true);
  });
});

