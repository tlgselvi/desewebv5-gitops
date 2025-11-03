import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedbackStore, checkRedisConnection } from './redisClient.js';
import { redis } from './redisClient.js';

describe('RedisClient Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FeedbackStore', () => {
    describe('save', () => {
      it('should save feedback entry', async () => {
        // Arrange
        const entry = {
          timestamp: Date.now(),
          metric: 'cpu_usage',
          anomaly: true,
          verdict: 'positive',
          comment: 'Test comment',
          source: 'manual',
          type: 'anomaly',
          severity: 'high',
        };
        vi.spyOn(redis, 'set').mockResolvedValue('OK');

        // Act
        await FeedbackStore.save(entry);

        // Assert
        expect(redis.set).toHaveBeenCalled();
      });
    });

    describe('getAll', () => {
      it('should return all feedback entries', async () => {
        // Arrange
        const mockKeys = ['feedback:1', 'feedback:2'];
        const mockEntries = [
          { timestamp: 1, metric: 'cpu', anomaly: true },
          { timestamp: 2, metric: 'memory', anomaly: false },
        ];
        vi.spyOn(redis, 'keys').mockResolvedValue(mockKeys);
        vi.spyOn(redis, 'mget').mockResolvedValue(mockEntries.map(e => JSON.stringify(e)));

        // Act
        const result = await FeedbackStore.getAll();

        // Assert
        expect(Array.isArray(result)).toBe(true);
      });

      it('should return empty array when no feedback exists', async () => {
        // Arrange
        vi.spyOn(redis, 'keys').mockResolvedValue([]);

        // Act
        const result = await FeedbackStore.getAll();

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('clear', () => {
      it('should clear all feedback entries', async () => {
        // Arrange
        const mockKeys = ['feedback:1', 'feedback:2'];
        vi.spyOn(redis, 'keys').mockResolvedValue(mockKeys);
        vi.spyOn(redis, 'del').mockResolvedValue(2);

        // Act
        const deleted = await FeedbackStore.clear();

        // Assert
        expect(deleted).toBe(2);
      });

      it('should return 0 when no entries exist', async () => {
        // Arrange
        vi.spyOn(redis, 'keys').mockResolvedValue([]);

        // Act
        const deleted = await FeedbackStore.clear();

        // Assert
        expect(deleted).toBe(0);
      });
    });

    describe('count', () => {
      it('should return count of feedback entries', async () => {
        // Arrange
        const mockKeys = ['feedback:1', 'feedback:2', 'feedback:3'];
        vi.spyOn(redis, 'keys').mockResolvedValue(mockKeys);

        // Act
        const count = await FeedbackStore.count();

        // Assert
        expect(count).toBe(3);
      });
    });
  });

  describe('checkRedisConnection', () => {
    it('should return true when Redis is connected', async () => {
      // Arrange
      vi.spyOn(redis, 'ping').mockResolvedValue('PONG');

      // Act
      const isConnected = await checkRedisConnection();

      // Assert
      expect(isConnected).toBe(true);
    });

    it('should return false when Redis connection fails', async () => {
      // Arrange
      vi.spyOn(redis, 'ping').mockRejectedValue(new Error('Connection failed'));

      // Act
      const isConnected = await checkRedisConnection();

      // Assert
      expect(isConnected).toBe(false);
    });

    it('should return false when Redis ping times out', async () => {
      // Arrange
      vi.spyOn(redis, 'ping').mockRejectedValue(new Error('ETIMEDOUT'));

      // Act
      const isConnected = await checkRedisConnection();

      // Assert
      expect(isConnected).toBe(false);
    });
  });

  describe('FeedbackStore - Error Handling', () => {
    describe('save', () => {
      it('should handle Redis set errors', async () => {
        // Arrange
        const entry = {
          timestamp: Date.now(),
          metric: 'cpu_usage',
          anomaly: true,
          verdict: 'positive',
          comment: 'Test comment',
          source: 'manual',
          type: 'anomaly',
          severity: 'high',
        };
        vi.spyOn(redis, 'set').mockRejectedValue(new Error('Redis error'));

        // Act & Assert
        await expect(FeedbackStore.save(entry)).rejects.toThrow();
      });

      it('should validate entry has required fields', async () => {
        // Arrange
        const incompleteEntry = {
          timestamp: Date.now(),
          metric: 'cpu_usage',
          // Missing required fields
        };

        // Act & Assert
        await expect(FeedbackStore.save(incompleteEntry as any)).rejects.toThrow();
      });
    });

    describe('getAll', () => {
      it('should handle Redis keys errors', async () => {
        // Arrange
        vi.spyOn(redis, 'keys').mockRejectedValue(new Error('Redis error'));

        // Act & Assert
        await expect(FeedbackStore.getAll()).rejects.toThrow();
      });

      it('should handle invalid JSON in Redis values', async () => {
        // Arrange
        const mockKeys = ['feedback:1'];
        vi.spyOn(redis, 'keys').mockResolvedValue(mockKeys);
        vi.spyOn(redis, 'mget').mockResolvedValue(['invalid-json']);

        // Act
        const result = await FeedbackStore.getAll();

        // Assert - Should handle gracefully
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('clear', () => {
      it('should handle Redis del errors', async () => {
        // Arrange
        const mockKeys = ['feedback:1'];
        vi.spyOn(redis, 'keys').mockResolvedValue(mockKeys);
        vi.spyOn(redis, 'del').mockRejectedValue(new Error('Redis error'));

        // Act & Assert
        await expect(FeedbackStore.clear()).rejects.toThrow();
      });
    });

    describe('count', () => {
      it('should handle Redis keys errors', async () => {
        // Arrange
        vi.spyOn(redis, 'keys').mockRejectedValue(new Error('Redis error'));

        // Act & Assert
        await expect(FeedbackStore.count()).rejects.toThrow();
      });
    });
  });
});

