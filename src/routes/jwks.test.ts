import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { jwksRoutes } from './jwks.js';

const app = express();
app.use('/', jwksRoutes);

describe('JWKS Routes', () => {
  describe('GET /.well-known/jwks.json', () => {
    it('should return JWKS keys', async () => {
      // Act
      const response = await request(app)
        .get('/.well-known/jwks.json')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('keys');
      expect(Array.isArray(response.body.keys)).toBe(true);
      expect(response.body.keys.length).toBeGreaterThan(0);
    });

    it('should return keys with required properties', async () => {
      // Act
      const response = await request(app)
        .get('/.well-known/jwks.json')
        .expect('Content-Type', /json/);

      // Assert
      const key = response.body.keys[0];
      expect(key).toHaveProperty('kid');
      expect(key).toHaveProperty('kty');
      expect(key).toHaveProperty('use');
      expect(key).toHaveProperty('alg');
    });

    it('should return active and next keys', async () => {
      // Act
      const response = await request(app)
        .get('/.well-known/jwks.json')
        .expect('Content-Type', /json/);

      // Assert
      const activeKey = response.body.keys.find((k: any) => k.status === 'active');
      const nextKey = response.body.keys.find((k: any) => k.status === 'next');
      
      expect(activeKey).toBeDefined();
      expect(nextKey).toBeDefined();
    });
  });
});

