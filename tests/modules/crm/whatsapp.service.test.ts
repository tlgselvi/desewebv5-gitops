import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CRMWhatsAppService } from '@/modules/crm/whatsapp.service.js';
import { db } from '@/db/index.js';
import { MetaWhatsAppProvider } from '@/integrations/whatsapp/meta.js';

// Mock dependencies
vi.mock('@/db/index.js');
vi.mock('@/integrations/whatsapp/meta.js');

describe('CRMWhatsAppService', () => {
  let whatsAppService: CRMWhatsAppService;
  const mockProvider = {
    sendMessage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(MetaWhatsAppProvider).mockImplementation(() => mockProvider as any);
    whatsAppService = new CRMWhatsAppService();
  });

  describe('sendMessageToContact', () => {
    it('should send message to contact successfully', async () => {
      const mockContact = {
        id: 'contact-1',
        organizationId: 'org-1',
        phone: '+905551234567',
        name: 'Test Contact',
      };

      const mockResponse = {
        status: 'sent',
        messageId: 'msg-123',
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockContact]),
        }),
      } as any);

      mockProvider.sendMessage.mockResolvedValue(mockResponse);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue([{
          id: 'activity-1',
          type: 'whatsapp',
          status: 'completed',
        }]),
      } as any);

      const result = await whatsAppService.sendMessageToContact('contact-1', 'Hello', 'user-1');

      expect(result).toEqual(mockResponse);
      expect(mockProvider.sendMessage).toHaveBeenCalledWith({
        to: '+905551234567',
        type: 'text',
        content: 'Hello',
      });
      expect(db.insert).toHaveBeenCalled();
    });

    it('should clean phone number starting with 0', async () => {
      const mockContact = {
        id: 'contact-1',
        organizationId: 'org-1',
        phone: '05551234567',
        name: 'Test Contact',
      };

      const mockResponse = {
        status: 'sent',
        messageId: 'msg-123',
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockContact]),
        }),
      } as any);

      mockProvider.sendMessage.mockResolvedValue(mockResponse);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue([{}]),
      } as any);

      await whatsAppService.sendMessageToContact('contact-1', 'Hello', 'user-1');

      expect(mockProvider.sendMessage).toHaveBeenCalledWith({
        to: '+905551234567',
        type: 'text',
        content: 'Hello',
      });
    });

    it('should clean phone number without country code', async () => {
      const mockContact = {
        id: 'contact-1',
        organizationId: 'org-1',
        phone: '5551234567',
        name: 'Test Contact',
      };

      const mockResponse = {
        status: 'sent',
        messageId: 'msg-123',
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockContact]),
        }),
      } as any);

      mockProvider.sendMessage.mockResolvedValue(mockResponse);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue([{}]),
      } as any);

      await whatsAppService.sendMessageToContact('contact-1', 'Hello', 'user-1');

      expect(mockProvider.sendMessage).toHaveBeenCalledWith({
        to: '+905551234567',
        type: 'text',
        content: 'Hello',
      });
    });

    it('should remove spaces from phone number', async () => {
      const mockContact = {
        id: 'contact-1',
        organizationId: 'org-1',
        phone: '+90 555 123 45 67',
        name: 'Test Contact',
      };

      const mockResponse = {
        status: 'sent',
        messageId: 'msg-123',
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockContact]),
        }),
      } as any);

      mockProvider.sendMessage.mockResolvedValue(mockResponse);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue([{}]),
      } as any);

      await whatsAppService.sendMessageToContact('contact-1', 'Hello', 'user-1');

      expect(mockProvider.sendMessage).toHaveBeenCalledWith({
        to: '+905551234567',
        type: 'text',
        content: 'Hello',
      });
    });

    it('should throw error when contact not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      await expect(
        whatsAppService.sendMessageToContact('non-existent', 'Hello', 'user-1')
      ).rejects.toThrow('Contact not found or no phone number');
    });

    it('should throw error when contact has no phone number', async () => {
      const mockContact = {
        id: 'contact-1',
        organizationId: 'org-1',
        phone: null,
        name: 'Test Contact',
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockContact]),
        }),
      } as any);

      await expect(
        whatsAppService.sendMessageToContact('contact-1', 'Hello', 'user-1')
      ).rejects.toThrow('Contact not found or no phone number');
    });

    it('should not log activity when message send fails', async () => {
      const mockContact = {
        id: 'contact-1',
        organizationId: 'org-1',
        phone: '+905551234567',
        name: 'Test Contact',
      };

      const mockResponse = {
        status: 'failed',
        error: 'Message failed',
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockContact]),
        }),
      } as any);

      mockProvider.sendMessage.mockResolvedValue(mockResponse);

      const result = await whatsAppService.sendMessageToContact('contact-1', 'Hello', 'user-1');

      expect(result).toEqual(mockResponse);
      expect(db.insert).not.toHaveBeenCalled();
    });
  });
});

