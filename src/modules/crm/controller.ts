import { Request, Response } from 'express';
import { crmService } from './service.js';
import { crmWhatsAppService } from './whatsapp.service.js';
import { db } from '@/db/index.js';
import { contacts, activities } from '@/db/schema/crm.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger.js';
import { z } from 'zod';

export class CRMController {

  async createDeal(req: Request, res: Response) {
    try {
      const schema = z.object({
        contactId: z.string().optional(),
        stageId: z.string(),
        title: z.string(),
        value: z.number(),
        currency: z.string().optional(),
        expectedCloseDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
      });

      const data = schema.parse(req.body);
      const organizationId = (req.user as any)?.organizationId;
      const userId = (req.user as any)?.id;

      if (!organizationId) {
          // Mock for development if no auth context
          if (process.env.NODE_ENV === 'development') {
             return res.status(400).json({ error: 'Organization context required (Mock auth missing)' });
          }
          return res.status(400).json({ error: 'Organization context required' });
      }

      const deal = await crmService.createDeal({
        ...data,
        organizationId,
        ...(userId && { assignedTo: userId }),
      });

      return res.status(201).json(deal);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async getKanban(req: Request, res: Response) {
    try {
      const organizationId = (req.user as any)?.organizationId || 'default-org-id'; // Fallback for MVP demo

      // For real implementation remove fallback
      // if (!organizationId) return res.status(400).json({ error: 'Organization context required' });

      const board = await crmService.getKanbanBoard(organizationId);
      return res.json(board);
    } catch (error: any) {
      console.error("Kanban Error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  async moveDeal(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { stageId } = req.body;
      const organizationId = (req.user as any)?.organizationId || 'default-org-id'; // Fallback

      if (!id) return res.status(400).json({ error: 'Deal ID required' });
      if (!stageId) return res.status(400).json({ error: 'stageId required' });

      const result = await crmService.updateDealStage(id, stageId, organizationId);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async createActivity(req: Request, res: Response) {
    try {
      const schema = z.object({
        dealId: z.string().optional(),
        contactId: z.string().optional(),
        type: z.enum(['call', 'email', 'meeting', 'note', 'task']),
        subject: z.string(),
        description: z.string().optional(),
        dueDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
      });

      const data = schema.parse(req.body);
      const organizationId = (req.user as any)?.organizationId;
      const userId = (req.user as any)?.id;

      if (!organizationId) return res.status(400).json({ error: 'Organization context required' });

      const activityData: any = {
        organizationId,
        createdBy: userId || 'system',
        type: data.type,
        subject: data.subject,
      };
      if (data.dealId) activityData.dealId = data.dealId;
      if (data.contactId) activityData.contactId = data.contactId;
      if (data.description) activityData.description = data.description;
      if (data.dueDate) activityData.dueDate = data.dueDate;

      const activity = await crmService.createActivity(activityData);

      return res.status(201).json(activity);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async sendWhatsApp(req: Request, res: Response) {
    try {
      const schema = z.object({
        contactId: z.string(),
        message: z.string().min(1),
        type: z.enum(['text', 'template', 'image', 'document', 'video', 'audio']).optional().default('text'),
        templateName: z.string().optional(),
        mediaUrl: z.string().optional(),
      });

      const data = schema.parse(req.body);
      const userId = (req.user as any)?.id || 'system';
      const organizationId = (req.user as any)?.organizationId;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization context required' });
      }

      // Use enhanced message sending if template or media provided
      if (data.type !== 'text') {
        const { MetaWhatsAppProvider } = await import('@/integrations/whatsapp/meta.js');
        const provider = new MetaWhatsAppProvider(
          process.env.WHATSAPP_PHONE_ID || 'mock-id',
          process.env.WHATSAPP_TOKEN || 'mock-token'
        );

        const [contact] = await db.select().from(contacts).where(eq(contacts.id, data.contactId));
        if (!contact || !contact.phone) {
          return res.status(404).json({ error: 'Contact not found or no phone number' });
        }

        let phone = contact.phone.replace(/\s+/g, '');
        if (!phone.startsWith('+')) {
          if (phone.startsWith('0')) phone = `+9${phone}`;
          else phone = `+90${phone}`;
        }

        const result = await provider.sendMessage({
          to: phone,
          type: data.type,
          content: data.message,
          templateName: data.templateName,
          mediaUrl: data.mediaUrl,
        });

        // Log activity
        if (result.status === 'sent') {
          await db.insert(activities).values({
            id: uuidv4(),
            organizationId,
            contactId: data.contactId,
            type: 'whatsapp',
            subject: `WhatsApp ${data.type} Message Sent`,
            description: data.message,
            status: 'completed',
            completedAt: new Date(),
            createdBy: userId
          });
        }

        return res.json(result);
      }

      // Standard text message
      const result = await crmWhatsAppService.sendMessageToContact(data.contactId, data.message, userId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async handleWhatsAppWebhook(req: Request, res: Response) {
    try {
      // Verify webhook signature for security
      const signature = req.headers['x-hub-signature-256'] as string;
      const rawBody = JSON.stringify(req.body);
      
      if (signature) {
        const isValid = crmWhatsAppService.verifyWebhookSignature(rawBody, signature.replace('sha256=', ''));
        if (!isValid) {
          logger.warn('[WhatsApp] Invalid webhook signature');
          return res.status(403).json({ error: 'Invalid signature' });
        }
      }

      // Handle webhook verification challenge (GET request from Meta)
      const mode = req.query['hub.mode'] as string;
      const token = req.query['hub.verify_token'] as string;
      const challenge = req.query['hub.challenge'] as string;

      if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
        logger.info('[WhatsApp] Webhook verified');
        return res.status(200).send(challenge);
      }

      // Process webhook data (POST request)
      await crmWhatsAppService.handleWebhook(req.body);
      return res.status(200).json({ status: 'ok' });
    } catch (error: any) {
      logger.error('[WhatsApp] Webhook handler error', { error });
      return res.status(500).json({ error: error.message });
    }
  }

  async getWhatsAppHistory(req: Request, res: Response) {
    try {
      const { contactId } = req.params;
      const organizationId = (req.user as any)?.organizationId;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization context required' });
      }

      const history = await crmWhatsAppService.getMessageHistory(contactId, organizationId, limit);
      return res.json(history);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export const crmController = new CRMController();
