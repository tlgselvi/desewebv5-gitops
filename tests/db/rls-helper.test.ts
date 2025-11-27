import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setRLSContext, clearRLSContext, withRLSContext } from '@/db/rls-helper.js';
import { getPostgresClient } from '@/db/index.js';

// Mock database client (postgres-js uses template literals)
const mockClient = vi.fn();

vi.mock('@/db/index.js', () => ({
  getPostgresClient: vi.fn(() => mockClient),
}));

// Mock logger
vi.mock('@/utils/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('RLS Helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setRLSContext', () => {
    it('should set RLS context variables', async () => {
      mockClient.mockResolvedValue(undefined);

      await setRLSContext('org-1', 'user-1', 'admin');

      expect(mockClient).toHaveBeenCalledTimes(3);
    });

    it('should set context even when organizationId is missing (for super_admin)', async () => {
      mockClient.mockResolvedValue(undefined);

      await setRLSContext(undefined, 'user-1', 'super_admin');

      // Should still set user_id and user_role, but skip organization_id
      expect(mockClient).toHaveBeenCalledTimes(2); // user_id and user_role only
    });

    it('should throw error when userId is missing', async () => {
      await expect(
        setRLSContext('org-1', '', 'admin')
      ).rejects.toThrow('RLS context requires userId');
    });

    it('should handle errors gracefully', async () => {
      mockClient.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(setRLSContext('org-1', 'user-1', 'admin')).resolves.not.toThrow();
    });
  });

  describe('clearRLSContext', () => {
    it('should clear RLS context variables', async () => {
      mockClient.mockResolvedValue(undefined);

      await clearRLSContext();

      expect(mockClient).toHaveBeenCalledTimes(3);
    });

    it('should handle errors gracefully', async () => {
      mockClient.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(clearRLSContext()).resolves.not.toThrow();
    });
  });

  describe('withRLSContext', () => {
    it('should set context, execute query, and clear context', async () => {
      mockClient.mockResolvedValue(undefined);
      const queryFn = vi.fn().mockResolvedValue('result');

      const result = await withRLSContext('org-1', 'user-1', 'admin', queryFn);

      expect(result).toBe('result');
      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(mockClient).toHaveBeenCalled();
    });

    it('should clear context even if query fails', async () => {
      mockClient.mockResolvedValue(undefined);
      const queryFn = vi.fn().mockRejectedValue(new Error('Query failed'));

      await expect(
        withRLSContext('org-1', 'user-1', 'admin', queryFn)
      ).rejects.toThrow('Query failed');

      expect(queryFn).toHaveBeenCalledTimes(1);
      // Context should still be cleared
      expect(mockClient).toHaveBeenCalled();
    });
  });
});

