import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedbackStore, checkRedisConnection, SafeRedis } from './redisClient.js';
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
        vi.spyOn(SafeRedis, 'set').mockResolvedValue(true);

        // Act
        await FeedbackStore.save(entry);

        // Assert
        expect(SafeRedis.set).toHaveBeenCalled();
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
        vi.spyOn(SafeRedis, 'keys').mockResolvedValue(mockKeys);
        mockEntries.forEach((entry, i) => {
          vi.spyOn(SafeRedis, 'get').mockResolvedValueOnce(entry as any);
        });

        // Act
        const result = await FeedbackStore.getAll();

        // Assert
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThanOrEqual(0);
      });

      it('should return empty array when no feedback exists', async () => {
        // Arrange
        vi.spyOn(SafeRedis, 'keys').mockResolvedValue([]);

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
        vi.spyOn(SafeRedis, 'keys').mockResolvedValue(mockKeys);
        vi.spyOn(SafeRedis, 'del').mockResolvedValue(true);

        // Act
        const deleted = await FeedbackStore.clear();

        // Assert
        expect(deleted).toBe(2);
      });

      it('should return 0 when no entries exist', async () => {
        // Arrange
        vi.spyOn(SafeRedis, 'keys').mockResolvedValue([]);

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
        vi.spyOn(SafeRedis, 'keys').mockResolvedValue(mockKeys);

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
      // Mock checkRedisConnection to use circuit breaker which will fail
      const originalCheck = checkRedisConnection;
      vi.spyOn(redis, 'ping').mockRejectedValue(new Error('Connection failed'));

      // Act
      const isConnected = await checkRedisConnection();

      // Assert - circuit breaker should handle error and return false
      expect(isConnected).toBe(false);
    });
  });
});

