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
import { correlationRoutes } from './correlation.js';
import { predictiveRoutes } from './predictive.js';
import { anomalyRoutes } from './anomaly.js';
import { jwksRoutes } from './jwks.js';
import { authRoutes } from './auth.js';
import { finbotRoutes } from './finbot.js';
import { auditRoutes } from './audit.js';
import { privacyRoutes } from './privacy.js';
import { metricsRealtimeRoutes } from './metrics-realtime.js';
import { alertsRoutes } from './alerts.js'; // Added
import { correlationSimpleRoutes } from './correlation-simple.js';
import { permissionRoutes } from './permissions.js';
import { aiopsMetrics } from '@/middleware/aiopsMetrics.js';
import { config } from '@/config/index.js';

export function setupRoutes(app: Express): void {
  const apiPrefix = `/api/${config.apiVersion}`;

  // Health check routes
  app.use('/health', healthRoutes);

  // JWKS endpoint
  app.use('/', jwksRoutes);

  // Auth routes
  app.use(`${apiPrefix}/auth`, authRoutes);

  // Metrics endpoint
  app.use('/metrics', metricsRoutes);

  // AIOps metrics endpoint
  app.get('/metrics/aiops', aiopsMetrics);

  // AIOps routes
  app.use(`${apiPrefix}/aiops`, aiopsRoutes);

  // Correlation routes
  app.use(`${apiPrefix}/aiops`, correlationRoutes);
  
  // Simple correlation routes (Sprint 2.6 - Redis-based)
  app.use('/', correlationSimpleRoutes);

  // Predictive routes
  app.use(`${apiPrefix}/aiops`, predictiveRoutes);

  // Anomaly routes
  app.use(`${apiPrefix}/aiops`, anomalyRoutes);

  // Feedback routes
  app.use(`${apiPrefix}`, feedbackRoutes);

  // Auto-Remediation routes
  app.use(`${apiPrefix}`, autoRemediationRoutes);

  // API routes
  app.use(`${apiPrefix}/projects`, projectRoutes);
  app.use(`${apiPrefix}/seo`, seoRoutes);
  app.use(`${apiPrefix}/content`, contentRoutes);
  app.use(`${apiPrefix}/analytics`, analyticsRoutes);
  app.use(`${apiPrefix}/finbot`, finbotRoutes);
  app.use(`${apiPrefix}/audit`, auditRoutes);
        app.use(`${apiPrefix}/privacy`, privacyRoutes);
        app.use(`${apiPrefix}/metrics`, metricsRealtimeRoutes);
        app.use(`${apiPrefix}/alerts`, alertsRoutes); // Added
        app.use(`${apiPrefix}/permissions`, permissionRoutes);

  // Root API endpoint
  app.get(apiPrefix, (req, res) => {
    res.json({
      name: 'Dese EA Plan v6.8.0 API',
      version: '6.8.0',
      description: 'CPT Optimization Domain için Kubernetes + GitOps + AIOps uyumlu kurumsal planlama API',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      endpoints: {
        auth: `${apiPrefix}/auth`,
        projects: `${apiPrefix}/projects`,
        seo: `${apiPrefix}/seo`,
        content: `${apiPrefix}/content`,
        analytics: `${apiPrefix}/analytics`,
        finbot: `${apiPrefix}/finbot`,
        audit: `${apiPrefix}/audit`,
        privacy: `${apiPrefix}/privacy`,
               metrics: `${apiPrefix}/metrics`,
               metricsRealtime: `${apiPrefix}/metrics/realtime`,
               alerts: `${apiPrefix}/alerts`, // Added
               aiops: `${apiPrefix}/aiops`,
        correlation: `${apiPrefix}/aiops/correlation`,
        correlationSimple: `/api/v1/ai/correlation`,
        predictive: `${apiPrefix}/aiops/predict`,
        anomaly: `${apiPrefix}/aiops/anomalies`,
        prometheus: '/metrics',
        aiopsMetrics: '/metrics/aiops',
        health: '/health',
        docs: '/api-docs',
      },
    });
  });
}
