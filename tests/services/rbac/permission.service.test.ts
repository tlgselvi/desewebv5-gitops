import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserPermissions, hasPermission, DEFAULT_ROLE_PERMISSIONS } from '@/services/rbac/permission.service.js';
import { db } from '@/db/index.js';
import { users, permissions } from '@/db/schema/saas.js';

// Mock database
vi.mock('@/db/index.js', () => ({
  db: {
    select: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/utils/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Permission Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserPermissions', () => {
    it('should return all permissions for super_admin', async () => {
      const mockWhere = vi.fn().mockResolvedValue([{ role: 'super_admin' }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      (db.select as any) = mockSelect;

      const result = await getUserPermissions('user-1', 'org-1');

      expect(result).toHaveLength(9); // All modules
      expect(result.every((p) => p.action === 'all')).toBe(true);
    });

    it('should return empty array for non-existent user', async () => {
      const mockWhere = vi.fn().mockResolvedValue([]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      (db.select as any) = mockSelect;

      const result = await getUserPermissions('non-existent', 'org-1');

      expect(result).toEqual([]);
    });

    it('should return permissions from database for regular user', async () => {
      // Mock user query
      const mockUserWhere = vi.fn().mockResolvedValue([{ role: 'admin' }]);
      const mockUserFrom = vi.fn().mockReturnValue({ where: mockUserWhere });
      const mockUserSelect = vi.fn().mockReturnValue({ from: mockUserFrom });

      // Mock permissions query
      const mockPermissionsWhere = vi.fn().mockResolvedValue([
        { resource: 'finance', action: 'all' },
        { resource: 'crm', action: 'read' },
      ]);
      const mockPermissionsFrom = vi.fn().mockReturnValue({ where: mockPermissionsWhere });
      const mockPermissionsSelect = vi.fn().mockReturnValue({ from: mockPermissionsFrom });

      (db.select as any) = vi
        .fn()
        .mockReturnValueOnce(mockUserSelect())
        .mockReturnValueOnce(mockPermissionsSelect());

      const result = await getUserPermissions('user-1', 'org-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ module: 'finance', action: 'all' });
      expect(result[1]).toEqual({ module: 'crm', action: 'read' });
    });
  });

  describe('hasPermission', () => {
    it('should return true for exact permission match', async () => {
      // Mock getUserPermissions to return specific permissions
      const mockWhere = vi.fn().mockResolvedValue([{ role: 'admin' }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
      
      // Mock permissions query
      const mockPermissionsWhere = vi.fn().mockResolvedValue([
        { resource: 'finance', action: 'read' },
        { resource: 'crm', action: 'write' },
      ]);
      const mockPermissionsFrom = vi.fn().mockReturnValue({ where: mockPermissionsWhere });
      const mockPermissionsSelect = vi.fn().mockReturnValue({ from: mockPermissionsFrom });

      (db.select as any) = vi
        .fn()
        .mockReturnValueOnce(mockSelect())
        .mockReturnValueOnce(mockPermissionsSelect());

      const result = await hasPermission('user-1', 'org-1', 'finance', 'read');

      expect(result).toBe(true);
    });

    it('should return true for "all" action permission', async () => {
      const mockWhere = vi.fn().mockResolvedValue([{ role: 'admin' }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
      
      const mockPermissionsWhere = vi.fn().mockResolvedValue([
        { resource: 'finance', action: 'all' },
      ]);
      const mockPermissionsFrom = vi.fn().mockReturnValue({ where: mockPermissionsWhere });
      const mockPermissionsSelect = vi.fn().mockReturnValue({ from: mockPermissionsFrom });

      (db.select as any) = vi
        .fn()
        .mockReturnValueOnce(mockSelect())
        .mockReturnValueOnce(mockPermissionsSelect());

      const result = await hasPermission('user-1', 'org-1', 'finance', 'read');

      expect(result).toBe(true);
    });

    it('should return false for missing permission', async () => {
      const mockWhere = vi.fn().mockResolvedValue([{ role: 'admin' }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
      
      const mockPermissionsWhere = vi.fn().mockResolvedValue([
        { resource: 'crm', action: 'read' },
      ]);
      const mockPermissionsFrom = vi.fn().mockReturnValue({ where: mockPermissionsWhere });
      const mockPermissionsSelect = vi.fn().mockReturnValue({ from: mockPermissionsFrom });

      (db.select as any) = vi
        .fn()
        .mockReturnValueOnce(mockSelect())
        .mockReturnValueOnce(mockPermissionsSelect());

      const result = await hasPermission('user-1', 'org-1', 'finance', 'read');

      expect(result).toBe(false);
    });

    it('should return true for admin module access', async () => {
      const mockWhere = vi.fn().mockResolvedValue([{ role: 'admin' }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
      
      const mockPermissionsWhere = vi.fn().mockResolvedValue([
        { resource: 'admin', action: 'all' },
      ]);
      const mockPermissionsFrom = vi.fn().mockReturnValue({ where: mockPermissionsWhere });
      const mockPermissionsSelect = vi.fn().mockReturnValue({ from: mockPermissionsFrom });

      (db.select as any) = vi
        .fn()
        .mockReturnValueOnce(mockSelect())
        .mockReturnValueOnce(mockPermissionsSelect());

      const result = await hasPermission('user-1', 'org-1', 'finance', 'read');

      expect(result).toBe(true);
    });
  });

  describe('DEFAULT_ROLE_PERMISSIONS', () => {
    it('should have permissions for all default roles', () => {
      expect(DEFAULT_ROLE_PERMISSIONS).toHaveProperty('admin');
      expect(DEFAULT_ROLE_PERMISSIONS).toHaveProperty('accountant');
      expect(DEFAULT_ROLE_PERMISSIONS).toHaveProperty('sales');
      expect(DEFAULT_ROLE_PERMISSIONS).toHaveProperty('hr_manager');
      expect(DEFAULT_ROLE_PERMISSIONS).toHaveProperty('user');
    });

    it('should have correct permissions for admin role', () => {
      const adminPerms = DEFAULT_ROLE_PERMISSIONS.admin;
      expect(adminPerms.length).toBeGreaterThan(0);
      expect(adminPerms.every((p) => p.action === 'all')).toBe(true);
    });

    it('should have correct permissions for accountant role', () => {
      const accountantPerms = DEFAULT_ROLE_PERMISSIONS.accountant;
      expect(accountantPerms.some((p) => p.module === 'finance' && p.action === 'all')).toBe(true);
      expect(accountantPerms.some((p) => p.module === 'inventory' && p.action === 'read')).toBe(true);
    });
  });
});

