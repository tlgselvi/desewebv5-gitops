import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { healthRoutes } from './health.js';
import * as dbModule from '@/db/index.js';
import * as redisModule from '@/services/storage/redisClient.js';

const app = express();
app.use('/health', healthRoutes);

describe('Health Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 when all services are healthy', async () => {
      // Arrange
      vi.spyOn(dbModule, 'checkDatabaseConnection').mockResolvedValue(true);
      vi.spyOn(redisModule, 'checkRedisConnection').mockResolvedValue(true);

      // Act
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.database).toBe('connected');
      expect(response.body.services.database).toBe(true);
      expect(response.body.services.redis).toBe(true);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
    });

    it('should return 503 when database is disconnected', async () => {
      // Arrange
      vi.spyOn(dbModule, 'checkDatabaseConnection').mockResolvedValue(false);
      vi.spyOn(redisModule, 'checkRedisConnection').mockResolvedValue(true);

      // Act
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.database).toBe('disconnected');
    });

    it('should return 503 when redis is disconnected', async () => {
      // Arrange
      vi.spyOn(dbModule, 'checkDatabaseConnection').mockResolvedValue(true);
      vi.spyOn(redisModule, 'checkRedisConnection').mockResolvedValue(false);

      // Act
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
    });

    it('should return 503 when both database and redis are disconnected', async () => {
      // Arrange
      vi.spyOn(dbModule, 'checkDatabaseConnection').mockResolvedValue(false);
      vi.spyOn(redisModule, 'checkRedisConnection').mockResolvedValue(false);

      // Act
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.services.database).toBe(false);
      expect(response.body.services.redis).toBe(false);
    });

    it('should handle redis connection errors gracefully', async () => {
      // Arrange
      vi.spyOn(dbModule, 'checkDatabaseConnection').mockResolvedValue(true);
      vi.spyOn(redisModule, 'checkRedisConnection').mockRejectedValue(
        new Error('Redis connection failed')
      );

      // Act
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      vi.spyOn(dbModule, 'checkDatabaseConnection').mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.error).toBe('Health check failed');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 when database and redis are ready', async () => {
      // Arrange
      vi.spyOn(dbModule, 'checkDatabaseConnection').mockResolvedValue(true);
      vi.spyOn(redisModule, 'checkRedisConnection').mockResolvedValue(true);

      // Act
      const response = await request(app)
        .get('/health/ready')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ready');
    });

    it('should return 503 when database is not ready', async () => {
      // Arrange
      vi.spyOn(dbModule, 'checkDatabaseConnection').mockResolvedValue(false);
      vi.spyOn(redisModule, 'checkRedisConnection').mockResolvedValue(true);

      // Act
      const response = await request(app)
        .get('/health/ready')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('not ready');
      expect(response.body.database).toBe(false);
    });

    it('should return 503 when redis is not ready', async () => {
      // Arrange
      vi.spyOn(dbModule, 'checkDatabaseConnection').mockResolvedValue(true);
      vi.spyOn(redisModule, 'checkRedisConnection').mockResolvedValue(false);

      // Act
      const response = await request(app)
        .get('/health/ready')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('not ready');
      expect(response.body.redis).toBe(false);
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 with alive status', async () => {
      // Act
      const response = await request(app)
        .get('/health/live')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('alive');
    });

    it('should always return 200 regardless of service status', async () => {
      // Arrange
      vi.spyOn(dbModule, 'checkDatabaseConnection').mockResolvedValue(false);
      vi.spyOn(redisModule, 'checkRedisConnection').mockResolvedValue(false);

      // Act
      const response = await request(app)
        .get('/health/live')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('alive');
    });

    it('should return timestamp in response', async () => {
      // Act
      const response = await request(app)
        .get('/health/live')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('string');
    });
  });
});

