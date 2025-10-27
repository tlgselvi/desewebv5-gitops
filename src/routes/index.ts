import { Express } from 'express';
import { seoRoutes } from './seo.js';
import { contentRoutes } from './content.js';
import { projectRoutes } from './projects.js';
import { analyticsRoutes } from './analytics.js';
import { healthRoutes } from './health.js';
import { metricsRoutes } from './metrics.js';
import { aiopsRoutes } from './aiops.js';
import { feedbackRoutes } from './feedback.js';
import { autoRemediationRoutes } from './autoRemediation.js';
import { jwksRoutes } from './jwks.js';
import { aiopsMetrics } from '../middleware/aiopsMetrics.js';
import { config } from '@/config/index.js';

export function setupRoutes(app: Express): void {
  const apiPrefix = `/api/${config.apiVersion}`;

  // Health check routes
  app.use('/health', healthRoutes);

  // JWKS endpoint
  app.use('/', jwksRoutes);

  // Metrics endpoint
  app.use('/metrics', metricsRoutes);

  // AIOps metrics endpoint
  app.get('/metrics/aiops', aiopsMetrics);

  // AIOps routes
  app.use(`${apiPrefix}/aiops`, aiopsRoutes);

  // Feedback routes
  app.use(`${apiPrefix}`, feedbackRoutes);

  // Auto-Remediation routes
  app.use(`${apiPrefix}`, autoRemediationRoutes);

  // API routes
  app.use(`${apiPrefix}/projects`, projectRoutes);
  app.use(`${apiPrefix}/seo`, seoRoutes);
  app.use(`${apiPrefix}/content`, contentRoutes);
  app.use(`${apiPrefix}/analytics`, analyticsRoutes);

  // Root API endpoint
  app.get(apiPrefix, (req, res) => {
    res.json({
      name: 'Dese EA Plan v5.0 API',
      version: '5.0.0',
      description: 'CPT Optimization Domain için Kubernetes + GitOps + AIOps uyumlu kurumsal planlama API',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      endpoints: {
        projects: `${apiPrefix}/projects`,
        seo: `${apiPrefix}/seo`,
        content: `${apiPrefix}/content`,
        analytics: `${apiPrefix}/analytics`,
        aiops: `${apiPrefix}/aiops`,
        metrics: '/metrics',
        aiopsMetrics: '/metrics/aiops',
        health: '/health',
        docs: '/api-docs',
      },
    });
  });
}
