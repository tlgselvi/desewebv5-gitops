import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
import { config } from '@/config/index.js';

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestInProgress = new client.Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests currently in progress',
  labelNames: ['method', 'route'],
});

const databaseConnections = new client.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
});

const seoAnalysisTotal = new client.Counter({
  name: 'seo_analysis_total',
  help: 'Total number of SEO analyses performed',
  labelNames: ['project_id', 'analysis_type'],
});

const contentGenerationTotal = new client.Counter({
  name: 'content_generation_total',
  help: 'Total number of content generations',
  labelNames: ['project_id', 'content_type'],
});

const backlinkCampaignsActive = new client.Gauge({
  name: 'backlink_campaigns_active',
  help: 'Number of active backlink campaigns',
  labelNames: ['project_id'],
});

const seoAlertsTotal = new client.Counter({
  name: 'seo_alerts_total',
  help: 'Total number of SEO alerts generated',
  labelNames: ['project_id', 'alert_type', 'severity'],
});

// Security metrics
const userActionTotal = new client.Counter({
  name: 'cpt_user_action_total',
  help: 'User actions',
  labelNames: ['action'],
});

const tokenRotationTotal = new client.Counter({
  name: 'cpt_token_rotation_total',
  help: 'JWT token rotations',
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestInProgress);
register.registerMetric(databaseConnections);
register.registerMetric(seoAnalysisTotal);
register.registerMetric(contentGenerationTotal);
register.registerMetric(backlinkCampaignsActive);
register.registerMetric(seoAlertsTotal);
register.registerMetric(userActionTotal);
register.registerMetric(tokenRotationTotal);

// Prometheus middleware
export const prometheusMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const route = req.route?.path || req.path;
  
  // Increment in-progress requests
  httpRequestInProgress.inc({ method: req.method, route });

  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestDuration.observe(
      { method: req.method, route, status_code: statusCode },
      duration
    );
    
    httpRequestTotal.inc({ method: req.method, route, status_code: statusCode });
    
    // Decrement in-progress requests
    httpRequestInProgress.dec({ method: req.method, route });

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Metrics endpoint
export const metricsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end('Error generating metrics');
  }
};

// Utility functions for custom metrics
export const recordSeoAnalysis = (projectId: string, analysisType: string): void => {
  seoAnalysisTotal.inc({ project_id: projectId, analysis_type: analysisType });
};

export const recordContentGeneration = (projectId: string, contentType: string): void => {
  contentGenerationTotal.inc({ project_id: projectId, content_type: contentType });
};

export const recordBacklinkCampaign = (projectId: string, active: boolean): void => {
  backlinkCampaignsActive.set({ project_id: projectId }, active ? 1 : 0);
};

export const recordSeoAlert = (projectId: string, alertType: string, severity: string): void => {
  seoAlertsTotal.inc({ project_id: projectId, alert_type: alertType, severity });
};

export const updateDatabaseConnections = (count: number): void => {
  databaseConnections.set(count);
};

export const recordUserAction = (action: string): void => {
  userActionTotal.inc({ action });
};

export const recordTokenRotation = (): void => {
  tokenRotationTotal.inc();
};

// Export register for use in other modules
export { register };
