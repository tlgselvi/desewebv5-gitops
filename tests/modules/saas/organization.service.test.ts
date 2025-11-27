import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganizationService } from '@/modules/saas/organization.service.js';
import { db } from '@/db/index.js';
import { logger } from '@/utils/logger.js';

// Mock dependencies
vi.mock('@/db/index.js');
vi.mock('@/utils/logger.js');

describe('OrganizationService', () => {
  let organizationService: OrganizationService;
  const mockDb = db as any;

  beforeEach(() => {
    vi.clearAllMocks();
    organizationService = new OrganizationService();
  });

  describe('getAllOrganizations', () => {
    it('should return all organizations with stats', async () => {
      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Test Org 1',
          slug: 'test-org-1',
          subscriptionTier: 'pro',
          status: 'active',
          createdAt: new Date(),
        },
        {
          id: 'org-2',
          name: 'Test Org 2',
          slug: 'test-org-2',
          subscriptionTier: 'starter',
          status: 'active',
          createdAt: new Date(),
        },
      ];

      const mockUserCounts = [
        { count: 5 },
        { count: 2 },
      ];

      const mockRevenueStats = [
        { total: '799.00' },
        { total: null },
      ];

      // Mock organizations select
      mockDb.select = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockOrgs),
          }),
        })
        // Mock user count selects
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUserCounts[0]]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUserCounts[1]]),
          }),
        })
        // Mock revenue stats selects
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockRevenueStats[0]]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockRevenueStats[1]]),
          }),
        });

      const result = await organizationService.getAllOrganizations();

      expect(result).toHaveLength(2);
      expect(result[0].users).toBe(5);
      expect(result[0].mrr).toBe(799);
      expect(result[1].users).toBe(2);
      expect(result[1].mrr).toBe(299); // Fallback to starter tier
    });

    it('should use enterprise tier MRR when subscriptionTier is enterprise', async () => {
      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Enterprise Org',
          slug: 'enterprise-org',
          subscriptionTier: 'enterprise',
          status: 'active',
          createdAt: new Date(),
        },
      ];

      mockDb.select = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockOrgs),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 10 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: null }]),
          }),
        });

      const result = await organizationService.getAllOrganizations();

      expect(result[0].mrr).toBe(2500); // Enterprise tier
    });

    it('should use pro tier MRR when subscriptionTier is pro', async () => {
      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Pro Org',
          slug: 'pro-org',
          subscriptionTier: 'pro',
          status: 'active',
          createdAt: new Date(),
        },
      ];

      mockDb.select = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockOrgs),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: null }]),
          }),
        });

      const result = await organizationService.getAllOrganizations();

      expect(result[0].mrr).toBe(799); // Pro tier
    });

    it('should use starter tier MRR when subscriptionTier is starter', async () => {
      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Starter Org',
          slug: 'starter-org',
          subscriptionTier: 'starter',
          status: 'active',
          createdAt: new Date(),
        },
      ];

      mockDb.select = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockOrgs),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 2 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: null }]),
          }),
        });

      const result = await organizationService.getAllOrganizations();

      expect(result[0].mrr).toBe(299); // Starter tier
    });

    it('should use revenue stats when available instead of tier', async () => {
      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Test Org',
          slug: 'test-org',
          subscriptionTier: 'starter',
          status: 'active',
          createdAt: new Date(),
        },
      ];

      mockDb.select = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockOrgs),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: '1500.00' }]), // Revenue stats available
          }),
        });

      const result = await organizationService.getAllOrganizations();

      expect(result[0].mrr).toBe(1500); // Uses revenue stats, not tier
    });

    it('should use tier-based MRR when no revenue stats', async () => {
      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Enterprise Org',
          slug: 'enterprise-org',
          subscriptionTier: 'enterprise',
          status: 'active',
          createdAt: new Date(),
        },
      ];

      mockDb.select = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockOrgs),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 10 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: null }]),
          }),
        });

      const result = await organizationService.getAllOrganizations();

      expect(result[0].mrr).toBe(2500); // Enterprise tier
    });

    it('should handle errors gracefully', async () => {
      mockDb.select = vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(organizationService.getAllOrganizations()).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle database query error when fetching user count', async () => {
      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Test Org',
          slug: 'test-org',
          subscriptionTier: 'pro',
          status: 'active',
          createdAt: new Date(),
        },
      ];

      mockDb.select = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockOrgs),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(new Error('Database query error')),
          }),
        });

      await expect(organizationService.getAllOrganizations()).rejects.toThrow('Database query error');
    });

    it('should handle database query error when fetching revenue stats', async () => {
      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Test Org',
          slug: 'test-org',
          subscriptionTier: 'pro',
          status: 'active',
          createdAt: new Date(),
        },
      ];

      mockDb.select = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockOrgs),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(new Error('Database query error')),
          }),
        });

      await expect(organizationService.getAllOrganizations()).rejects.toThrow('Database query error');
    });

    it('should handle default tier MRR when subscriptionTier is null', async () => {
      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Test Org',
          slug: 'test-org',
          subscriptionTier: null,
          status: 'active',
          createdAt: new Date(),
        },
      ];

      mockDb.select = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockOrgs),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: null }]),
          }),
        });

      const result = await organizationService.getAllOrganizations();

      expect(result[0].mrr).toBe(0); // Default case
    });
  });

  describe('getSystemStats', () => {
    it('should return system-wide stats', async () => {
      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Org 1',
          slug: 'org-1',
          subscriptionTier: 'pro',
          status: 'active',
          users: 5,
          mrr: 799,
          createdAt: new Date(),
        },
        {
          id: 'org-2',
          name: 'Org 2',
          slug: 'org-2',
          subscriptionTier: 'starter',
          status: 'active',
          users: 2,
          mrr: 299,
          createdAt: new Date(),
        },
        {
          id: 'org-3',
          name: 'Org 3',
          slug: 'org-3',
          subscriptionTier: 'enterprise',
          status: 'inactive',
          users: 10,
          mrr: 2500,
          createdAt: new Date(),
        },
      ];

      // Mock getAllOrganizations
      vi.spyOn(organizationService, 'getAllOrganizations').mockResolvedValue(mockOrgs as any);

      const result = await organizationService.getSystemStats();

      expect(result.totalMRR).toBe(3598);
      expect(result.totalUsers).toBe(17);
      expect(result.activeOrganizations).toBe(2);
      expect(result.systemHealth).toBe(99.9);
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(organizationService, 'getAllOrganizations').mockRejectedValue(new Error('Database error'));

      await expect(organizationService.getSystemStats()).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update organization status', async () => {
      const mockUpdated = {
        id: 'org-1',
        status: 'suspended',
        updatedAt: new Date(),
      };

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdated]),
          }),
        }),
      });

      const result = await organizationService.updateStatus('org-1', 'suspended');

      expect(result).toEqual(mockUpdated);
      expect(result.status).toBe('suspended');
    });

    it('should handle database update failure (empty array)', async () => {
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await organizationService.updateStatus('org-1', 'suspended');

      expect(result).toBeUndefined();
    });

    it('should handle database update error', async () => {
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('Database update error')),
          }),
        }),
      });

      await expect(organizationService.updateStatus('org-1', 'suspended')).rejects.toThrow('Database update error');
    });
  });
});

