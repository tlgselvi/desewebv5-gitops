import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seoAnalyzer } from './seoAnalyzer.js';
import * as dbModule from '@/db/index.js';

describe('SeoAnalyzer Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeProject', () => {
    it('should throw error when project does not exist', async () => {
      // Arrange
      const request = {
        projectId: '00000000-0000-0000-0000-000000000000',
        urls: ['https://example.com'],
      };
      vi.spyOn(dbModule.db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      // Act & Assert
      await expect(
        seoAnalyzer.analyzeProject(request as any)
      ).rejects.toThrow('Project not found');
    });

    it('should validate request schema', async () => {
      // Arrange
      const invalidRequest = {
        projectId: 'not-a-uuid',
        urls: ['not-a-url'],
      };

      // Act & Assert
      await expect(
        seoAnalyzer.analyzeProject(invalidRequest as any)
      ).rejects.toThrow();
    });

    it('should validate URLs array length', async () => {
      // Arrange
      const invalidRequest = {
        projectId: '00000000-0000-0000-0000-000000000000',
        urls: Array(11).fill('https://example.com'), // More than 10
      };

      // Act & Assert
      await expect(
        seoAnalyzer.analyzeProject(invalidRequest as any)
      ).rejects.toThrow();
    });

    it('should validate empty URLs array', async () => {
      // Arrange
      const invalidRequest = {
        projectId: '00000000-0000-0000-0000-000000000000',
        urls: [],
      };

      // Act & Assert
      await expect(
        seoAnalyzer.analyzeProject(invalidRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('getProjectMetrics', () => {
    it('should throw error when project does not exist', async () => {
      // Arrange
      const projectId = '00000000-0000-0000-0000-000000000000';
      vi.spyOn(dbModule.db.query.seoProjects, 'findFirst').mockResolvedValue(null);

      // Act & Assert
      await expect(
        seoAnalyzer.getProjectMetrics(projectId, 10)
      ).rejects.toThrow('Project not found');
    });

    it('should validate limit range', async () => {
      // Arrange
      const projectId = '00000000-0000-0000-0000-000000000000';
      const mockProject = { id: projectId };
      vi.spyOn(dbModule.db.query.seoProjects, 'findFirst').mockResolvedValue(mockProject as any);

      // Act & Assert - limit > 100 should fail
      await expect(
        seoAnalyzer.getProjectMetrics(projectId, 200)
      ).rejects.toThrow();
    });
  });
});

