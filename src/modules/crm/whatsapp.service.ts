import { MetaWhatsAppProvider } from '@/integrations/whatsapp/meta.js';
import { db } from '@/db/index.js';
import { contacts, activities } from '@/db/schema/crm.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger.js';

export class CRMWhatsAppService {
  private provider: MetaWhatsAppProvider;

  constructor() {
    // In real app, these come from env or DB config
    this.provider = new MetaWhatsAppProvider(
        process.env.WHATSAPP_PHONE_ID || 'mock-id',
        process.env.WHATSAPP_TOKEN || 'mock-token'
    );
  }

  async sendMessageToContact(contactId: string, message: string, userId: string) {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId));
    
    if (!contact || !contact.phone) {
      throw new Error('Contact not found or no phone number');
    }

    // Phone cleaning (remove spaces, ensure +90)
    let phone = contact.phone.replace(/\s+/g, '');
    if (!phone.startsWith('+')) {
        if (phone.startsWith('0')) phone = `+9${phone}`;
        else phone = `+90${phone}`;
    }

    const response = await this.provider.sendMessage({
        to: phone,
        type: 'text',
        content: message
    });

    // Log activity in CRM
    if (response.status === 'sent') {
        await db.insert(activities).values({
            id: uuidv4(),
            organizationId: contact.organizationId,
            contactId: contact.id,
            type: 'whatsapp',
            subject: 'WhatsApp Message Sent',
            description: message,
            status: 'completed',
            completedAt: new Date(),
            createdBy: userId
        });
    }

    return response;
  }

  /**
   * Get WhatsApp message history for a contact
   */
  async getMessageHistory(contactId: string, organizationId: string, limit: number = 50) {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId));
    
    if (!contact || contact.organizationId !== organizationId) {
      throw new Error('Contact not found or access denied');
    }

    const messageHistory = await db.select()
      .from(activities)
      .where(and(
        eq(activities.contactId, contactId),
        eq(activities.organizationId, organizationId),
        eq(activities.type, 'whatsapp')
      ))
      .orderBy(desc(activities.createdAt))
      .limit(limit);

    return messageHistory.map(activity => ({
      id: activity.id,
      message: activity.description,
      direction: activity.subject.includes('Sent') ? 'outbound' : 'inbound',
      status: activity.status,
      timestamp: activity.createdAt,
      completedAt: activity.completedAt,
    }));
  }

  /**
   * Handle incoming WhatsApp webhook from Meta
   * This processes incoming messages, status updates, etc.
   */
  async handleWebhook(webhookData: any): Promise<void> {
    try {
      // Meta WhatsApp webhook structure
      const entry = webhookData.entry?.[0];
      if (!entry) {
        logger.warn('[WhatsApp] Invalid webhook data: no entry');
        return;
      }

      const changes = entry.changes?.[0];
      if (!changes || changes.field !== 'messages') {
        logger.debug('[WhatsApp] Webhook not for messages field');
        return;
      }

      const value = changes.value;

      // Handle incoming messages
      if (value.messages) {
        for (const message of value.messages) {
          await this.handleIncomingMessage(message, value);
        }
      }

      // Handle status updates (sent, delivered, read)
      if (value.statuses) {
        for (const status of value.statuses) {
          await this.handleStatusUpdate(status);
        }
      }
    } catch (error) {
      logger.error('[WhatsApp] Error handling webhook', { error, webhookData });
      throw error;
    }
  }

  /**
   * Handle incoming WhatsApp message
   */
  private async handleIncomingMessage(message: any, metadata: any): Promise<void> {
    try {
      const phoneNumber = message.from; // E.164 format: +905551234567
      
      // Find contact by phone number
      const phoneFormatted = phoneNumber.replace(/^\+/, ''); // Remove + for matching
      const [contact] = await db.select()
        .from(contacts)
        .where(
          sql`REPLACE(${contacts.phone}, '+', '') = ${phoneFormatted}`
        )
        .limit(1);

      if (!contact) {
        logger.warn('[WhatsApp] Contact not found for incoming message', { phoneNumber });
        // Optionally create a new contact or handle differently
        return;
      }

      // Extract message content based on type
      let messageText = '';
      if (message.type === 'text') {
        messageText = message.text?.body || '';
      } else if (message.type === 'image' || message.type === 'document' || message.type === 'video' || message.type === 'audio') {
        messageText = `[${message.type.toUpperCase()}] ${message[message.type]?.caption || ''}`;
      } else {
        messageText = `[${message.type.toUpperCase()} message]`;
      }

      // Create activity record for incoming message
      await db.insert(activities).values({
        id: uuidv4(),
        organizationId: contact.organizationId,
        contactId: contact.id,
        type: 'whatsapp',
        subject: 'WhatsApp Message Received',
        description: messageText,
        status: 'completed',
        completedAt: new Date(parseInt(message.timestamp) * 1000), // WhatsApp timestamp is in seconds
        createdBy: 'system', // System user for automated messages
      });

      logger.info('[WhatsApp] Incoming message processed', {
        contactId: contact.id,
        messageId: message.id,
        messageType: message.type,
      });
    } catch (error) {
      logger.error('[WhatsApp] Error handling incoming message', { error, message });
      throw error;
    }
  }

  /**
   * Handle WhatsApp status update (sent, delivered, read)
   */
  private async handleStatusUpdate(status: any): Promise<void> {
    try {
      // Update activity status based on WhatsApp message status
      // Message ID format: wamid.xxxxx
      const messageId = status.id;

      // Find activity by searching in description or storing messageId separately
      // For now, we'll log the status update
      logger.info('[WhatsApp] Status update received', {
        messageId,
        status: status.status,
        timestamp: status.timestamp,
      });

      // TODO: Store message status updates if needed
      // This would require adding a messageId field to activities table or creating a separate table
    } catch (error) {
      logger.error('[WhatsApp] Error handling status update', { error, status });
      // Don't throw, status updates are not critical
    }
  }

  /**
   * Verify WhatsApp webhook signature (Meta security requirement)
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const crypto = require('crypto');
      const appSecret = process.env.WHATSAPP_APP_SECRET || '';
      
      if (!appSecret) {
        logger.warn('[WhatsApp] App secret not configured, skipping signature verification');
        return true; // Allow in development
      }

      const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('[WhatsApp] Error verifying webhook signature', { error });
      return false;
    }
  }
}

export const crmWhatsAppService = new CRMWhatsAppService();

