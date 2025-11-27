import { IWhatsAppProvider, WhatsAppMessage, WhatsAppResponse } from './types.js';
import { logger } from '@/utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { retry, isRetryableHttpError } from '@/utils/retry.js';

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

    // Production mode: Real API call with retry
    return await retry(
      async () => {
        const payload: any = {
          messaging_product: 'whatsapp',
          to: message.to,
          type: message.type,
        };

        // Build message content based on type
        if (message.type === 'text') {
          payload.text = { body: typeof message.content === 'string' ? message.content : '' };
        } else if (message.type === 'template') {
          if (!message.templateName) {
            throw new Error('Template name is required for template messages');
          }
          payload.template = {
            name: message.templateName,
            language: { code: message.language || 'tr' },
            components: message.templateParams || [],
          };
        } else if ((message.type === 'image' || message.type === 'document' || message.type === 'video' || message.type === 'audio') && message.mediaUrl) {
          payload[message.type] = {
            link: message.mediaUrl,
            caption: typeof message.content === 'string' ? message.content : '',
          };
        } else {
          throw new Error(`Unsupported message type: ${message.type}`);
        }

        const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
          logger.error('[WhatsApp] API error', { 
            status: response.status, 
            error: errorData,
            messageType: message.type,
          });
          
          // Don't retry on 4xx errors (bad request, authentication, etc.)
          if (response.status >= 400 && response.status < 500) {
            return {
              messageId: '',
              status: 'failed',
              error: errorMessage,
            };
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const messageId = data.messages?.[0]?.id || '';
        logger.info(`[WhatsApp] Message sent successfully`, { messageId, messageType: message.type });
        
        return {
          messageId,
          status: 'sent',
        };
      },
      {
        maxRetries: 3,
        delayMs: 1000,
        retryableErrors: (error) => {
          // Don't retry on validation errors
          if (error instanceof Error) {
            if (error.message.includes('Template name is required') || 
                error.message.includes('Unsupported message type')) {
              return false;
            }
          }
          return isRetryableHttpError(error);
        },
      }
    ).catch((error) => {
      logger.error('[WhatsApp] Failed to send message after retries', { error, message });
      return {
        messageId: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    });
  }
}

