export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'image' | 'document' | 'video' | 'audio';
  content: string | Record<string, any>;
  templateName?: string;
  language?: string;
  templateParams?: any[];
  mediaType?: 'image' | 'document' | 'video' | 'audio';
  mediaUrl?: string;
}

export interface WhatsAppResponse {
  messageId: string;
  status: 'sent' | 'failed' | 'delivered' | 'read';
  error?: string;
}

export interface IWhatsAppProvider {
  sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse>;
  validateNumber(phoneNumber: string): Promise<boolean>;
}

