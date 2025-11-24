import { IWhatsAppProvider, WhatsAppMessage, WhatsAppResponse } from './types.js';
import { logger } from '@/utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class MetaWhatsAppProvider implements IWhatsAppProvider {
  private baseUrl = 'https://graph.facebook.com/v18.0';
  
  constructor(
    private phoneNumberId: string, 
    private accessToken: string
  ) {}

  async validateNumber(phoneNumber: string): Promise<boolean> {
    // Regex validation for generic international format
    // Gerçek dünyada Meta API ile kontrol edilebilir
    return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
  }

  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    logger.info(`[WhatsApp] Sending ${message.type} to ${message.to}`);
    
    // Mock Implementation for MVP
    // Real implementation would use fetch/axios to call Meta Graph API
    
    if (process.env.NODE_ENV === 'production' && !this.accessToken) {
        logger.error('[WhatsApp] No access token provided');
        return { messageId: '', status: 'failed', error: 'Configuration missing' };
    }

    return Promise.resolve({
        messageId: `wamid.${uuidv4()}`,
        status: 'sent'
    });
  }
}

