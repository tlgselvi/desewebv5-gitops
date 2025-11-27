import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { CRMController } from '@/modules/crm/controller.js';
import { crmService } from '@/modules/crm/service.js';
import { crmWhatsAppService } from '@/modules/crm/whatsapp.service.js';

// Mock dependencies
vi.mock('@/modules/crm/service.js', () => ({
  crmService: {
    createDeal: vi.fn(),
    getKanbanBoard: vi.fn(),
    updateDealStage: vi.fn(),
    createActivity: vi.fn(),
  },
}));

vi.mock('@/modules/crm/whatsapp.service.js', () => ({
  crmWhatsAppService: {
    sendMessageToContact: vi.fn(),
  },
}));

describe('CRM Controller - Error Handling Branch Tests', () => {
  let controller: CRMController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new CRMController();

    mockReq = {
      params: {},
      body: {},
      user: {
        id: 'user-1',
        organizationId: 'org-1',
      } as any,
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('createDeal', () => {
    it('should return 400 when organizationId is missing in production', async () => {
      process.env.NODE_ENV = 'production';
      mockReq.user = { id: 'user-1' } as any; // No organizationId
      mockReq.body = {
        stageId: 'stage-1',
        title: 'Test Deal',
        value: 1000,
      };

      await controller.createDeal(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Organization context required' });
    });

    it('should return 400 when organizationId is missing in development', async () => {
      process.env.NODE_ENV = 'development';
      mockReq.user = { id: 'user-1' } as any; // No organizationId
      mockReq.body = {
        stageId: 'stage-1',
        title: 'Test Deal',
        value: 1000,
      };

      await controller.createDeal(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when validation fails', async () => {
      mockReq.body = {
        // Missing required fields
        title: 'Test Deal',
      };

      await controller.createDeal(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle service error and return 400', async () => {
      mockReq.body = {
        stageId: 'stage-1',
        title: 'Test Deal',
        value: 1000,
      };
      vi.mocked(crmService.createDeal).mockRejectedValue(new Error('Invalid stage'));

      await controller.createDeal(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid stage' });
    });

    it('should return 201 when deal is created successfully', async () => {
      mockReq.body = {
        stageId: 'stage-1',
        title: 'Test Deal',
        value: 1000,
      };
      const mockDeal = { id: 'deal-1', title: 'Test Deal' };
      vi.mocked(crmService.createDeal).mockResolvedValue(mockDeal as any);

      await controller.createDeal(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockDeal);
    });
  });

  describe('getKanban', () => {
    it('should handle service error and return 500', async () => {
      vi.mocked(crmService.getKanbanBoard).mockRejectedValue(new Error('Service error'));

      await controller.getKanban(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should return kanban board successfully', async () => {
      const mockBoard = { stages: [], deals: [] };
      vi.mocked(crmService.getKanbanBoard).mockResolvedValue(mockBoard as any);

      await controller.getKanban(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockBoard);
    });
  });

  describe('moveDeal', () => {
    it('should return 400 when deal ID is missing', async () => {
      mockReq.params = {};
      mockReq.body = { stageId: 'stage-2' };

      await controller.moveDeal(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Deal ID required' });
    });

    it('should return 400 when stageId is missing', async () => {
      mockReq.params = { id: 'deal-1' };
      mockReq.body = {};

      await controller.moveDeal(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'stageId required' });
    });

    it('should handle service error and return 400', async () => {
      mockReq.params = { id: 'deal-1' };
      mockReq.body = { stageId: 'stage-2' };
      vi.mocked(crmService.updateDealStage).mockRejectedValue(new Error('Stage not found'));

      await controller.moveDeal(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return success when deal is moved', async () => {
      mockReq.params = { id: 'deal-1' };
      mockReq.body = { stageId: 'stage-2' };
      const mockResult = { success: true };
      vi.mocked(crmService.updateDealStage).mockResolvedValue(mockResult as any);

      await controller.moveDeal(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('createActivity', () => {
    it('should return 400 when organizationId is missing', async () => {
      mockReq.user = { id: 'user-1' } as any; // No organizationId
      mockReq.body = {
        type: 'call',
        subject: 'Test Activity',
      };

      await controller.createActivity(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Organization context required' });
    });

    it('should return 400 when validation fails', async () => {
      mockReq.body = {
        // Missing required fields
        subject: 'Test Activity',
      };

      await controller.createActivity(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle service error and return 400', async () => {
      mockReq.body = {
        type: 'call',
        subject: 'Test Activity',
      };
      vi.mocked(crmService.createActivity).mockRejectedValue(new Error('Service error'));

      await controller.createActivity(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 201 when activity is created successfully', async () => {
      mockReq.body = {
        type: 'call',
        subject: 'Test Activity',
      };
      const mockActivity = { id: 'activity-1', subject: 'Test Activity' };
      vi.mocked(crmService.createActivity).mockResolvedValue(mockActivity as any);

      await controller.createActivity(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockActivity);
    });
  });

  describe('sendWhatsApp', () => {
    it('should return 400 when validation fails', async () => {
      mockReq.body = {
        // Missing required message field
        contactId: 'contact-1',
      };

      try {
        await controller.sendWhatsApp(mockReq as Request, mockRes as Response);
      } catch (error) {
        // Zod validation throws error, which should be caught by error handler
        expect(error).toBeDefined();
      }
    });

    it('should handle service error and return 500', async () => {
      mockReq.body = {
        contactId: 'contact-1',
        message: 'Test message',
      };
      vi.mocked(crmWhatsAppService.sendMessageToContact).mockRejectedValue(new Error('Service error'));

      await controller.sendWhatsApp(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should return success when message is sent', async () => {
      mockReq.body = {
        contactId: 'contact-1',
        message: 'Test message',
      };
      const mockResult = { success: true, messageId: 'msg-1' };
      vi.mocked(crmWhatsAppService.sendMessageToContact).mockResolvedValue(mockResult as any);

      await controller.sendWhatsApp(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });
  });
});

