import { describe, it, expect, beforeEach, vi } from 'vitest';
import { contentGenerator } from './contentGenerator.js';
import * as dbModule from '@/db/index.js';

describe('ContentGenerator Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateContent', () => {
    it('should throw error when project does not exist', async () => {
      // Arrange
      const request = {
        projectId: '00000000-0000-0000-0000-000000000000',
        contentType: 'blog_post' as const,
        keywords: ['test'],
      };
      vi.spyOn(dbModule.db.query.seoProjects, 'findFirst').mockResolvedValue(null);

      // Act & Assert
      await expect(
        contentGenerator.generateContent(request as any)
      ).rejects.toThrow('Project not found');
    });

    it('should validate request schema', async () => {
      // Arrange
      const invalidRequest = {
        projectId: 'not-a-uuid',
        contentType: 'invalid_type',
        keywords: [],
      };

      // Act & Assert
      await expect(
        contentGenerator.generateContent(invalidRequest as any)
      ).rejects.toThrow();
    });

    it('should validate wordCount range', async () => {
      // Arrange
      const invalidRequest = {
        projectId: '00000000-0000-0000-0000-000000000000',
        contentType: 'blog_post' as const,
        keywords: ['test'],
        wordCount: 50, // Less than minimum 100
      };

      // Act & Assert
      await expect(
        contentGenerator.generateContent(invalidRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('createTemplate', () => {
    it('should validate template schema', async () => {
      // Arrange
      const invalidTemplate = {
        name: '',
        type: 'blog_post',
      };

      // Act & Assert
      await expect(
        contentGenerator.createTemplate(invalidTemplate as any)
      ).rejects.toThrow();
    });
  });
});

