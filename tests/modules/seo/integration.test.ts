import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/db/index.js';
import { seoService } from '@/modules/seo/service.js';
import { seoProjects, organizations, users } from '@/db/schema/index.js';
import { eq } from 'drizzle-orm';

/**
 * Integration tests for SEO module
 * These tests require a real database connection
 * 
 * To run these tests:
 * 1. Ensure PostgreSQL is running
 * 2. Set DATABASE_URL environment variable
 * 3. Run: pnpm test tests/modules/seo/integration.test.ts
 */

describe('SEO Service Integration Tests', () => {
  let testOrgId: string;
  let testUserId: string;
  let testProjectId: string;

  beforeAll(async () => {
    // Skip tests if database is not available
    try {
      // Create test organization
      const [org] = await db
        .insert(organizations)
        .values({
          name: 'Test SEO Organization',
          slug: 'test-seo-org',
          status: 'active',
        })
        .returning();

      if (!org) {
        throw new Error('Failed to create test organization');
      }
      testOrgId = org.id;

      // Create test user
      const [user] = await db
        .insert(users)
        .values({
          email: `test-seo-${Date.now()}@example.com`,
          password: 'hashed-password',
          organizationId: testOrgId,
          role: 'user',
        })
        .returning();

      if (!user) {
        throw new Error('Failed to create test user');
      }
      testUserId = user.id;
    } catch (error) {
      console.warn('Database not available, skipping integration tests');
      throw error;
    }
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      if (testProjectId) {
        await db.delete(seoProjects).where(eq(seoProjects.id, testProjectId));
      }
      if (testUserId) {
        await db.delete(users).where(eq(users.id, testUserId));
      }
      if (testOrgId) {
        await db.delete(organizations).where(eq(organizations.id, testOrgId));
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  describe('createProject', () => {
    it('should create a project in the database', async () => {
      const projectData = {
        organizationId: testOrgId,
        name: 'Integration Test Project',
        domain: 'integration-test.com',
        ownerId: testUserId,
        primaryKeywords: ['test', 'integration'],
      };

      const project = await seoService.createProject(projectData);
      testProjectId = project.id;

      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.organizationId).toBe(testOrgId);
      expect(project.name).toBe(projectData.name);
      expect(project.domain).toBe(projectData.domain);
      expect(project.ownerId).toBe(testUserId);
    });
  });

  describe('getProjectById', () => {
    it('should retrieve project by ID with organization check', async () => {
      if (!testProjectId) {
        // Create project if not exists
        const project = await seoService.createProject({
          organizationId: testOrgId,
          name: 'Get Test Project',
          domain: 'get-test.com',
          ownerId: testUserId,
          primaryKeywords: ['test'],
        });
        testProjectId = project.id;
      }

      const project = await seoService.getProjectById(testProjectId, testOrgId);

      expect(project).toBeDefined();
      expect(project?.id).toBe(testProjectId);
      expect(project?.organizationId).toBe(testOrgId);
    });

    it('should return null for non-existent project', async () => {
      const project = await seoService.getProjectById(
        '00000000-0000-0000-0000-000000000000',
        testOrgId
      );

      expect(project).toBeNull();
    });

    it('should return null when project belongs to different organization', async () => {
      if (!testProjectId) return;

      // Create another organization
      const [otherOrg] = await db
        .insert(organizations)
        .values({
          name: 'Other Test Organization',
          slug: 'other-test-org',
          status: 'active',
        })
        .returning();

      if (otherOrg) {
        const project = await seoService.getProjectById(
          testProjectId,
          otherOrg.id
        );

        expect(project).toBeNull();

        // Cleanup
        await db.delete(organizations).where(eq(organizations.id, otherOrg.id));
      }
    });
  });

  describe('getOrganizationProjects', () => {
    it('should retrieve all projects for organization', async () => {
      // Create additional test project
      const project2 = await seoService.createProject({
        organizationId: testOrgId,
        name: 'Second Test Project',
        domain: 'second-test.com',
        ownerId: testUserId,
        primaryKeywords: ['test'],
      });

      const projects = await seoService.getOrganizationProjects(testOrgId);

      expect(projects.length).toBeGreaterThanOrEqual(1);
      expect(projects.some((p) => p.id === project2.id)).toBe(true);

      // Cleanup
      await db.delete(seoProjects).where(eq(seoProjects.id, project2.id));
    });

    it('should return empty array for organization with no projects', async () => {
      // Create another organization
      const [otherOrg] = await db
        .insert(organizations)
        .values({
          name: 'Empty Org',
          slug: 'empty-org',
          status: 'active',
        })
        .returning();

      if (otherOrg) {
        const projects = await seoService.getOrganizationProjects(otherOrg.id);

        expect(projects).toEqual([]);

        // Cleanup
        await db.delete(organizations).where(eq(organizations.id, otherOrg.id));
      }
    });
  });

  describe('getUserProjects', () => {
    it('should retrieve projects for user within organization', async () => {
      const projects = await seoService.getUserProjects(testUserId, testOrgId);

      expect(Array.isArray(projects)).toBe(true);
      // Should include the test project if it exists
      if (testProjectId) {
        expect(projects.some((p) => p.id === testProjectId)).toBe(true);
      }
    });
  });
});

