import { IWhatsAppProvider, WhatsAppMessage, WhatsAppResponse } from './types.js';
import { logger } from '@/utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class MetaWhatsAppProvider implements IWhatsAppProvider {
  private baseUrl: string;
  private isSandbox: boolean;

  constructor(
    private phoneNumberId: string,
    private accessToken: string,
    options?: { sandbox?: boolean; baseUrl?: string }
  ) {
    this.isSandbox = options?.sandbox ?? true;
    this.baseUrl = options?.baseUrl ?? 'https://graph.facebook.com/v18.0';
  }

  /**
   * Validate phone number format
   */
  async validateNumber(phoneNumber: string): Promise<boolean> {
    // E.164 format validation
    const isValid = /^\+[1-9]\d{1,14}$/.test(phoneNumber);
    
    if (!isValid) {
      logger.warn(`[WhatsApp] Invalid phone number format: ${phoneNumber}`);
      return false;
    }

    // Sandbox mode: Skip API validation
    if (this.isSandbox || !this.accessToken) {
      return true;
    }

    // Production mode: Validate via Meta API (optional - can be skipped for performance)
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      logger.warn('[WhatsApp] Failed to validate number via API, using format check only', error);
      return true; // Fallback to format validation
    }
  }

  /**
   * Send WhatsApp message via Meta Graph API
   */
  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    logger.info(`[WhatsApp] Sending ${message.type} message to ${message.to}`);

    // Validate phone number
    const isValid = await this.validateNumber(message.to);
    if (!isValid) {
      return {
        messageId: '',
        status: 'failed',
        error: 'Invalid phone number format',
      };
    }

    // Sandbox mode: Return mock response
    if (this.isSandbox || !this.accessToken || !this.phoneNumberId) {
      logger.debug('[WhatsApp] Using sandbox/mock mode');
      return {
        messageId: `wamid.${uuidv4()}`,
        status: 'sent',
      };
    }

    // Production mode: Real API call
    try {
      const payload: any = {
        messaging_product: 'whatsapp',
        to: message.to,
        type: message.type,
      };

      // Build message content based on type
      if (message.type === 'text') {
        payload.text = { body: message.content };
      } else if (message.type === 'template') {
        payload.template = {
          name: message.templateName,
          language: { code: message.language || 'tr' },
          components: message.templateParams || [],
        };
      } else if (message.type === 'media') {
        payload[message.mediaType || 'image'] = {
          link: message.mediaUrl,
          caption: message.content,
        };
      }

      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('[WhatsApp] API error', { status: response.status, error: errorData });
        return {
          messageId: '',
          status: 'failed',
          error: errorData.error?.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      logger.info(`[WhatsApp] Message sent successfully: ${data.messages?.[0]?.id}`);
      
      return {
        messageId: data.messages?.[0]?.id || '',
        status: 'sent',
      };
    } catch (error) {
      logger.error('[WhatsApp] Failed to send message', error);
      return {
        messageId: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

