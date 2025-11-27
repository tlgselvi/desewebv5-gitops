import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createTestApp, getAuthToken } from './helpers/test-app-helper.js';
import { setupRoutes } from '@/routes/index.js';

describe('Security: SQL Injection Tests', () => {
  let app: any;
  let token: string;

  beforeAll(async () => {
    app = createTestApp();
    setupRoutes(app);
    token = await getAuthToken();
  });

  describe('Authentication Endpoints', () => {
    it('should prevent SQL injection in login', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: "' OR '1'='1",
          password: "' OR '1'='1"
        });

      expect(response.status).not.toBe(200);
      expect(response.status).toBe(400); // Validation error expected
    });
  });

  describe('Resource Endpoints (RLS Bypass Attempt)', () => {
    it('should prevent SQL injection in ID parameters', async () => {
      // Try to inject SQL into a UUID parameter
      const maliciousId = "123e4567-e89b-12d3-a456-426614174000' OR '1'='1";
      
      const response = await request(app)
        .get(`/api/v1/projects/${maliciousId}`)
        .set('Authorization', `Bearer ${token}`);

      // Should return 400 (Validation) or 404 (Not Found), NOT 500 (DB Error)
      expect(response.status).not.toBe(500);
      // Ideally Zod validation catches this before DB
      expect(response.status).toBe(400); 
    });
  });
});

