import { MetaWhatsAppProvider } from '@/integrations/whatsapp/meta.js';
import { db } from '@/db/index.js';
import { contacts, activities } from '@/db/schema/crm.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

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
}

export const crmWhatsAppService = new CRMWhatsAppService();

