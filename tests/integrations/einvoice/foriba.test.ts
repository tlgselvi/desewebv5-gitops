import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ForibaProvider } from '@/integrations/einvoice/foriba.js';
import type { EInvoiceUser, EInvoiceDocument } from '@/integrations/einvoice/types.js';

// Mock logger
vi.mock('@/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123'),
}));

// Mock UBLGenerator
vi.mock('@/integrations/einvoice/ubl-generator.js', () => ({
  UBLGenerator: {
    generateInvoice: vi.fn(() => '<?xml version="1.0"?><Invoice></Invoice>'),
  },
}));

// Mock retry utility
vi.mock('@/utils/retry.js', () => ({
  retry: vi.fn((fn) => fn()),
  isRetryableHttpError: vi.fn(() => true),
}));

// Mock global fetch
global.fetch = vi.fn();

describe('ForibaProvider', () => {
  let provider: ForibaProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ForibaProvider('test-user', 'test-pass', { sandbox: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with sandbox mode by default', () => {
      const sandboxProvider = new ForibaProvider('user', 'pass');
      expect(sandboxProvider).toBeInstanceOf(ForibaProvider);
    });

    it('should create provider with production mode', () => {
      const prodProvider = new ForibaProvider('user', 'pass', { sandbox: false });
      expect(prodProvider).toBeInstanceOf(ForibaProvider);
    });

    it('should use custom baseUrl when provided', () => {
      const customProvider = new ForibaProvider('user', 'pass', {
        baseUrl: 'https://custom-url.com',
      });
      expect(customProvider).toBeInstanceOf(ForibaProvider);
    });
  });

  describe('checkUser', () => {
    it('should return mock user in sandbox mode for test VKN', async () => {
      const user = await provider.checkUser('1111111111');
      expect(user).toBeDefined();
      expect(user?.identifier).toBe('1111111111');
      expect(user?.title).toBe('MOCK MÜKELLEF A.Ş.');
    });

    it('should return null in sandbox mode for unknown VKN', async () => {
      const user = await provider.checkUser('9999999999');
      expect(user).toBeNull();
    });

    it('should return mock user when credentials are missing', async () => {
      const providerWithoutCreds = new ForibaProvider('', 'pass', { sandbox: false });
      const user = await providerWithoutCreds.checkUser('1111111111');
      expect(user).toBeDefined();
    });

    it('should make API call in production mode', async () => {
      const prodProvider = new ForibaProvider('user', 'pass', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          identifier: '1234567890',
          alias: 'urn:mail:defaultpk',
          title: 'Test Company',
          type: 'private',
          firstCreationTime: '2020-01-01T00:00:00Z',
        }),
      });

      const user = await prodProvider.checkUser('1234567890');
      expect(user).toBeDefined();
      expect(user?.identifier).toBe('1234567890');
      expect(user?.title).toBe('Test Company');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should return null for 404 response', async () => {
      const prodProvider = new ForibaProvider('user', 'pass', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const user = await prodProvider.checkUser('1234567890');
      expect(user).toBeNull();
    });

    it('should throw error for non-404 errors', async () => {
      const prodProvider = new ForibaProvider('user', 'pass', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(prodProvider.checkUser('1234567890')).rejects.toThrow();
    });
  });

  describe('sendInvoice', () => {
    const mockInvoiceData = {
      receiver: {
        vkn: '1234567890',
        name: 'Test Customer',
      },
      payableAmount: 1000.00,
      currency: 'TRY',
      profileId: 'TICARIFATURA' as const,
      typeCode: 'SATIS' as const,
      items: [
        {
          description: 'Test Item',
          quantity: 1,
          unitPrice: 1000.00,
          taxRate: 20,
        },
      ],
    };

    it('should return mock invoice in sandbox mode', async () => {
      const result = await provider.sendInvoice(mockInvoiceData);
      expect(result).toBeDefined();
      expect(result.uuid).toBeDefined();
      expect(result.status).toBe('queued');
      expect(result.payableAmount).toBe(1000.00);
    });

    it('should return mock invoice when credentials are missing', async () => {
      const providerWithoutCreds = new ForibaProvider('', 'pass', { sandbox: false });
      const result = await providerWithoutCreds.sendInvoice(mockInvoiceData);
      expect(result).toBeDefined();
      expect(result.status).toBe('queued');
    });

    it('should make API call in production mode', async () => {
      const prodProvider = new ForibaProvider('user', 'pass', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        text: async () => '<?xml version="1.0"?><Invoice><UUID>test-uuid</UUID><ID>GIB123</ID></Invoice>',
      });

      const result = await prodProvider.sendInvoice(mockInvoiceData);
      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const prodProvider = new ForibaProvider('user', 'pass', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Error message',
      });

      await expect(prodProvider.sendInvoice(mockInvoiceData)).rejects.toThrow();
    });
  });

  describe('getInvoiceStatus', () => {
    it('should return mock status in sandbox mode', async () => {
      const status = await provider.getInvoiceStatus('test-uuid-123');
      expect(['approved', 'processing']).toContain(status);
    });

    it('should return mock status when credentials are missing', async () => {
      const providerWithoutCreds = new ForibaProvider('', 'pass', { sandbox: false });
      const status = await providerWithoutCreds.getInvoiceStatus('test-uuid-123');
      expect(status).toBeDefined();
    });

    it('should make API call in production mode', async () => {
      const prodProvider = new ForibaProvider('user', 'pass', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'approved' }),
      });

      const status = await prodProvider.getInvoiceStatus('test-uuid-123');
      expect(status).toBe('approved');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const prodProvider = new ForibaProvider('user', 'pass', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(prodProvider.getInvoiceStatus('test-uuid-123')).rejects.toThrow();
    });
  });
});

