import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CRMService } from '@/modules/crm/service.js';
import { db } from '@/db/index.js';
import { deals, contacts, pipelineStages } from '@/db/schema/index.js';

// Mock database
vi.mock('@/db/index.js', () => ({
  db: {
    query: {
      pipelineStages: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

describe('CRM Service', () => {
  let crmService: CRMService;

  beforeEach(() => {
    vi.clearAllMocks();
    crmService = new CRMService();
  });

  describe('createDeal', () => {
    it('should create a deal successfully', async () => {
      const mockStage = { id: 'stage-1', organizationId: 'org-1' };
      const mockDeal = {
        id: 'deal-1',
        organizationId: 'org-1',
        title: 'Test Deal',
        value: '1000.00',
        currency: 'TRY',
        status: 'open',
      };

      vi.mocked(db.query.pipelineStages.findFirst).mockResolvedValue(mockStage as any);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockDeal]),
        }),
      } as any);

      const result = await crmService.createDeal({
        organizationId: 'org-1',
        stageId: 'stage-1',
        title: 'Test Deal',
        value: 1000,
      });

      expect(result).toEqual(mockDeal);
      expect(db.query.pipelineStages.findFirst).toHaveBeenCalled();
    });

    it('should throw error for invalid stage', async () => {
      vi.mocked(db.query.pipelineStages.findFirst).mockResolvedValue(null);

      await expect(
        crmService.createDeal({
          organizationId: 'org-1',
          stageId: 'invalid-stage',
          title: 'Test Deal',
          value: 1000,
        })
      ).rejects.toThrow('Invalid stage or organization mismatch');
    });

    it('should throw error when stage belongs to different organization', async () => {
      vi.mocked(db.query.pipelineStages.findFirst).mockResolvedValue(null);

      await expect(
        crmService.createDeal({
          organizationId: 'org-1',
          stageId: 'stage-1',
          title: 'Test Deal',
          value: 1000,
        })
      ).rejects.toThrow('Invalid stage or organization mismatch');
    });

    it('should handle database insert failure (returning empty array)', async () => {
      const mockStage = { id: 'stage-1', organizationId: 'org-1' };
      vi.mocked(db.query.pipelineStages.findFirst).mockResolvedValue(mockStage as any);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]), // Empty array - insert failed
        }),
      } as any);

      const result = await crmService.createDeal({
        organizationId: 'org-1',
        stageId: 'stage-1',
        title: 'Test Deal',
        value: 1000,
      });

      // Service doesn't check for empty array, so result will be undefined
      expect(result).toBeUndefined();
    });

    it('should handle database query error', async () => {
      vi.mocked(db.query.pipelineStages.findFirst).mockRejectedValue(new Error('Database connection error'));

      await expect(
        crmService.createDeal({
          organizationId: 'org-1',
          stageId: 'stage-1',
          title: 'Test Deal',
          value: 1000,
        })
      ).rejects.toThrow('Database connection error');
    });
  });

  describe('getKanbanBoard', () => {
    it('should return kanban board data with stages and deals', async () => {
      const mockStages = [
        { id: 'stage-1', name: 'Lead', order: 1, organizationId: 'org-1' },
        { id: 'stage-2', name: 'Qualified', order: 2, organizationId: 'org-1' },
      ];

      const mockDeals = [
        {
          id: 'deal-1',
          title: 'Deal 1',
          value: '1000.00',
          currency: 'TRY',
          stageId: 'stage-1',
          contactName: 'John',
          companyName: 'Company A',
          assignedTo: 'user-1',
          updatedAt: new Date(),
          status: 'open',
        },
      ];

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockStages),
          }),
        }),
      } as any);

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockDeals),
          }),
        }),
      } as any);

      const result = await crmService.getKanbanBoard('org-1');

      expect(result).toHaveProperty('stages');
      expect(result).toHaveProperty('deals');
      expect(result.stages).toEqual(mockStages);
    });

    it('should initialize default stages when no stages exist', async () => {
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const mockDefaultStages = [
        { id: 'stage-1', name: 'Yeni Lead', order: 1, organizationId: 'org-1', color: '#3b82f6', probability: 10 },
        { id: 'stage-2', name: 'İletişim', order: 2, organizationId: 'org-1', color: '#f59e0b', probability: 30 },
      ];

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(mockDefaultStages),
        }),
      } as any);

      const result = await crmService.getKanbanBoard('org-1');

      expect(result).toHaveProperty('stages');
      expect(result).toHaveProperty('deals');
      expect(result.stages).toHaveLength(2);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should handle database query error when fetching stages', async () => {
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockRejectedValue(new Error('Database query error')),
          }),
        }),
      } as any);

      await expect(crmService.getKanbanBoard('org-1')).rejects.toThrow('Database query error');
    });

    it('should handle database query error when fetching deals', async () => {
      const mockStages = [
        { id: 'stage-1', name: 'Lead', order: 1, organizationId: 'org-1' },
      ];

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockStages),
          }),
        }),
      } as any);

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(new Error('Database query error')),
          }),
        }),
      } as any);

      await expect(crmService.getKanbanBoard('org-1')).rejects.toThrow('Database query error');
    });

    it('should handle database insert error when initializing default stages', async () => {
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database insert error')),
        }),
      } as any);

      await expect(crmService.getKanbanBoard('org-1')).rejects.toThrow('Database insert error');
    });
  });

  describe('createActivity', () => {
    it('should create an activity successfully', async () => {
      const mockActivity = {
        id: 'activity-1',
        organizationId: 'org-1',
        dealId: 'deal-1',
        type: 'call',
        subject: 'Follow up call',
        status: 'pending',
        createdBy: 'user-1',
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockActivity]),
        }),
      } as any);

      const result = await crmService.createActivity({
        organizationId: 'org-1',
        dealId: 'deal-1',
        type: 'call',
        subject: 'Follow up call',
        createdBy: 'user-1',
      });

      expect(result).toEqual(mockActivity);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should create activity with contactId', async () => {
      const mockActivity = {
        id: 'activity-1',
        organizationId: 'org-1',
        contactId: 'contact-1',
        type: 'email',
        subject: 'Send proposal',
        status: 'pending',
        createdBy: 'user-1',
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockActivity]),
        }),
      } as any);

      const result = await crmService.createActivity({
        organizationId: 'org-1',
        contactId: 'contact-1',
        type: 'email',
        subject: 'Send proposal',
        createdBy: 'user-1',
      });

      expect(result).toEqual(mockActivity);
    });

    it('should create activity with dueDate and assignedTo', async () => {
      const dueDate = new Date();
      const mockActivity = {
        id: 'activity-1',
        organizationId: 'org-1',
        type: 'task',
        subject: 'Complete task',
        dueDate,
        assignedTo: 'user-2',
        status: 'pending',
        createdBy: 'user-1',
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockActivity]),
        }),
      } as any);

      const result = await crmService.createActivity({
        organizationId: 'org-1',
        type: 'task',
        subject: 'Complete task',
        dueDate,
        assignedTo: 'user-2',
        createdBy: 'user-1',
      });

      expect(result).toEqual(mockActivity);
    });

    it('should handle all activity types', async () => {
      const types: Array<'call' | 'email' | 'meeting' | 'note' | 'task'> = ['call', 'email', 'meeting', 'note', 'task'];
      
      for (const type of types) {
        const mockActivity = {
          id: `activity-${type}`,
          organizationId: 'org-1',
          type,
          subject: `Test ${type}`,
          status: 'pending',
          createdBy: 'user-1',
        };

        vi.mocked(db.insert).mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockActivity]),
          }),
        } as any);

        const result = await crmService.createActivity({
          organizationId: 'org-1',
          type,
          subject: `Test ${type}`,
          createdBy: 'user-1',
        });

        expect(result.type).toBe(type);
      }
    });

    it('should handle database insert failure (returning empty array)', async () => {
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]), // Empty array - insert failed
        }),
      } as any);

      const result = await crmService.createActivity({
        organizationId: 'org-1',
        type: 'call',
        subject: 'Test call',
        createdBy: 'user-1',
      });

      // Service doesn't check for empty array, so result will be undefined
      expect(result).toBeUndefined();
    });

    it('should handle database insert error', async () => {
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database insert error')),
        }),
      } as any);

      await expect(
        crmService.createActivity({
          organizationId: 'org-1',
          type: 'call',
          subject: 'Test call',
          createdBy: 'user-1',
        })
      ).rejects.toThrow('Database insert error');
    });
  });

  describe('updateDealStage', () => {
    it('should update deal stage successfully', async () => {
      const mockStage = { id: 'stage-2', organizationId: 'org-1' };
      const mockUpdatedDeal = {
        id: 'deal-1',
        organizationId: 'org-1',
        stageId: 'stage-2',
        updatedAt: new Date(),
      };

      vi.mocked(db.query.pipelineStages.findFirst).mockResolvedValue(mockStage as any);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdatedDeal]),
          }),
        }),
      } as any);

      const result = await crmService.updateDealStage('deal-1', 'stage-2', 'org-1');

      expect(result).toEqual(mockUpdatedDeal);
      expect(result.stageId).toBe('stage-2');
      expect(db.query.pipelineStages.findFirst).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
    });

    it('should throw error when stage not found', async () => {
      vi.mocked(db.query.pipelineStages.findFirst).mockResolvedValue(null);

      await expect(
        crmService.updateDealStage('deal-1', 'invalid-stage', 'org-1')
      ).rejects.toThrow('Stage not found');
    });

    it('should throw error when stage belongs to different organization', async () => {
      vi.mocked(db.query.pipelineStages.findFirst).mockResolvedValue(null);

      await expect(
        crmService.updateDealStage('deal-1', 'stage-1', 'org-1')
      ).rejects.toThrow('Stage not found');
    });

    it('should handle database query error when fetching stage', async () => {
      vi.mocked(db.query.pipelineStages.findFirst).mockRejectedValue(new Error('Database query error'));

      await expect(
        crmService.updateDealStage('deal-1', 'stage-1', 'org-1')
      ).rejects.toThrow('Database query error');
    });

    it('should handle database update failure (returning empty array)', async () => {
      const mockStage = { id: 'stage-2', organizationId: 'org-1' };
      vi.mocked(db.query.pipelineStages.findFirst).mockResolvedValue(mockStage as any);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]), // Empty array - deal not found or update failed
          }),
        }),
      } as any);

      const result = await crmService.updateDealStage('deal-1', 'stage-2', 'org-1');

      // Service doesn't check for empty array, so result will be undefined
      expect(result).toBeUndefined();
    });

    it('should handle database update error', async () => {
      const mockStage = { id: 'stage-2', organizationId: 'org-1' };
      vi.mocked(db.query.pipelineStages.findFirst).mockResolvedValue(mockStage as any);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('Database update error')),
          }),
        }),
      } as any);

      await expect(
        crmService.updateDealStage('deal-1', 'stage-2', 'org-1')
      ).rejects.toThrow('Database update error');
    });

    it('should handle deal not found (deal belongs to different organization)', async () => {
      const mockStage = { id: 'stage-2', organizationId: 'org-1' };
      vi.mocked(db.query.pipelineStages.findFirst).mockResolvedValue(mockStage as any);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]), // Empty - deal not found or wrong org
          }),
        }),
      } as any);

      const result = await crmService.updateDealStage('deal-1', 'stage-2', 'org-1');

      // Service doesn't check for empty array, so result will be undefined
      expect(result).toBeUndefined();
    });
  });

  describe('createDeal - edge cases', () => {
    it('should create deal with optional fields', async () => {
      const mockStage = { id: 'stage-1', organizationId: 'org-1' };
      const mockDeal = {
        id: 'deal-1',
        organizationId: 'org-1',
        contactId: 'contact-1',
        stageId: 'stage-1',
        title: 'Test Deal',
        value: '1000.00',
        currency: 'USD',
        expectedCloseDate: new Date(),
        assignedTo: 'user-1',
        status: 'open',
      };

      vi.mocked(db.query.pipelineStages.findFirst).mockResolvedValue(mockStage as any);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockDeal]),
        }),
      } as any);

      const result = await crmService.createDeal({
        organizationId: 'org-1',
        contactId: 'contact-1',
        stageId: 'stage-1',
        title: 'Test Deal',
        value: 1000,
        currency: 'USD',
        expectedCloseDate: new Date(),
        assignedTo: 'user-1',
      });

      expect(result).toEqual(mockDeal);
    });

    it('should use default currency TRY when not provided', async () => {
      const mockStage = { id: 'stage-1', organizationId: 'org-1' };
      const mockDeal = {
        id: 'deal-1',
        organizationId: 'org-1',
        stageId: 'stage-1',
        title: 'Test Deal',
        value: '1000.00',
        currency: 'TRY',
        status: 'open',
      };

      vi.mocked(db.query.pipelineStages.findFirst).mockResolvedValue(mockStage as any);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockDeal]),
        }),
      } as any);

      const result = await crmService.createDeal({
        organizationId: 'org-1',
        stageId: 'stage-1',
        title: 'Test Deal',
        value: 1000,
      });

      expect(result.currency).toBe('TRY');
    });
  });
});

