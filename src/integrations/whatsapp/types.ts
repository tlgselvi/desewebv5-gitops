export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'image';
  content: string | Record<string, any>;
  templateName?: string;
  language?: string;
}

export interface WhatsAppResponse {
  messageId: string;
  status: 'sent' | 'failed';
  error?: string;
}

export interface IWhatsAppProvider {
  sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse>;
  validateNumber(phoneNumber: string): Promise<boolean>;
}

