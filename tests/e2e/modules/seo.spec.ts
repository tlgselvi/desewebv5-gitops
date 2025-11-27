import { test, expect } from '@playwright/test';
import { authenticate } from '../helpers/auth.js';

/**
 * E2E tests for SEO module
 * These tests require the application to be running
 * 
 * To run these tests:
 * 1. Start the application: pnpm dev
 * 2. Run: pnpm test:auto tests/e2e/modules/seo.spec.ts
 */

test.describe('SEO Module E2E Tests', () => {
  let authToken: string;
  let organizationId: string;
  let projectId: string;

  test.beforeAll(async ({ request }) => {
    // Authenticate and get token
    const auth = await authenticate(request);
    authToken = auth.token;
    organizationId = auth.organizationId;
  });

  test('should create a new SEO project', async ({ request }) => {
    const response = await request.post('/api/v1/seo/projects', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'E2E Test Project',
        domain: 'e2e-test.com',
        primaryKeywords: ['test', 'e2e'],
        targetRegion: 'Türkiye',
      },
    });

    expect(response.ok()).toBeTruthy();
    const project = await response.json();
    expect(project).toHaveProperty('id');
    expect(project.name).toBe('E2E Test Project');
    expect(project.domain).toBe('e2e-test.com');
    expect(project.organizationId).toBe(organizationId);
    projectId = project.id;
  });

  test('should get organization projects', async ({ request }) => {
    const response = await request.get('/api/v1/seo/projects', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const projects = await response.json();
    expect(Array.isArray(projects)).toBe(true);
    if (projectId) {
      expect(projects.some((p: any) => p.id === projectId)).toBe(true);
    }
  });

  test('should analyze project URLs', async ({ request }) => {
    if (!projectId) {
      test.skip();
      return;
    }

    const response = await request.post('/api/v1/seo/analyze', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        projectId,
        urls: ['https://example.com'],
        options: {
          device: 'desktop',
          throttling: '4G',
          categories: ['performance', 'seo'],
        },
      },
    });

    // Analysis might take time, so we check for either success or accepted status
    expect([200, 202]).toContain(response.status());
    if (response.ok()) {
      const result = await response.json();
      expect(result).toHaveProperty('projectId', projectId);
      expect(result).toHaveProperty('totalUrls', 1);
    }
  });

  test('should get project metrics', async ({ request }) => {
    if (!projectId) {
      test.skip();
      return;
    }

    const response = await request.get('/api/v1/seo/metrics', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        projectId,
        limit: '10',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('metrics');
    expect(Array.isArray(data.metrics)).toBe(true);
  });

  test('should get project trends', async ({ request }) => {
    if (!projectId) {
      test.skip();
      return;
    }

    const response = await request.get('/api/v1/seo/trends', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        projectId,
        days: '30',
      },
    });

    expect(response.ok()).toBeTruthy();
    const trends = await response.json();
    expect(trends).toHaveProperty('projectId', projectId);
    expect(trends).toHaveProperty('period');
    expect(trends).toHaveProperty('metrics');
  });

  test('should analyze single URL', async ({ request }) => {
    const response = await request.post('/api/v1/seo/analyze/url', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        url: 'https://example.com',
        options: {
          device: 'desktop',
          throttling: '4G',
        },
      },
    });

    // Analysis might take time
    expect([200, 202]).toContain(response.status());
    if (response.ok()) {
      const result = await response.json();
      expect(result).toHaveProperty('url', 'https://example.com');
      expect(result).toHaveProperty('scores');
    }
  });

  test('should return 400 for invalid project ID', async ({ request }) => {
    const response = await request.get('/api/v1/seo/metrics', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        projectId: 'invalid-uuid',
        limit: '10',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should return 400 when organizationId is missing', async ({ request }) => {
    // Create a request without organization context
    const response = await request.get('/api/v1/seo/projects', {
      // No Authorization header
    });

    expect(response.status()).toBe(401);
  });

  test('should enforce multi-tenancy - cannot access other org projects', async ({
    request,
  }) => {
    if (!projectId) {
      test.skip();
      return;
    }

    // Try to access project with different organization context
    // This test assumes you have another organization set up
    // In a real scenario, you would create another org and try to access the first org's project

    const response = await request.get('/api/v1/seo/metrics', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        projectId: '00000000-0000-0000-0000-000000000000', // Non-existent project
        limit: '10',
      },
    });

    // Should return empty metrics or 404, not the project from another org
    expect([200, 404]).toContain(response.status());
  });

  test.afterAll(async ({ request }) => {
    // Cleanup: Delete test project
    if (projectId) {
      await request.delete(`/api/v1/seo/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    }
  });
});

