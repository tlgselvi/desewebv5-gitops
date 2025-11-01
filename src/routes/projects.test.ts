import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { projectRoutes } from './projects.js';
import * as dbModule from '@/db/index.js';

const app = express();
app.use(express.json());
app.use('/projects', projectRoutes);

describe('Projects Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /projects', () => {
    it('should return 200 with empty array when no projects exist', async () => {
      // Arrange
      vi.spyOn(dbModule.db.query.seoProjects, 'findMany').mockResolvedValue([]);

      // Act
      const response = await request(app)
        .get('/projects')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter projects by ownerId when query param provided', async () => {
      // Arrange
      const mockProjects = [{ id: '1', ownerId: 'user-123' }];
      vi.spyOn(dbModule.db.query.seoProjects, 'findMany').mockResolvedValue(mockProjects as any);

      // Act
      const response = await request(app)
        .get('/projects?ownerId=user-123')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe('POST /projects', () => {
    it('should return 400 when validation fails', async () => {
      // Arrange
      const invalidPayload = {
        name: '', // Empty name should fail
        domain: 'not-a-url',
      };

      // Act
      const response = await request(app)
        .post('/projects')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      const incompletePayload = {
        name: 'Test Project',
      };

      // Act
      const response = await request(app)
        .post('/projects')
        .send(incompletePayload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('GET /projects/:id', () => {
    it('should return 400 when id is not a valid UUID', async () => {
      // Act
      const response = await request(app)
        .get('/projects/invalid-id')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 404 when project does not exist', async () => {
      // Arrange
      vi.spyOn(dbModule.db.query.seoProjects, 'findFirst').mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get('/projects/00000000-0000-0000-0000-000000000000')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(404);
    });
  });
});

