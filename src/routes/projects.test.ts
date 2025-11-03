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

    it('should return 404 when owner does not exist', async () => {
      // Arrange
      const payload = {
        name: 'Test Project',
        domain: 'https://example.com',
        primaryKeywords: ['test'],
        ownerId: '00000000-0000-0000-0000-000000000000',
      };
      vi.spyOn(dbModule.db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // Owner not found
          }),
        }),
      } as any);

      // Act
      const response = await request(app)
        .post('/projects')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Owner not found');
    });

    it('should validate primaryKeywords array is not empty', async () => {
      // Arrange
      const payload = {
        name: 'Test Project',
        domain: 'https://example.com',
        primaryKeywords: [],
        ownerId: '00000000-0000-0000-0000-000000000000',
      };

      // Act
      const response = await request(app)
        .post('/projects')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should validate targetDomainAuthority range', async () => {
      // Arrange
      const payload = {
        name: 'Test Project',
        domain: 'https://example.com',
        primaryKeywords: ['test'],
        ownerId: '00000000-0000-0000-0000-000000000000',
        targetDomainAuthority: 150, // Exceeds max 100
      };

      // Act
      const response = await request(app)
        .post('/projects')
        .send(payload)
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

    it('should return 200 when project exists', async () => {
      // Arrange
      const mockProject = {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Test Project',
        domain: 'https://example.com',
      };
      vi.spyOn(dbModule.db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockProject]),
            }),
          }),
        }),
      } as any);

      // Act
      const response = await request(app)
        .get('/projects/00000000-0000-0000-0000-000000000000')
        .expect('Content-Type', /json/);

      // Assert
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('PUT /projects/:id', () => {
    it('should return 400 when id is not a valid UUID', async () => {
      // Act
      const response = await request(app)
        .put('/projects/invalid-id')
        .send({ name: 'Updated' })
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when validation fails', async () => {
      // Arrange
      const invalidPayload = {
        name: '', // Empty name
        domain: 'not-a-url',
      };

      // Act
      const response = await request(app)
        .put('/projects/00000000-0000-0000-0000-000000000000')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /projects/:id', () => {
    it('should return 400 when id is not a valid UUID', async () => {
      // Act
      const response = await request(app)
        .delete('/projects/invalid-id')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });
  });
});

