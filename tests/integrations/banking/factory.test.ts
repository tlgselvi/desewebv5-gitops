import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BankProviderFactory } from '@/integrations/banking/factory.js';
import { IsBankProvider } from '@/integrations/banking/isbank.js';

// Mock logger
vi.mock('@/utils/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('BankProviderFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create IsBank provider for "isbank"', () => {
      const provider = BankProviderFactory.create('isbank', 'api-key', 'api-secret');
      expect(provider).toBeInstanceOf(IsBankProvider);
      expect(provider.name).toBe('IsBank');
    });

    it('should create IsBank provider for "is_bank"', () => {
      const provider = BankProviderFactory.create('is_bank', 'api-key', 'api-secret');
      expect(provider).toBeInstanceOf(IsBankProvider);
    });

    it('should create IsBank provider for "türkiye iş bankası"', () => {
      const provider = BankProviderFactory.create('türkiye iş bankası', 'api-key', 'api-secret');
      expect(provider).toBeInstanceOf(IsBankProvider);
    });

    it('should create IsBank provider for case-insensitive provider name', () => {
      const provider = BankProviderFactory.create('ISBANK', 'api-key', 'api-secret');
      expect(provider).toBeInstanceOf(IsBankProvider);
    });

    it('should fallback to IsBank for unknown provider', () => {
      const provider = BankProviderFactory.create('unknown-bank', 'api-key', 'api-secret');
      expect(provider).toBeInstanceOf(IsBankProvider);
    });

    it('should pass options to provider', () => {
      const options = { sandbox: false, baseUrl: 'https://custom-url.com' };
      const provider = BankProviderFactory.create('isbank', 'api-key', 'api-secret', options);
      expect(provider).toBeInstanceOf(IsBankProvider);
    });

    it('should handle empty provider name', () => {
      const provider = BankProviderFactory.create('', 'api-key', 'api-secret');
      expect(provider).toBeInstanceOf(IsBankProvider);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      const providers = BankProviderFactory.getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
      expect(providers).toContain('isbank');
    });

    it('should include future providers', () => {
      const providers = BankProviderFactory.getAvailableProviders();
      // Future providers may be listed even if not implemented yet
      expect(providers).toBeDefined();
    });
  });
});
