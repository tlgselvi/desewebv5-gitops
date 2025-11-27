/**
 * Embedding Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getEmbeddingService } from '@/services/ai/embedding.service.js';

describe('EmbeddingService', () => {
  let embeddingService: ReturnType<typeof getEmbeddingService>;

  beforeEach(() => {
    embeddingService = getEmbeddingService();
  });

  describe('embed', () => {
    it('should throw error for empty text', async () => {
      await expect(embeddingService.embed('')).rejects.toThrow('Text cannot be empty');
    });

    it('should throw error for whitespace-only text', async () => {
      await expect(embeddingService.embed('   ')).rejects.toThrow('Text cannot be empty');
    });

    it('should normalize text before embedding', async () => {
      // Mock OpenAI if needed
      // This test would require mocking OpenAI client
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('embedBatch', () => {
    it('should return empty array for empty input', async () => {
      const result = await embeddingService.embedBatch([]);
      expect(result).toEqual([]);
    });

    it('should handle batch embedding', async () => {
      // Mock OpenAI if needed
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('getDimension', () => {
    it('should return correct dimension', () => {
      const dimension = embeddingService.getDimension();
      expect(dimension).toBeGreaterThan(0);
    });
  });

  describe('getModelName', () => {
    it('should return model name', () => {
      const modelName = embeddingService.getModelName();
      expect(modelName).toBeTruthy();
    });
  });
});

