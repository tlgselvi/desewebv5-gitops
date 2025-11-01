import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { autoRemediationRoutes } from './autoRemediation.js';
import { AutoRemediator } from '@/services/aiops/autoRemediator.js';

const app = express();
app.use(express.json());
app.use('/', autoRemediationRoutes);

describe('AutoRemediation Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /aiops/remediate', () => {
    it('should return 400 when metric is missing', async () => {
      // Arrange
      const payload = {
        severity: 'high',
      };

      // Act
      const response = await request(app)
        .post('/aiops/remediate')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('metric');
    });

    it('should return 400 when severity is missing', async () => {
      // Arrange
      const payload = {
        metric: 'cpu_usage',
      };

      // Act
      const response = await request(app)
        .post('/aiops/remediate')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('severity');
    });

    it('should execute remediation when valid data provided', async () => {
      // Arrange
      const payload = {
        metric: 'cpu_usage',
        severity: 'high',
      };
      vi.spyOn(AutoRemediator.prototype, 'suggestAction').mockReturnValue('Restart deployment');
      vi.spyOn(AutoRemediator.prototype, 'recordEvent').mockImplementation(() => {});

      // Act
      const response = await request(app)
        .post('/aiops/remediate')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('action');
    });
  });

  describe('GET /aiops/remediation-log', () => {
    it('should return remediation log', async () => {
      // Arrange
      vi.spyOn(AutoRemediator.prototype, 'replay').mockReturnValue([
        {
          timestamp: Date.now(),
          metric: 'cpu_usage',
          action: 'scale_up',
          severity: 'high' as const,
          status: 'executed' as const,
        },
      ]);

      // Act
      const response = await request(app)
        .get('/aiops/remediation-log')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.events)).toBe(true);
    });
  });
});

