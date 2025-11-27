import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeoService } from '@/modules/seo/service.js';
import { db } from '@/db/index.js';
import { seoProjects, seoMetrics } from '@/db/schema/index.js';
import { eq, and } from 'drizzle-orm';

// Mock database
vi.mock('@/db/index.js', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  seoProjects: {},
  seoMetrics: {},
}));

// Mock seoAnalyzer
vi.mock('@/services/seoAnalyzer.js', () => ({
  seoAnalyzer: {
    analyzeUrl: vi.fn(),
    analyzeProject: vi.fn(),
    getProjectMetrics: vi.fn(),
    getProjectTrends: vi.fn(),
  },
}));

describe('SEO Service', () => {
  let seoService: SeoService;

  beforeEach(() => {
    vi.clearAllMocks();
    seoService = new SeoService();
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const mockProject = {
        id: 'project-1',
        organizationId: 'org-1',
        name: 'Test Project',
        domain: 'example.com',
        ownerId: 'user-1',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockProject]),
        }),
      } as any);

      const result = await seoService.createProject({
        organizationId: 'org-1',
        name: 'Test Project',
        domain: 'example.com',
        ownerId: 'user-1',
        primaryKeywords: ['test', 'seo'],
      });

      expect(result).toEqual(mockProject);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should throw error when project creation returns empty result', async () => {
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      await expect(
        seoService.createProject({
          organizationId: 'org-1',
          name: 'Test Project',
          domain: 'example.com',
          ownerId: 'user-1',
          primaryKeywords: ['test'],
        })
      ).rejects.toThrow('Project creation failed');
    });

    it('should handle database errors', async () => {
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      } as any);

      await expect(
        seoService.createProject({
          organizationId: 'org-1',
          name: 'Test Project',
          domain: 'example.com',
          ownerId: 'user-1',
          primaryKeywords: ['test'],
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('getProjectById', () => {
    it('should return project when found', async () => {
      const mockProject = {
        id: 'project-1',
        organizationId: 'org-1',
        name: 'Test Project',
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockProject]),
          }),
        }),
      } as any);

      const result = await seoService.getProjectById('project-1', 'org-1');

      expect(result).toEqual(mockProject);
    });

    it('should return null when project not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await seoService.getProjectById('project-1', 'org-1');

      expect(result).toBeNull();
    });

    it('should return null when project belongs to different organization', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await seoService.getProjectById('project-1', 'org-2');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      } as any);

      await expect(
        seoService.getProjectById('project-1', 'org-1')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getOrganizationProjects', () => {
    it('should return projects for organization', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project 1',
          domain: 'example.com',
          targetRegion: 'Türkiye',
          status: 'active',
          createdAt: new Date(),
        },
        {
          id: 'project-2',
          name: 'Project 2',
          domain: 'example2.com',
          targetRegion: 'Türkiye',
          status: 'active',
          createdAt: new Date(),
        },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockProjects),
          }),
        }),
      } as any);

      const result = await seoService.getOrganizationProjects('org-1');

      expect(result).toEqual(mockProjects);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no projects found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await seoService.getOrganizationProjects('org-1');

      expect(result).toEqual([]);
    });
  });

  describe('getUserProjects', () => {
    it('should return projects for user within organization', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project 1',
          domain: 'example.com',
          targetRegion: 'Türkiye',
          status: 'active',
          createdAt: new Date(),
        },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockProjects),
          }),
        }),
      } as any);

      const result = await seoService.getUserProjects('user-1', 'org-1');

      expect(result).toEqual(mockProjects);
    });
  });

  describe('analyzeProject', () => {
    it('should analyze project successfully', async () => {
      const mockProject = {
        id: 'project-1',
        organizationId: 'org-1',
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockProject]),
          }),
        }),
      } as any);

      const { seoAnalyzer } = await import('@/services/seoAnalyzer.js');
      const mockResult = {
        projectId: 'project-1',
        totalUrls: 1,
        successfulAnalyses: 1,
        failedAnalyses: 0,
        results: [],
        errors: [],
      };
      vi.mocked(seoAnalyzer.analyzeProject).mockResolvedValue(mockResult);

      const result = await seoService.analyzeProject(
        {
          projectId: 'project-1',
          urls: ['https://example.com'],
        },
        'org-1'
      );

      expect(result).toEqual(mockResult);
      expect(seoAnalyzer.analyzeProject).toHaveBeenCalled();
    });

    it('should throw error when project not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(
        seoService.analyzeProject(
          {
            projectId: 'project-1',
            urls: ['https://example.com'],
          },
          'org-1'
        )
      ).rejects.toThrow('Project not found or access denied');
    });

    it('should throw error when project belongs to different organization', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(
        seoService.analyzeProject(
          {
            projectId: 'project-1',
            urls: ['https://example.com'],
          },
          'org-2'
        )
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('getProjectMetrics', () => {
    it('should return metrics for project', async () => {
      const mockProject = {
        id: 'project-1',
        organizationId: 'org-1',
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockProject]),
          }),
        }),
      } as any);

      const { seoAnalyzer } = await import('@/services/seoAnalyzer.js');
      const mockMetrics = [
        {
          id: 'metric-1',
          projectId: 'project-1',
          performance: '85.5',
          seo: '90.0',
        },
      ];
      vi.mocked(seoAnalyzer.getProjectMetrics).mockResolvedValue(mockMetrics);

      const result = await seoService.getProjectMetrics('project-1', 'org-1', 10);

      expect(result).toEqual(mockMetrics);
    });

    it('should throw error when project not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(
        seoService.getProjectMetrics('project-1', 'org-1', 10)
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('getProjectTrends', () => {
    it('should return trends for project', async () => {
      const mockProject = {
        id: 'project-1',
        organizationId: 'org-1',
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockProject]),
          }),
        }),
      } as any);

      const { seoAnalyzer } = await import('@/services/seoAnalyzer.js');
      const mockTrends = {
        projectId: 'project-1',
        period: '30 days',
        metrics: [],
        trends: null,
      };
      vi.mocked(seoAnalyzer.getProjectTrends).mockResolvedValue(mockTrends);

      const result = await seoService.getProjectTrends('project-1', 'org-1', 30);

      expect(result).toEqual(mockTrends);
    });

    it('should throw error when project not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(
        seoService.getProjectTrends('project-1', 'org-1', 30)
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('analyzeUrl', () => {
    it('should analyze URL successfully', async () => {
      const { seoAnalyzer } = await import('@/services/seoAnalyzer.js');
      const mockResult = {
        url: 'https://example.com',
        scores: { performance: 85, seo: 90 },
        coreWebVitals: {},
        opportunities: [],
        diagnostics: [],
        rawData: {},
        analyzedAt: new Date().toISOString(),
      };
      vi.mocked(seoAnalyzer.analyzeUrl).mockResolvedValue(mockResult);

      const result = await seoService.analyzeUrl('https://example.com');

      expect(result).toEqual(mockResult);
      expect(seoAnalyzer.analyzeUrl).toHaveBeenCalledWith('https://example.com', undefined);
    });

    it('should handle analysis errors', async () => {
      const { seoAnalyzer } = await import('@/services/seoAnalyzer.js');
      vi.mocked(seoAnalyzer.analyzeUrl).mockRejectedValue(new Error('Analysis failed'));

      await expect(
        seoService.analyzeUrl('https://example.com')
      ).rejects.toThrow('Analysis failed');
    });
  });
});

