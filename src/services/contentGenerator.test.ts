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

    it('should validate wordCount maximum', async () => {
      // Arrange
      const invalidRequest = {
        projectId: '00000000-0000-0000-0000-000000000000',
        contentType: 'blog_post' as const,
        keywords: ['test'],
        wordCount: 10000, // More than maximum 5000
      };

      // Act & Assert
      await expect(
        contentGenerator.generateContent(invalidRequest as any)
      ).rejects.toThrow();
    });

    it('should validate contentType enum', async () => {
      // Arrange
      const invalidRequest = {
        projectId: '00000000-0000-0000-0000-000000000000',
        contentType: 'invalid_type' as any,
        keywords: ['test'],
      };

      // Act & Assert
      await expect(
        contentGenerator.generateContent(invalidRequest as any)
      ).rejects.toThrow();
    });

    it('should validate tone enum', async () => {
      // Arrange
      const invalidRequest = {
        projectId: '00000000-0000-0000-0000-000000000000',
        contentType: 'blog_post' as const,
        keywords: ['test'],
        tone: 'invalid_tone' as any,
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

    it('should validate template name is required', async () => {
      // Arrange
      const invalidTemplate = {
        type: 'blog_post',
      };

      // Act & Assert
      await expect(
        contentGenerator.createTemplate(invalidTemplate as any)
      ).rejects.toThrow();
    });

    it('should validate template type enum', async () => {
      // Arrange
      const invalidTemplate = {
        name: 'Test Template',
        type: 'invalid_type',
      };

      // Act & Assert
      await expect(
        contentGenerator.createTemplate(invalidTemplate as any)
      ).rejects.toThrow();
    });
  });

  describe('generateContent - Additional Validations', () => {
    it('should validate keywords array is not empty', async () => {
      // Arrange
      const invalidRequest = {
        projectId: '00000000-0000-0000-0000-000000000000',
        contentType: 'blog_post' as const,
        keywords: [],
      };

      // Act & Assert
      await expect(
        contentGenerator.generateContent(invalidRequest as any)
      ).rejects.toThrow();
    });

    it('should validate keywords array maximum length', async () => {
      // Arrange
      const invalidRequest = {
        projectId: '00000000-0000-0000-0000-000000000000',
        contentType: 'blog_post' as const,
        keywords: Array(21).fill('keyword'), // More than 20
      };

      // Act & Assert
      await expect(
        contentGenerator.generateContent(invalidRequest as any)
      ).rejects.toThrow();
    });

    it('should validate keywords are strings', async () => {
      // Arrange
      const invalidRequest = {
        projectId: '00000000-0000-0000-0000-000000000000',
        contentType: 'blog_post' as const,
        keywords: [123, 456], // Numbers instead of strings
      };

      // Act & Assert
      await expect(
        contentGenerator.generateContent(invalidRequest as any)
      ).rejects.toThrow();
    });
  });
});

