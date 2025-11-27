import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntegrationService } from '@/modules/saas/integration.service.js';
import { db } from '@/db/index.js';
import { logger } from '@/utils/logger.js';
import { credentialEncryption } from '@/services/integrations/encryption.js';
import { BankProviderFactory } from '@/integrations/banking/factory.js';
import { ForibaProvider } from '@/integrations/einvoice/foriba.js';
import { MetaWhatsAppProvider } from '@/integrations/whatsapp/meta.js';

// Mock dependencies
vi.mock('@/db/index.js');
vi.mock('@/utils/logger.js');
vi.mock('@/services/integrations/encryption.js');
vi.mock('@/integrations/banking/factory.js');
vi.mock('@/integrations/einvoice/foriba.js', () => ({
  ForibaProvider: vi.fn(),
}));
vi.mock('@/integrations/whatsapp/meta.js', () => ({
  MetaWhatsAppProvider: vi.fn(),
}));

describe('IntegrationService', () => {
  let integrationService: IntegrationService;
  const mockDb = db as any;

  beforeEach(() => {
    vi.clearAllMocks();
    integrationService = new IntegrationService();
    
    // Default encryption mocks
    vi.mocked(credentialEncryption.encrypt).mockImplementation((val: string) => `encrypted_${val}`);
    vi.mocked(credentialEncryption.decrypt).mockImplementation((val: string) => val.replace('encrypted_', ''));
  });

  describe('createIntegration', () => {
    it('should create integration successfully', async () => {
      const mockIntegration = {
        id: 'int-1',
        organizationId: 'org-1',
        provider: 'isbank',
        category: 'banking',
        apiKey: 'encrypted_key',
        apiSecret: 'encrypted_secret',
        isActive: true,
        isVerified: false,
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockIntegration]),
        }),
      });

      const result = await integrationService.createIntegration({
        organizationId: 'org-1',
        provider: 'isbank',
        category: 'banking',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      });

      expect(result).toEqual(mockIntegration);
      expect(credentialEncryption.encrypt).toHaveBeenCalledWith('test-key');
      expect(credentialEncryption.encrypt).toHaveBeenCalledWith('test-secret');
      expect(logger.info).toHaveBeenCalled();
    });

    it('should create integration without credentials', async () => {
      const mockIntegration = {
        id: 'int-1',
        organizationId: 'org-1',
        provider: 'foriba',
        category: 'einvoice',
        isActive: true,
        isVerified: false,
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockIntegration]),
        }),
      });

      const result = await integrationService.createIntegration({
        organizationId: 'org-1',
        provider: 'foriba',
        category: 'einvoice',
      });

      expect(result).toEqual(mockIntegration);
    });

    it('should throw error when creation fails', async () => {
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        integrationService.createIntegration({
          organizationId: 'org-1',
          provider: 'isbank',
          category: 'banking',
        })
      ).rejects.toThrow('Failed to create integration');
    });
  });

  describe('getIntegration', () => {
    it('should get integration with decrypted credentials', async () => {
      const mockIntegration = {
        id: 'int-1',
        organizationId: 'org-1',
        provider: 'isbank',
        category: 'banking',
        apiKey: 'encrypted_key',
        apiSecret: 'encrypted_secret',
        config: '{"sandbox": true}',
      };

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockIntegration]),
          }),
        }),
      });

      const result = await integrationService.getIntegration('int-1', 'org-1');

      expect(result.apiKey).toBe('key');
      expect(result.apiSecret).toBe('secret');
      expect(result.config).toEqual({ sandbox: true });
    });

    it('should throw error when integration not found', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        integrationService.getIntegration('non-existent', 'org-1')
      ).rejects.toThrow('Integration not found');
    });
  });

  describe('getIntegrationsByOrganization', () => {
    it('should return integrations with masked credentials', async () => {
      const mockIntegrations = [
        {
          id: 'int-1',
          organizationId: 'org-1',
          provider: 'isbank',
          category: 'banking',
          apiKey: 'encrypted_key',
          apiSecret: 'encrypted_secret',
          config: '{"sandbox": true}',
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockIntegrations),
        }),
      });

      const result = await integrationService.getIntegrationsByOrganization('org-1');

      expect(result[0].apiKey).toBe('***encrypted***');
      expect(result[0].apiSecret).toBe('***encrypted***');
      expect(result[0].config).toEqual({ sandbox: true });
    });
  });

  describe('updateIntegration', () => {
    it('should update integration successfully', async () => {
      const mockUpdated = {
        id: 'int-1',
        organizationId: 'org-1',
        apiKey: 'encrypted_new_key',
        updatedAt: new Date(),
      };

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdated]),
          }),
        }),
      });

      const result = await integrationService.updateIntegration('int-1', 'org-1', {
        apiKey: 'new-key',
      });

      expect(result).toEqual(mockUpdated);
      expect(credentialEncryption.encrypt).toHaveBeenCalledWith('new-key');
      expect(logger.info).toHaveBeenCalled();
    });

    it('should throw error when integration not found', async () => {
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        integrationService.updateIntegration('non-existent', 'org-1', {})
      ).rejects.toThrow('Integration not found');
    });
  });

  describe('deleteIntegration', () => {
    it('should delete integration successfully', async () => {
      const mockDeleted = {
        id: 'int-1',
        organizationId: 'org-1',
      };

      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockDeleted]),
        }),
      });

      const result = await integrationService.deleteIntegration('int-1', 'org-1');

      expect(result).toEqual(mockDeleted);
      expect(logger.info).toHaveBeenCalled();
    });

    it('should throw error when integration not found', async () => {
      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        integrationService.deleteIntegration('non-existent', 'org-1')
      ).rejects.toThrow('Integration not found');
    });
  });

  describe('testConnection', () => {
    it('should test banking connection successfully', async () => {
      const mockIntegration = {
        id: 'int-1',
        organizationId: 'org-1',
        provider: 'isbank',
        category: 'banking',
        apiKey: 'key',
        apiSecret: 'secret',
      };

      const mockProvider = {
        getBalance: vi.fn().mockResolvedValue(1000),
      };

      vi.spyOn(integrationService, 'getIntegration').mockResolvedValue(mockIntegration as any);
      vi.mocked(BankProviderFactory.create).mockReturnValue(mockProvider as any);

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{}]),
        }),
      });

      const result = await integrationService.testConnection('int-1', 'org-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
    });

    it('should test einvoice connection successfully', async () => {
      const mockIntegration = {
        id: 'int-1',
        organizationId: 'org-1',
        provider: 'foriba',
        category: 'einvoice',
        apiKey: 'key',
        apiSecret: 'secret',
      };

      const mockProvider = {
        checkUser: vi.fn().mockResolvedValue({}),
      };

      vi.spyOn(integrationService, 'getIntegration').mockResolvedValue(mockIntegration as any);
      // ForibaProvider is a class constructor, mock it properly
      vi.mocked(ForibaProvider).mockImplementation(() => mockProvider as any);

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{}]),
        }),
      });

      const result = await integrationService.testConnection('int-1', 'org-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
    });

    it('should test whatsapp connection successfully', async () => {
      const mockIntegration = {
        id: 'int-1',
        organizationId: 'org-1',
        provider: 'meta',
        category: 'whatsapp',
        apiKey: 'key',
        config: { phoneNumberId: '123456' },
      };

      const mockProvider = {
        validateNumber: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(integrationService, 'getIntegration').mockResolvedValue(mockIntegration as any);
      // MetaWhatsAppProvider is a class constructor, mock it properly
      vi.mocked(MetaWhatsAppProvider).mockImplementation(() => mockProvider as any);

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{}]),
        }),
      });

      const result = await integrationService.testConnection('int-1', 'org-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
    });

    it('should return error for unsupported category', async () => {
      const mockIntegration = {
        id: 'int-1',
        organizationId: 'org-1',
        category: 'unsupported',
      };

      vi.spyOn(integrationService, 'getIntegration').mockResolvedValue(mockIntegration as any);

      const result = await integrationService.testConnection('int-1', 'org-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not implemented');
    });

    it('should handle connection test errors gracefully', async () => {
      const mockIntegration = {
        id: 'int-1',
        organizationId: 'org-1',
        provider: 'isbank',
        category: 'banking',
        apiKey: 'key',
        apiSecret: 'secret',
      };

      vi.spyOn(integrationService, 'getIntegration').mockResolvedValue(mockIntegration as any);
      vi.mocked(BankProviderFactory.create).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const result = await integrationService.testConnection('int-1', 'org-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Connection failed');
    });

    it('should handle getIntegration error in testConnection', async () => {
      // Mock getIntegration to throw error - testConnection should catch it
      const getIntegrationSpy = vi.spyOn(integrationService, 'getIntegration');
      getIntegrationSpy.mockRejectedValue(new Error('Integration not found'));

      // testConnection catches errors in try-catch and returns { success: false, message: ... }
      const result = await integrationService.testConnection('int-1', 'org-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Integration not found');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getBankingProvider', () => {
    it('should return banking provider successfully', async () => {
      const mockIntegrations = [
        {
          id: 'int-1',
          organizationId: 'org-1',
          provider: 'isbank',
          category: 'banking',
          isActive: true,
          config: { sandbox: true },
        },
      ];

      const mockIntegration = {
        id: 'int-1',
        organizationId: 'org-1',
        provider: 'isbank',
        category: 'banking',
        apiKey: 'key',
        apiSecret: 'secret',
        config: { sandbox: true },
      };

      const mockProvider = { getBalance: vi.fn() };

      vi.spyOn(integrationService, 'getIntegrationsByOrganization').mockResolvedValue(mockIntegrations as any);
      vi.spyOn(integrationService, 'getIntegration').mockResolvedValue(mockIntegration as any);
      vi.mocked(BankProviderFactory.create).mockReturnValue(mockProvider as any);

      const result = await integrationService.getBankingProvider('org-1', 'isbank');

      expect(result).toBe(mockProvider);
      expect(BankProviderFactory.create).toHaveBeenCalledWith('isbank', 'key', 'secret', { sandbox: true });
    });

    it('should throw error when banking integration not found', async () => {
      vi.spyOn(integrationService, 'getIntegrationsByOrganization').mockResolvedValue([]);

      await expect(
        integrationService.getBankingProvider('org-1', 'isbank')
      ).rejects.toThrow('Banking integration not found');
    });

    it('should throw error when integration is not active', async () => {
      const mockIntegrations = [
        {
          id: 'int-1',
          organizationId: 'org-1',
          provider: 'isbank',
          category: 'banking',
          isActive: false,
        },
      ];

      vi.spyOn(integrationService, 'getIntegrationsByOrganization').mockResolvedValue(mockIntegrations as any);

      await expect(
        integrationService.getBankingProvider('org-1', 'isbank')
      ).rejects.toThrow('Banking integration not found');
    });
  });

  describe('getEInvoiceProvider', () => {
    it('should return einvoice provider successfully', async () => {
      const mockIntegrations = [
        {
          id: 'int-1',
          organizationId: 'org-1',
          provider: 'foriba',
          category: 'einvoice',
          isActive: true,
          config: { sandbox: true },
        },
      ];

      const mockIntegration = {
        id: 'int-1',
        organizationId: 'org-1',
        provider: 'foriba',
        category: 'einvoice',
        apiKey: 'key',
        apiSecret: 'secret',
        config: { sandbox: true },
      };

      const mockProvider = { checkUser: vi.fn() };

      vi.spyOn(integrationService, 'getIntegrationsByOrganization').mockResolvedValue(mockIntegrations as any);
      vi.spyOn(integrationService, 'getIntegration').mockResolvedValue(mockIntegration as any);
      // ForibaProvider is a class constructor, mock it properly
      vi.mocked(ForibaProvider).mockImplementation(() => mockProvider as any);

      const result = await integrationService.getEInvoiceProvider('org-1', 'foriba');

      expect(result).toBe(mockProvider);
      expect(ForibaProvider).toHaveBeenCalledWith('key', 'secret', { sandbox: true });
    });

    it('should throw error when einvoice integration not found', async () => {
      vi.spyOn(integrationService, 'getIntegrationsByOrganization').mockResolvedValue([]);

      await expect(
        integrationService.getEInvoiceProvider('org-1', 'foriba')
      ).rejects.toThrow('E-Invoice integration not found');
    });
  });

  describe('getWhatsAppProvider', () => {
    it('should return whatsapp provider successfully', async () => {
      const mockIntegrations = [
        {
          id: 'int-1',
          organizationId: 'org-1',
          provider: 'meta',
          category: 'whatsapp',
          isActive: true,
          config: { phoneNumberId: '123456', sandbox: true },
        },
      ];

      const mockIntegration = {
        id: 'int-1',
        organizationId: 'org-1',
        provider: 'meta',
        category: 'whatsapp',
        apiKey: 'key',
        config: { phoneNumberId: '123456', sandbox: true },
      };

      const mockProvider = { validateNumber: vi.fn() };

      vi.spyOn(integrationService, 'getIntegrationsByOrganization').mockResolvedValue(mockIntegrations as any);
      vi.spyOn(integrationService, 'getIntegration').mockResolvedValue(mockIntegration as any);
      // MetaWhatsAppProvider is a class constructor, mock it properly
      vi.mocked(MetaWhatsAppProvider).mockImplementation(() => mockProvider as any);

      const result = await integrationService.getWhatsAppProvider('org-1', 'meta');

      expect(result).toBe(mockProvider);
      expect(MetaWhatsAppProvider).toHaveBeenCalledWith('123456', 'key', { sandbox: true });
    });

    it('should throw error when whatsapp integration not found', async () => {
      vi.spyOn(integrationService, 'getIntegrationsByOrganization').mockResolvedValue([]);

      await expect(
        integrationService.getWhatsAppProvider('org-1', 'meta')
      ).rejects.toThrow('WhatsApp integration not found');
    });
  });
});

