import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authRoutes } from './auth.js';
import { errorHandler } from '@/middleware/errorHandler.js';
import * as dbModule from '@/db/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use(errorHandler); // Error handler must be last

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should return 400 when username is missing', async () => {
      // Arrange
      const payload = { password: 'password123' };

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when password is missing', async () => {
      // Arrange
      const payload = { username: 'testuser' };

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 401 when user does not exist', async () => {
      // Arrange
      const payload = { username: 'nonexistent', password: 'password123' };
      vi.spyOn(dbModule.db.query.users, 'findFirst').mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 401 when password is incorrect', async () => {
      // Arrange
      const payload = { username: 'testuser', password: 'wrongpassword' };
      const mockUser = {
        id: '123',
        username: 'testuser',
        password: 'hashedPassword',
      };
      vi.spyOn(dbModule.db.query.users, 'findFirst').mockResolvedValue(mockUser as any);
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 401 when user is inactive', async () => {
      // Arrange
      const payload = { username: 'testuser', password: 'password123' };
      const mockUser = {
        id: '123',
        email: 'testuser@example.com',
        password: 'hashedPassword',
        isActive: false,
      };
      vi.spyOn(dbModule.db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Account disabled');
    });

    it('should return 500 when database connection fails', async () => {
      // Arrange
      const payload = { username: 'testuser', password: 'password123' };
      vi.spyOn(dbModule.db, 'select').mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database connection failed');
    });
  });

  describe('POST /auth/register', () => {
    it('should return 400 when email is invalid', async () => {
      // Arrange
      const payload = {
        email: 'invalid-email',
        password: 'password123',
      };

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when password is too short', async () => {
      // Arrange
      const payload = {
        email: 'test@example.com',
        password: '12345', // Less than 6 characters
      };

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      const payload = {
        email: 'test@example.com',
        // Missing password
      };

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 409 when email already exists', async () => {
      // Arrange
      const payload = {
        email: 'existing@example.com',
        password: 'password123',
      };
      vi.spyOn(dbModule.db.query.users, 'findFirst').mockResolvedValue({
        id: '123',
        email: 'existing@example.com',
      } as any);

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect([400, 409]).toContain(response.status);
    });
  });
});

