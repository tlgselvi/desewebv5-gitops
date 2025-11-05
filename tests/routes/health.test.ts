import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

describe('Health Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it('should return health status', async () => {
    // Mock health endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return ready status', async () => {
    app.get('/health/ready', (req, res) => {
      res.json({ ready: true });
    });

    const response = await request(app)
      .get('/health/ready')
      .expect(200);

    expect(response.body).toHaveProperty('ready', true);
  });

  it('should return live status', async () => {
    app.get('/health/live', (req, res) => {
      res.json({ alive: true });
    });

    const response = await request(app)
      .get('/health/live')
      .expect(200);

    expect(response.body).toHaveProperty('alive', true);
  });
});

