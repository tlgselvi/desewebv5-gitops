import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authRoutes } from './auth.js';
import * as dbModule from '@/db/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

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
  });
});

