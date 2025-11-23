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
import { aiopsMetrics } from '../middleware/aiopsMetrics.js';
import { config } from '../config/index.js';
import { v1Router } from './v1/index.js';
export function setupRoutes(app) {
    const apiPrefix = `/api/${config.apiVersion}`;
    // Root path handler - API information
    app.get('/', (req, res) => {
        res.json({
            name: 'Dese EA Plan API',
            version: config.apiVersion || 'v1',
            description: 'Backend API Server for Dese EA Plan v6.8.2',
            environment: config.nodeEnv,
            timestamp: new Date().toISOString(),
            endpoints: {
                api: `${apiPrefix}`,
                health: '/health',
                metrics: '/metrics',
                docs: '/api-docs',
            },
            note: 'This is a backend API server. Use /api/v1/* for API endpoints, /health for health checks, or /metrics for metrics.',
        });
    });
    // Health check routes (most specific, no prefix)
    app.use('/health', healthRoutes);
    // JWKS endpoint (root level, but after root GET handler)
    app.use('/', jwksRoutes);
    // Metrics endpoints (specific before general)
    app.get('/metrics/aiops', aiopsMetrics);
    app.use('/metrics', metricsRoutes);
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
            name: 'Dese EA Plan v6.8.1 API',
            version: '6.8.1',
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
//# sourceMappingURL=index.js.map