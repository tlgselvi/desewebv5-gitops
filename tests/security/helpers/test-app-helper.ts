/**
 * Test App Helper
 * 
 * Provides utilities to create a test Express app instance
 * with security middleware configured for security testing
 * 
 * Note: We don't import setupRoutes() to avoid complex dependencies
 * Tests should define their own routes as needed
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { sanitizeInput, cspHeaders, requestSizeLimiter } from '@/middleware/security.js';
import { errorHandler } from '@/middleware/errorHandler.js';
import jwt from 'jsonwebtoken';
import { config } from '@/config/index.js';

/**
 * Create a test Express app with security middleware
 * This mimics the production app setup for testing
 * 
 * Routes should be defined in individual tests to avoid dependency issues
 */
export function createTestApp(): Application {
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());
  app.use(helmet());
  
  // Security middleware
  app.use(sanitizeInput);
  app.use(cspHeaders);
  app.use(requestSizeLimiter(10 * 1024 * 1024)); // 10MB limit

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Create a minimal test app without routes
 * Useful for testing specific middleware
 */
export function createMinimalTestApp(): Application {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  return app;
}

/**
 * Generate a valid JWT token for testing
 */
export async function getAuthToken(role: string = 'admin'): Promise<string> {
  const payload = {
    id: 'test-user-id',
    email: 'test@example.com',
    role,
    organizationId: 'test-org-id',
    permissions: ['read', 'write']
  };

  // Fallback to a hardcoded secret if config.jwtSecret is missing in test environment
  const secret = config.jwtSecret || 'test-secret-key-for-security-tests-1234567890';
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}
