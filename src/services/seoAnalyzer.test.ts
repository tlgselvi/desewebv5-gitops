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
  });
});

