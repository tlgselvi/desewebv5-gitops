import type { Application } from 'express';
import { seoRoutes } from './seo.js';
import { contentRoutes } from './content.js';
import { projectRoutes } from './projects.js';
import { analyticsRoutes } from './analytics.js';
import { healthRoutes } from './health.js';
import { metricsRoutes } from './metrics.js';
import { feedbackRoutes } from './feedback.js';
import { autoRemediationRoutes } from './autoRemediation.js';
import { jwksRoutes } from './jwks.js';
import { mcpDashboardRoutes } from './mcpDashboard.js';
import { financeRoutes } from '../modules/finance/routes.js';
import { crmRoutes } from '../modules/crm/routes.js';
import { inventoryRoutes } from '../modules/inventory/routes.js';
import { iotRoutes } from '../modules/iot/routes.js';
import hrRoutes from '../modules/hr/routes.js';
import { aiopsMetrics } from '../middleware/aiopsMetrics.js';
import { config } from '@/config/index.js';
import { v1Router } from '@/routes/v1/index.js';

export function setupRoutes(app: Application): void {
  const apiPrefix = `/api/${config.apiVersion}`;

  // Root path handler - API information
  app.get('/', (req, res) => {
    res.json({
      name: 'Dese EA Plan API',
      version: 'v7.0.0',
      description: 'Enterprise ERP & IoT Platform API (v7.0)',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      endpoints: {
        api: `${apiPrefix}`,
        health: '/health',
        metrics: '/metrics',
        docs: '/api-docs',
      },
      note: 'This is the Enterprise backend. Use /api/v1/* for API endpoints.',
    });
  });

  // Health check routes (most specific, no prefix)
  app.use('/health', healthRoutes);

  // JWKS endpoint (root level, but after root GET handler)
  app.use('/', jwksRoutes);

  // Metrics endpoints (specific before general)
  app.get('/metrics/aiops', aiopsMetrics);
  app.use('/metrics', metricsRoutes);

  // Enterprise Modules Routes
  app.use(`${apiPrefix}/finance`, financeRoutes);
  app.use(`${apiPrefix}/crm`, crmRoutes);
  app.use(`${apiPrefix}/inventory`, inventoryRoutes);
  app.use(`${apiPrefix}/iot`, iotRoutes);
  app.use(`${apiPrefix}/hr`, hrRoutes);

  // Most specific API routes first (longest paths first)
  app.use(`${apiPrefix}/mcp/dashboard`, mcpDashboardRoutes);
  app.use(`${apiPrefix}/projects`, projectRoutes);
  app.use(`${apiPrefix}/seo`, seoRoutes);
  app.use(`${apiPrefix}/content`, contentRoutes);
  app.use(`${apiPrefix}/analytics`, analyticsRoutes);

  // v1Router (contains /auth and /aiops routes) - specific routes
  app.use(apiPrefix, v1Router);

  // General API routes (less specific, after v1Router)
  app.use(`${apiPrefix}`, feedbackRoutes);
  app.use(`${apiPrefix}`, autoRemediationRoutes);

  // Root API endpoint (most general, last)
  app.get(apiPrefix, (req, res) => {
    res.json({
      name: 'Dese EA Plan v7.0 API',
      version: '7.0.0',
      description: 'Enterprise ERP, CRM & IoT Platform API',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      endpoints: {
        projects: `${apiPrefix}/projects`,
        seo: `${apiPrefix}/seo`,
        content: `${apiPrefix}/content`,
        analytics: `${apiPrefix}/analytics`,
        aiops: `${apiPrefix}/aiops`,
        finance: `${apiPrefix}/finance`,
        crm: `${apiPrefix}/crm`,
        inventory: `${apiPrefix}/inventory`,
        iot: `${apiPrefix}/iot`,
        hr: `${apiPrefix}/hr`,
        metrics: '/metrics',
        aiopsMetrics: '/metrics/aiops',
        health: '/health',
        docs: '/api-docs',
      },
    });
  });
}
