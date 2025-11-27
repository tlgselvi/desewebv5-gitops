import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetaWhatsAppProvider } from '@/integrations/whatsapp/meta.js';
import type { WhatsAppMessage, WhatsAppResponse } from '@/integrations/whatsapp/types.js';

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

// Mock global fetch
global.fetch = vi.fn();

describe('MetaWhatsAppProvider', () => {
  let provider: MetaWhatsAppProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new MetaWhatsAppProvider('phone-123', 'token-456', { sandbox: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with sandbox mode by default', () => {
      const sandboxProvider = new MetaWhatsAppProvider('phone-123', 'token-456');
      expect(sandboxProvider).toBeInstanceOf(MetaWhatsAppProvider);
    });

    it('should create provider with production mode', () => {
      const prodProvider = new MetaWhatsAppProvider('phone-123', 'token-456', { sandbox: false });
      expect(prodProvider).toBeInstanceOf(MetaWhatsAppProvider);
    });

    it('should use custom baseUrl when provided', () => {
      const customProvider = new MetaWhatsAppProvider('phone-123', 'token-456', {
        baseUrl: 'https://custom-url.com',
      });
      expect(customProvider).toBeInstanceOf(MetaWhatsAppProvider);
    });
  });

  describe('validateNumber', () => {
    it('should validate E.164 format phone numbers', async () => {
      const isValid = await provider.validateNumber('+905551234567');
      expect(isValid).toBe(true);
    });

    it('should reject invalid phone number formats', async () => {
      const isValid = await provider.validateNumber('5551234567'); // Missing +
      expect(isValid).toBe(false);
    });

    it('should reject phone numbers starting with 0', async () => {
      const isValid = await provider.validateNumber('+05551234567');
      expect(isValid).toBe(false);
    });

    it('should reject phone numbers that are too short', async () => {
      const isValid = await provider.validateNumber('+90');
      expect(isValid).toBe(false);
    });

    it('should reject phone numbers that are too long', async () => {
      const isValid = await provider.validateNumber('+90555123456789012345');
      expect(isValid).toBe(false);
    });

    it('should return true in sandbox mode without API validation', async () => {
      const isValid = await provider.validateNumber('+905551234567');
      expect(isValid).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return true when accessToken is missing', async () => {
      const providerWithoutToken = new MetaWhatsAppProvider('phone-123', '', { sandbox: false });
      const isValid = await providerWithoutToken.validateNumber('+905551234567');
      expect(isValid).toBe(true);
    });

    it('should make API call in production mode', async () => {
      const prodProvider = new MetaWhatsAppProvider('phone-123', 'token-456', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
      });

      const isValid = await prodProvider.validateNumber('+905551234567');
      expect(isValid).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle API validation errors gracefully', async () => {
      const prodProvider = new MetaWhatsAppProvider('phone-123', 'token-456', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('API error')
      );

      const isValid = await prodProvider.validateNumber('+905551234567');
      // Should fallback to format validation
      expect(isValid).toBe(true);
    });
  });

  describe('sendMessage', () => {
    const validMessage: WhatsAppMessage = {
      to: '+905551234567',
      type: 'text',
      content: 'Test message',
    };

    it('should send text message in sandbox mode', async () => {
      const response = await provider.sendMessage(validMessage);
      expect(response.status).toBe('sent');
      expect(response.messageId).toContain('wamid.');
    });

    it('should reject message with invalid phone number', async () => {
      const invalidMessage = {
        ...validMessage,
        to: 'invalid-number',
      };
      const response = await provider.sendMessage(invalidMessage);
      expect(response.status).toBe('failed');
      expect(response.error).toBe('Invalid phone number format');
    });

    it('should send template message', async () => {
      const templateMessage: WhatsAppMessage = {
        to: '+905551234567',
        type: 'template',
        templateName: 'welcome_template',
        language: 'tr',
        content: '',
      };
      const response = await provider.sendMessage(templateMessage);
      expect(response.status).toBe('sent');
    });

    it('should send image message', async () => {
      const imageMessage: WhatsAppMessage = {
        to: '+905551234567',
        type: 'image',
        content: 'Image caption',
        mediaUrl: 'https://example.com/image.jpg',
      };
      const response = await provider.sendMessage(imageMessage);
      expect(response.status).toBe('sent');
    });

    it('should send document message', async () => {
      const documentMessage: WhatsAppMessage = {
        to: '+905551234567',
        type: 'document',
        content: 'Document caption',
        mediaUrl: 'https://example.com/document.pdf',
      };
      const response = await provider.sendMessage(documentMessage);
      expect(response.status).toBe('sent');
    });

    it('should send video message', async () => {
      const videoMessage: WhatsAppMessage = {
        to: '+905551234567',
        type: 'video',
        content: 'Video caption',
        mediaUrl: 'https://example.com/video.mp4',
      };
      const response = await provider.sendMessage(videoMessage);
      expect(response.status).toBe('sent');
    });

    it('should send audio message', async () => {
      const audioMessage: WhatsAppMessage = {
        to: '+905551234567',
        type: 'audio',
        content: '',
        mediaUrl: 'https://example.com/audio.mp3',
      };
      const response = await provider.sendMessage(audioMessage);
      expect(response.status).toBe('sent');
    });

    it('should make API call in production mode', async () => {
      const prodProvider = new MetaWhatsAppProvider('phone-123', 'token-456', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'wamid.prod-123' }],
        }),
      });

      const response = await prodProvider.sendMessage(validMessage);
      expect(response.status).toBe('sent');
      expect(response.messageId).toBe('wamid.prod-123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer token-456',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      const prodProvider = new MetaWhatsAppProvider('phone-123', 'token-456', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: 'Invalid phone number',
          },
        }),
      });

      const response = await prodProvider.sendMessage(validMessage);
      expect(response.status).toBe('failed');
      expect(response.error).toBe('Invalid phone number');
    });

    it('should handle network errors', async () => {
      const prodProvider = new MetaWhatsAppProvider('phone-123', 'token-456', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const response = await prodProvider.sendMessage(validMessage);
      expect(response.status).toBe('failed');
      expect(response.error).toBe('Network error');
    });

    it('should handle API errors without error message', async () => {
      const prodProvider = new MetaWhatsAppProvider('phone-123', 'token-456', { sandbox: false });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      const response = await prodProvider.sendMessage(validMessage);
      expect(response.status).toBe('failed');
      expect(response.error).toBe('HTTP 500');
    });

    it('should return mock response when accessToken is missing', async () => {
      const providerWithoutToken = new MetaWhatsAppProvider('phone-123', '', { sandbox: false });
      const response = await providerWithoutToken.sendMessage(validMessage);
      expect(response.status).toBe('sent');
      expect(response.messageId).toContain('wamid.');
    });

    it('should return mock response when phoneNumberId is missing', async () => {
      const providerWithoutPhone = new MetaWhatsAppProvider('', 'token-456', { sandbox: false });
      const response = await providerWithoutPhone.sendMessage(validMessage);
      expect(response.status).toBe('sent');
    });
  });
});
