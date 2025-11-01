import { describe, it, expect, beforeEach, vi } from 'vitest';
import { verifyProjectAccess, requireProjectAccess } from './projectAccess.js';
import { db, seoProjects } from '@/db/index.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';

// Mock database
vi.mock('@/db/index.js', () => ({
  db: {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  },
  seoProjects: {},
}));

vi.mock('@/utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('Project Access Utility', () => {
  let mockQuery: any;

  beforeEach(() => {
    mockQuery = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(),
    };

    vi.mocked(db.select).mockReturnValue(mockQuery);
    vi.mocked(db.from).mockReturnValue(mockQuery);
    vi.clearAllMocks();
  });

  describe('verifyProjectAccess', () => {
    it('should allow admin access to any project', async () => {
      mockQuery.limit.mockResolvedValue([
        {
          id: 'project-123',
          ownerId: 'other-user',
          name: 'Test Project',
        },
      ]);

      const result = await verifyProjectAccess(
        'project-123',
        'admin-user',
        'admin'
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe('project-123');
    });

    it('should allow owner access to their project', async () => {
      mockQuery.limit.mockResolvedValue([
        {
          id: 'project-123',
          ownerId: 'user-123',
          name: 'Test Project',
        },
      ]);

      const result = await verifyProjectAccess(
        'project-123',
        'user-123',
        'user'
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe('project-123');
    });

    it('should deny access if project not found', async () => {
      mockQuery.limit.mockResolvedValue([]);

      const result = await verifyProjectAccess(
        'non-existent',
        'user-123',
        'user'
      );

      expect(result).toBeNull();
    });

    it('should deny access if user is not owner and not admin', async () => {
      mockQuery.limit.mockResolvedValue([
        {
          id: 'project-123',
          ownerId: 'other-user',
          name: 'Test Project',
        },
      ]);

      const result = await verifyProjectAccess(
        'project-123',
        'user-123',
        'user'
      );

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.limit.mockRejectedValue(new Error('Database error'));

      const result = await verifyProjectAccess(
        'project-123',
        'user-123',
        'user'
      );

      expect(result).toBeNull();
    });
  });

  describe('requireProjectAccess', () => {
    it('should return hasAccess false if user not authenticated', async () => {
      const req = {} as AuthenticatedRequest;

      const result = await requireProjectAccess(req, 'project-123');

      expect(result.hasAccess).toBe(false);
      expect(result.project).toBeUndefined();
    });

    it('should return hasAccess true for authorized user', async () => {
      mockQuery.limit.mockResolvedValue([
        {
          id: 'project-123',
          ownerId: 'user-123',
          name: 'Test Project',
        },
      ]);

      const req = {
        user: {
          id: 'user-123',
          email: 'test@test.com',
          role: 'user',
        },
      } as AuthenticatedRequest;

      const result = await requireProjectAccess(req, 'project-123');

      expect(result.hasAccess).toBe(true);
      expect(result.project).toBeDefined();
      expect(result.project?.id).toBe('project-123');
    });

    it('should return hasAccess false for unauthorized user', async () => {
      mockQuery.limit.mockResolvedValue([
        {
          id: 'project-123',
          ownerId: 'other-user',
          name: 'Test Project',
        },
      ]);

      const req = {
        user: {
          id: 'user-123',
          email: 'test@test.com',
          role: 'user',
        },
      } as AuthenticatedRequest;

      const result = await requireProjectAccess(req, 'project-123');

      expect(result.hasAccess).toBe(false);
    });
  });
});

