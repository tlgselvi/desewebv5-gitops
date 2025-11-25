import { Request, Response } from 'express';
import { crmService } from './service.js';
import { crmWhatsAppService } from './whatsapp.service.js';
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
      });

      const { contactId, message } = schema.parse(req.body);
      const userId = (req.user as any)?.id || 'system';

      const result = await crmWhatsAppService.sendMessageToContact(contactId, message, userId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export const crmController = new CRMController();
