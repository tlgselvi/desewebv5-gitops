import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

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

// Database query performance metrics
const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['table', 'operation'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const databaseQueryTotal = new client.Counter({
  name: 'database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['table', 'operation', 'status'],
});

// Cache performance metrics
const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_key_prefix'],
});

const cacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_key_prefix'],
});

// API response time percentiles (p50, p95, p99)
const apiResponseTimeP50 = new client.Gauge({
  name: 'api_response_time_p50_seconds',
  help: '50th percentile API response time',
  labelNames: ['method', 'route'],
});

const apiResponseTimeP95 = new client.Gauge({
  name: 'api_response_time_p95_seconds',
  help: '95th percentile API response time',
  labelNames: ['method', 'route'],
});

const apiResponseTimeP99 = new client.Gauge({
  name: 'api_response_time_p99_seconds',
  help: '99th percentile API response time',
  labelNames: ['method', 'route'],
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

// Memory usage metrics
const memoryUsage = new client.Gauge({
  name: 'process_memory_usage_bytes',
  help: 'Process memory usage in bytes',
  labelNames: ['type'], // heapUsed, heapTotal, rss, external
});

// CPU usage metrics
const cpuUsage = new client.Gauge({
  name: 'process_cpu_usage_percent',
  help: 'Process CPU usage percentage',
});

// Infrastructure Scaling Metrics

// Database Replication Metrics
const databaseReplicationLag = new client.Gauge({
  name: 'pg_replication_lag_ms',
  help: 'Database replication lag in milliseconds',
  labelNames: ['replica'],
});

const databaseConnectionPoolSize = new client.Gauge({
  name: 'database_connection_pool_size',
  help: 'Database connection pool size',
  labelNames: ['type'], // primary, replica
});

const databaseConnectionPoolActive = new client.Gauge({
  name: 'database_connection_pool_active',
  help: 'Active database connections in pool',
  labelNames: ['type'], // primary, replica
});

const connectionPoolLeaks = new client.Counter({
  name: 'connection_pool_leaks_total',
  help: 'Total number of connection pool leaks detected',
});

// Redis Cluster Metrics
const redisOperationDuration = new client.Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation', 'node'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});

const redisClusterNodeStatus = new client.Gauge({
  name: 'redis_cluster_node_status',
  help: 'Redis cluster node status (1=up, 0=down)',
  labelNames: ['node', 'role'], // master, replica
});

// S3 Storage Metrics
const s3UploadTotal = new client.Counter({
  name: 's3_upload_total',
  help: 'Total number of S3 uploads',
  labelNames: ['bucket', 'status'],
});

const s3UploadErrors = new client.Counter({
  name: 's3_upload_errors_total',
  help: 'Total number of S3 upload errors',
  labelNames: ['bucket'],
});

const s3DownloadTotal = new client.Counter({
  name: 's3_download_total',
  help: 'Total number of S3 downloads',
  labelNames: ['bucket', 'status'],
});

const s3DownloadErrors = new client.Counter({
  name: 's3_download_errors_total',
  help: 'Total number of S3 download errors',
  labelNames: ['bucket'],
});

const s3BucketSize = new client.Gauge({
  name: 's3_bucket_size_bytes',
  help: 'S3 bucket size in bytes',
  labelNames: ['bucket'],
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestInProgress);
register.registerMetric(databaseConnections);
register.registerMetric(databaseQueryDuration);
register.registerMetric(databaseQueryTotal);
register.registerMetric(cacheHits);
register.registerMetric(cacheMisses);
register.registerMetric(apiResponseTimeP50);
register.registerMetric(apiResponseTimeP95);
register.registerMetric(apiResponseTimeP99);
register.registerMetric(seoAnalysisTotal);
register.registerMetric(contentGenerationTotal);
register.registerMetric(backlinkCampaignsActive);
register.registerMetric(seoAlertsTotal);
register.registerMetric(userActionTotal);
register.registerMetric(tokenRotationTotal);
register.registerMetric(memoryUsage);
register.registerMetric(cpuUsage);

// Infrastructure Scaling Metrics
register.registerMetric(databaseReplicationLag);
register.registerMetric(databaseConnectionPoolSize);
register.registerMetric(databaseConnectionPoolActive);
register.registerMetric(connectionPoolLeaks);
register.registerMetric(redisOperationDuration);
register.registerMetric(redisClusterNodeStatus);
register.registerMetric(s3UploadTotal);
register.registerMetric(s3UploadErrors);
register.registerMetric(s3DownloadTotal);
register.registerMetric(s3DownloadErrors);
register.registerMetric(s3BucketSize);

// Prometheus middleware
export const prometheusMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const route = req.route?.path || req.path;
  
  // Increment in-progress requests
  httpRequestInProgress.inc({ method: req.method, route });

  res.once('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode.toString();

    httpRequestDuration.observe(
      { method: req.method, route, status_code: statusCode },
      duration
    );

    httpRequestTotal.inc({ method: req.method, route, status_code: statusCode });
    httpRequestInProgress.dec({ method: req.method, route });
    
    // Note: Percentiles are calculated from histogram using PromQL in Grafana
    // histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
  });

  next();
};

// Metrics endpoint
export const metricsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch {
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

// Database query metrics
export const recordDatabaseQuery = (
  table: string,
  operation: string,
  duration: number,
  status: 'success' | 'error' = 'success'
): void => {
  databaseQueryDuration.observe({ table, operation }, duration);
  databaseQueryTotal.inc({ table, operation, status });
};

// Cache metrics
export const recordCacheHit = (prefix: string): void => {
  cacheHits.inc({ cache_key_prefix: prefix });
};

export const recordCacheMiss = (prefix: string): void => {
  cacheMisses.inc({ cache_key_prefix: prefix });
};

// API response time percentiles (calculated from histogram)
export const updateApiResponseTimePercentiles = (
  method: string,
  route: string,
  p50: number,
  p95: number,
  p99: number
): void => {
  apiResponseTimeP50.set({ method, route }, p50);
  apiResponseTimeP95.set({ method, route }, p95);
  apiResponseTimeP99.set({ method, route }, p99);
};

// Infrastructure Scaling Metrics Functions

export const updateDatabaseReplicationLag = (lagMs: number, replica?: string): void => {
  databaseReplicationLag.set({ replica: replica || 'default' }, lagMs);
};

export const updateDatabaseConnectionPool = (
  type: 'primary' | 'replica',
  size: number,
  active: number
): void => {
  databaseConnectionPoolSize.set({ type }, size);
  databaseConnectionPoolActive.set({ type }, active);
};

export const recordConnectionPoolLeak = (): void => {
  connectionPoolLeaks.inc();
};

export const recordRedisOperation = (
  operation: string,
  duration: number,
  node?: string
): void => {
  redisOperationDuration.observe({ operation, node: node || 'unknown' }, duration);
};

export const updateRedisClusterNodeStatus = (
  node: string,
  role: 'master' | 'replica',
  status: number
): void => {
  redisClusterNodeStatus.set({ node, role }, status);
};

export const recordS3Upload = (bucket: string, status: 'success' | 'error'): void => {
  s3UploadTotal.inc({ bucket, status });
  if (status === 'error') {
    s3UploadErrors.inc({ bucket });
  }
};

export const recordS3Download = (bucket: string, status: 'success' | 'error'): void => {
  s3DownloadTotal.inc({ bucket, status });
  if (status === 'error') {
    s3DownloadErrors.inc({ bucket });
  }
};

export const updateS3BucketSize = (bucket: string, sizeBytes: number): void => {
  s3BucketSize.set({ bucket }, sizeBytes);
};

// Export register for use in other modules
export { register, memoryUsage, cpuUsage };
