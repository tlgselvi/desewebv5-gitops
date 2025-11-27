import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IsBankProvider } from '@/integrations/banking/isbank.js';
import type { BankTransaction } from '@/integrations/banking/types.js';

// Mock logger
vi.mock('@/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock global fetch
global.fetch = vi.fn();

describe('IsBankProvider', () => {
  let provider: IsBankProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new IsBankProvider('test-api-key', 'test-api-secret', { sandbox: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with sandbox mode by default', () => {
      const sandboxProvider = new IsBankProvider('key', 'secret');
      expect(sandboxProvider).toBeInstanceOf(IsBankProvider);
    });

    it('should create provider with production mode', () => {
      const prodProvider = new IsBankProvider('key', 'secret', { sandbox: false });
      expect(prodProvider).toBeInstanceOf(IsBankProvider);
    });

    it('should use custom baseUrl when provided', () => {
      const customProvider = new IsBankProvider('key', 'secret', {
        baseUrl: 'https://custom-url.com',
      });
      expect(customProvider).toBeInstanceOf(IsBankProvider);
    });
  });

  describe('getBalance', () => {
    it('should return mock balance in sandbox mode', async () => {
      const balance = await provider.getBalance('1234567890');
      expect(balance).toBe(125000.50);
    });

    it('should return mock balance when apiKey is missing', async () => {
      const providerWithoutKey = new IsBankProvider('', 'secret', { sandbox: false });
      const balance = await providerWithoutKey.getBalance('1234567890');
      expect(balance).toBe(125000.50);
    });

    it('should return mock balance when apiSecret is missing', async () => {
      const providerWithoutSecret = new IsBankProvider('key', '', { sandbox: false });
      const balance = await providerWithoutSecret.getBalance('1234567890');
      expect(balance).toBe(125000.50);
    });

    it('should make API call in production mode', async () => {
      const prodProvider = new IsBankProvider('key', 'secret', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: '50000.75' }),
      });

      const balance = await prodProvider.getBalance('1234567890');
      expect(balance).toBe(50000.75);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/accounts/1234567890/balance'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer key',
            'X-API-Secret': 'secret',
          }),
        })
      );
    });

    it('should throw error when API call fails', async () => {
      const prodProvider = new IsBankProvider('key', 'secret', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(prodProvider.getBalance('1234567890')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const prodProvider = new IsBankProvider('key', 'secret', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(prodProvider.getBalance('1234567890')).rejects.toThrow('Network error');
    });
  });

  describe('getTransactions', () => {
    it('should return mock transactions in sandbox mode', async () => {
      const transactions = await provider.getTransactions('1234567890');
      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBeGreaterThan(0);
      expect(transactions[0]).toHaveProperty('externalId');
      expect(transactions[0]).toHaveProperty('date');
      expect(transactions[0]).toHaveProperty('amount');
      expect(transactions[0]).toHaveProperty('description');
      expect(transactions[0]).toHaveProperty('type');
    });

    it('should return mock transactions when apiKey is missing', async () => {
      const providerWithoutKey = new IsBankProvider('', 'secret', { sandbox: false });
      const transactions = await providerWithoutKey.getTransactions('1234567890');
      expect(transactions.length).toBeGreaterThan(0);
    });

    it('should use default fromDate (30 days ago) when not provided', async () => {
      const transactions = await provider.getTransactions('1234567890');
      expect(transactions).toBeDefined();
    });

    it('should use provided fromDate', async () => {
      const fromDate = new Date('2024-01-01');
      const transactions = await provider.getTransactions('1234567890', fromDate);
      expect(transactions).toBeDefined();
    });

    it('should make API call in production mode', async () => {
      const prodProvider = new IsBankProvider('key', 'secret', { sandbox: false });
      
      const mockTransactions = [
        {
          id: 'tx-1',
          date: '2024-01-15T10:00:00Z',
          amount: '1000.00',
          description: 'Test transaction',
          counterparty: 'Test Company',
        },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: mockTransactions }),
      });

      const transactions = await prodProvider.getTransactions('1234567890');
      expect(transactions.length).toBe(1);
      expect(transactions[0].externalId).toBe('tx-1');
      expect(transactions[0].amount).toBe(1000.00);
      expect(transactions[0].type).toBe('incoming');
    });

    it('should map outgoing transactions correctly', async () => {
      const prodProvider = new IsBankProvider('key', 'secret', { sandbox: false });
      
      const mockTransactions = [
        {
          id: 'tx-1',
          date: '2024-01-15T10:00:00Z',
          amount: '-500.00',
          description: 'Payment',
        },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: mockTransactions }),
      });

      const transactions = await prodProvider.getTransactions('1234567890');
      expect(transactions[0].type).toBe('outgoing');
      expect(transactions[0].amount).toBe(-500.00);
    });

    it('should handle API errors', async () => {
      const prodProvider = new IsBankProvider('key', 'secret', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(prodProvider.getTransactions('1234567890')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const prodProvider = new IsBankProvider('key', 'secret', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(prodProvider.getTransactions('1234567890')).rejects.toThrow('Network error');
    });

    it('should format date correctly in API call', async () => {
      const prodProvider = new IsBankProvider('key', 'secret', { sandbox: false });
      const fromDate = new Date('2024-01-15T10:00:00Z');
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [] }),
      });

      await prodProvider.getTransactions('1234567890', fromDate);
      
      const callUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callUrl).toContain('fromDate=2024-01-15');
    });
  });

  describe('transfer', () => {
    const mockTransferRequest = {
      fromAccount: '1234567890',
      toAccount: '0987654321',
      amount: 1000.00,
      currency: 'TRY',
      description: 'Test transfer',
    };

    it('should return mock transfer response in sandbox mode', async () => {
      const result = await provider.transfer(mockTransferRequest);
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.transactionId).toContain('TRX-');
      expect(result.amount).toBe(1000.00);
      expect(result.fee).toBeDefined();
    });

    it('should return mock response when credentials are missing', async () => {
      const providerWithoutCreds = new IsBankProvider('', 'secret', { sandbox: false });
      const result = await providerWithoutCreds.transfer(mockTransferRequest);
      expect(result.status).toBe('completed');
    });

    it('should make API call in production mode', async () => {
      const prodProvider = new IsBankProvider('key', 'secret', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactionId: 'TRX-PROD-123',
          status: 'completed',
          amount: '1000.00',
          fee: '1.00',
          completedAt: '2024-01-15T10:00:00Z',
        }),
      });

      const result = await prodProvider.transfer(mockTransferRequest);
      expect(result.status).toBe('completed');
      expect(result.transactionId).toBe('TRX-PROD-123');
      expect(result.amount).toBe(1000.00);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle API errors and return failed status', async () => {
      const prodProvider = new IsBankProvider('key', 'secret', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'Insufficient funds' },
        }),
      });

      const result = await prodProvider.transfer(mockTransferRequest);
      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBeDefined();
    });

    it('should handle network errors', async () => {
      const prodProvider = new IsBankProvider('key', 'secret', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await prodProvider.transfer(mockTransferRequest);
      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBeDefined();
    });

    it('should include bank code for EFT transfers', async () => {
      const prodProvider = new IsBankProvider('key', 'secret', { sandbox: false });
      const eftRequest = {
        ...mockTransferRequest,
        toBankCode: '64', // Ziraat Bank
      };
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactionId: 'TRX-EFT-123',
          status: 'completed',
          amount: '1000.00',
        }),
      });

      await prodProvider.transfer(eftRequest);
      
      const requestBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]?.body as string);
      expect(requestBody.toBankCode).toBe('64');
    });
  });
});
