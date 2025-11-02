import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from '@/config/index.js';
import { logger } from '@/utils/logger.js';
import { checkDatabaseConnection, closeDatabaseConnection, testDatabaseConnection } from '@/db/index.js';
import { errorHandler } from '@/middleware/errorHandler.js';
import { requestLogger } from '@/middleware/requestLogger.js';
import { prometheusMiddleware } from '@/middleware/prometheus.js';
import { sanitizeInput, cspHeaders, requestSizeLimiter } from '@/middleware/security.js';
import { setupRoutes } from '@/routes/index.js';
import { setupSwagger } from '@/utils/swagger.js';
import { gracefulShutdown } from '@/utils/gracefulShutdown.js';

// Create Express app
const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Additional security headers
app.use(cspHeaders);

// Input sanitization
app.use(sanitizeInput);

// Request size limiter (10MB)
app.use(requestSizeLimiter(10 * 1024 * 1024));

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.security.rateLimitWindowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Prometheus metrics
if (config.monitoring.prometheus) {
  app.use(prometheusMiddleware);
}

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbStatus = await checkDatabaseConnection();
  const healthStatus = {
    status: dbStatus ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
      version: process.env.APP_VERSION || process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
    database: dbStatus ? 'connected' : 'disconnected',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  };

  res.status(dbStatus ? 200 : 503).json(healthStatus);
});

// API routes
setupRoutes(app);

// Swagger documentation
if (config.nodeEnv !== 'production') {
  setupSwagger(app);
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server with database connection test
const server = app.listen(config.port, async () => {
  logger.info(`🚀 Dese EA Plan v5.0 server started`, {
    port: config.port,
    environment: config.nodeEnv,
    version: process.env.APP_VERSION || process.env.npm_package_version || '5.0.0',
    domain: 'cpt-optimization',
  });

  // Test database connection on startup
  try {
    await testDatabaseConnection();
    logger.info('✅ Database connection verified');
  } catch (error) {
    logger.error('❌ Database connection failed on startup', { error });
    // Don't exit - let the app start but health checks will fail
  }
});

// Graceful shutdown
gracefulShutdown(server, async () => {
  logger.info('🔄 Gracefully shutting down server...');
  await closeDatabaseConnection();
  logger.info('✅ Server shutdown complete');
});

export default app;
