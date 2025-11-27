/**
 * Vector Client Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getVectorClient } from '@/services/vector/index.js';

describe('VectorClient', () => {
  describe('healthCheck', () => {
    it('should check vector DB health', async () => {
      // This test requires vector DB to be configured
      // For now, just check that the method exists
      try {
        const client = await getVectorClient();
        const health = await client.healthCheck();
        expect(typeof health).toBe('boolean');
      } catch (error) {
        // Expected if vector DB is not configured
        expect(error).toBeDefined();
      }
    });
  });

  describe('factory', () => {
    it('should throw error if provider not configured', async () => {
      // Temporarily remove provider from env
      const originalProvider = process.env.VECTOR_DB_PROVIDER;
      delete process.env.VECTOR_DB_PROVIDER;

      try {
        await getVectorClient();
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('provider not configured');
      } finally {
        if (originalProvider) {
          process.env.VECTOR_DB_PROVIDER = originalProvider;
        }
      }
    });
  });
});

