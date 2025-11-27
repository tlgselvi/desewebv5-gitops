import express, {
  type Application,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import passport from "passport";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import next from "next";
import { config } from "@/config/index.js";
import { logger } from "@/utils/logger.js";
import {
  checkDatabaseConnection,
  closeDatabaseConnection,
} from "@/db/index.js";
import { errorHandler } from "@/middleware/errorHandler.js";
import { requestLogger } from "@/middleware/requestLogger.js";
import { prometheusMiddleware } from "@/middleware/prometheus.js";
import { 
  startPerformanceMetricsCollection,
  stopPerformanceMetricsCollection 
} from "@/services/monitoring/performance-metrics.js";
import {
  sanitizeInput,
  cspHeaders,
  requestSizeLimiter,
} from "@/middleware/security.js";
import { setupRoutes } from "@/routes/index.js";
import { setupSwagger } from "@/utils/swagger.js";
import { gracefulShutdown } from "@/utils/gracefulShutdown.js";
import {
  initializeWebSocketGateway,
  close as closeWebSocketGateway,
} from "@/websocket/gateway.js";
import {
  startFinBotConsumer,
  stopFinBotConsumer,
} from "@/bus/streams/finbot-consumer.js";
import { auditMiddleware } from "@/middleware/audit.js";
import { setRLSContextMiddleware } from "@/middleware/rls.js";

// Passport stratejisini yükle (sadece import etmek yeterli)
import "@/services/passport.js";
// IoT MQTT Client başlat (Instance oluşturulunca otomatik bağlanır)
import "@/services/iot/mqtt-client.js";

const dev = config.nodeEnv !== "production";
// Hybrid Mode: Skip Next.js if SKIP_NEXT is set (frontend runs separately)
const skipNext = process.env.SKIP_NEXT === "true";
let nextApp: ReturnType<typeof next> | null = null;
let nextHandler: ((req: Request, res: Response) => Promise<void>) | null = null;

if (!skipNext) {
  nextApp = next({ dev, dir: "./frontend" });
  nextHandler = nextApp.getRequestHandler();
  // Create Express app after Next.js is ready
  await nextApp.prepare();
} else {
  logger.info("Next.js skipped (Hybrid Mode - frontend runs separately)");
}

const app: Application = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// Additional security headers
app.use(cspHeaders);

// Request size limiter (10MB) - Must be before body parsing
app.use(requestSizeLimiter(10 * 1024 * 1024));

// Body parsing middleware - Must be before sanitization
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Input sanitization - After body parsing so we can sanitize parsed objects
app.use(sanitizeInput);

// Audit middleware (before authentication to capture all requests)
app.use(auditMiddleware);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // In development, allow localhost on any port
      if (config.nodeEnv === "development") {
        const isLocalhost =
          /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
          /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
        if (isLocalhost) {
          return callback(null, true);
        }
      }

      // Check against configured CORS origin
      const allowedOrigins = [
        config.corsOrigin,
        "http://localhost:3001",
        "http://localhost:3000",
        "http://host.docker.internal:3001", // Added for Docker Desktop
      ];
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Master-Control-CLI",
    ],
  }),
);

// Session and Passport Middleware
// IMPORTANT: These must come after CORS and before routes
app.use(
  cookieSession({
    name: "dese-session",
    keys: [config.security.cookieKey],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: config.nodeEnv === "production", // Only send cookie over HTTPS in production
    sameSite: "lax", // CSRF protection
  }),
);
app.use(passport.initialize());
app.use(passport.session());

// Compression middleware with optimization
app.use(
  compression({
    level: 6, // Compression level (0-9, 6 is a good balance)
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      // Don't compress if client doesn't support it
      if (req.headers["x-no-compression"]) {
        return false;
      }
      // Use compression for text-based responses
      return compression.filter(req, res);
    },
  }),
);

// Rate limiting - disabled in test environment or when DISABLE_RATE_LIMIT is set
if (config.nodeEnv !== "test" && process.env.DISABLE_RATE_LIMIT !== "true") {
  // Use advanced rate limiting if enabled, otherwise fall back to basic rate limiting
  if (process.env.ADVANCED_RATE_LIMIT_ENABLED === "true") {
    // Advanced rate limiting will be initialized after routes setup
    // See below for initialization
  } else {
    // Basic rate limiting (backward compatible)
    const limiter = rateLimit({
      windowMs: config.security.rateLimitWindowMs,
      max: config.security.rateLimitMaxRequests,
      message: {
        error: "Too many requests from this IP, please try again later.",
        retryAfter: Math.ceil(config.security.rateLimitWindowMs / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);
  }
}

// APM middleware (if enabled)
if (process.env.APM_ENABLED === "true") {
  try {
    const { apmMiddleware } = await import("@/middleware/apm-middleware.js");
    app.use(apmMiddleware);
    logger.info("✅ APM middleware enabled");
  } catch (error) {
    logger.warn("⚠️ APM middleware not available", { error });
  }
}

// Request logging
app.use(requestLogger);

// Prometheus metrics
if (config.monitoring.prometheus) {
  app.use(prometheusMiddleware);
}

// API routes
setupRoutes(app);

// Advanced rate limiting (if enabled) - must be after routes setup
if (config.nodeEnv !== "test" && process.env.DISABLE_RATE_LIMIT !== "true" && process.env.ADVANCED_RATE_LIMIT_ENABLED === "true") {
  try {
    const { rateLimitManager } = await import("@/services/rate-limit/rate-limit-manager.js");
    await rateLimitManager.initialize();
    app.use(rateLimitManager.getMiddleware());
    logger.info("✅ Advanced rate limiting enabled");
  } catch (error) {
    logger.error("❌ Failed to initialize advanced rate limiting", { error });
    // Fall back to basic rate limiting or continue without rate limiting
  }
}

// Swagger documentation (available in all environments)
setupSwagger(app);

// All other requests that were not handled by the API routes should be passed to Next.js.
// This must be placed after all API routes and before the final error handler.
// Express 5 doesn't support app.all("*") with wildcard, so we use app.use as a catch-all.
// app.use without a path matches all routes and all HTTP methods.
if (!skipNext && nextHandler) {
  app.use((req: Request, res: Response) => {
    // Only pass to Next.js if response hasn't been sent yet
    if (!res.headersSent) {
      return nextHandler!(req, res);
    }
    // If headers already sent, do nothing (response is already being handled)
    return;
  });
} else {
  // In Hybrid Mode, only handle API routes - return 404 for everything else
  app.use((req: Request, res: Response): void => {
    if (!res.headersSent) {
      // Check if it's an API, health, or metrics route
      const isApiRoute = req.path.startsWith("/api/");
      const isHealthRoute = req.path.startsWith("/health");
      const isMetricsRoute = req.path.startsWith("/metrics");
      
      // Only return 404 for non-API/non-health/non-metrics routes
      if (!isApiRoute && !isHealthRoute && !isMetricsRoute) {
        res.status(404).json({
          error: "Not Found",
          message: "Endpoint not found. This is a backend API server. Use /api/v1/* for API endpoints, /health for health checks, or /metrics for metrics.",
          path: req.path,
          availableEndpoints: {
            api: "/api/v1/*",
            health: "/health/*",
            metrics: "/metrics",
          },
        });
        return;
      }
      
      // For API routes that don't exist, return 404
      if (isApiRoute) {
        res.status(404).json({
          error: "Not Found",
          message: "API endpoint not found. Frontend runs separately on port 3001.",
          path: req.path,
        });
        return;
      }
    }
  });
}

// Error handling middleware (must be last)
// Note: Express error handlers require 4 parameters
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  // Ensure JSON response is sent
  if (!res.headersSent) {
    errorHandler(err, req, res, next);
  } else {
    // Headers already sent, log error but don't send response
    logger.error("Error occurred after response sent", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      url: req.url,
    });
  }
});

// Create HTTP server for WebSocket support
const httpServer = createServer(app);

// Initialize WebSocket gateway (lazy initialization)
// WebSocket gateway is initialized after server starts to avoid import issues
setImmediate(() => {
  try {
    initializeWebSocketGateway(httpServer);
  } catch (error) {
    logger.error("Failed to initialize WebSocket gateway", { error });
    // Continue without WebSocket - app can still function
  }
});

// Start server with database connection test
const server = httpServer.listen(config.port, async () => {
  logger.info(`🚀 Dese EA Plan v7.1.0 server started`, {
    port: config.port,
    environment: config.nodeEnv,
    version:
      process.env.APP_VERSION || process.env.npm_package_version || "7.1.0",
    domain: "cpt-optimization",
  });

  // Test database connection on startup
  try {
    const isConnected = await checkDatabaseConnection();
    if (isConnected) {
      logger.info("✅ Database connection verified");
    } else {
      logger.error("❌ Database connection failed on startup");
    }
  } catch (error) {
    logger.error("❌ Database connection failed on startup", { error });
    // Don't exit - let the app start but health checks will fail
  }

  // Start performance metrics collection
  try {
    startPerformanceMetricsCollection(10000); // Update every 10 seconds
    logger.info("✅ Performance metrics collection started");
  } catch (error) {
    logger.error("❌ Failed to start performance metrics collection", { error });
    // Don't exit - app can still function without metrics
  }

  // Start FinBot event consumer
  try {
    await startFinBotConsumer();
    logger.info("✅ FinBot event consumer started");
  } catch (error) {
    logger.error("❌ Failed to start FinBot event consumer", { error });
    // Don't exit - app can continue without consumer
  }

  // Initialize APM service
  try {
    const { apmService } = await import("@/services/monitoring/apm-service.js");
    await apmService.initialize();
    logger.info("✅ APM service initialized");
  } catch (error) {
    logger.error("❌ Failed to initialize APM service", { error });
    // Don't exit - app can continue without APM
  }
});

// Graceful shutdown
gracefulShutdown(server, async () => {
  logger.info("🔄 Gracefully shutting down server...");

  // Stop rate limit manager
  try {
    const { rateLimitManager } = await import("@/services/rate-limit/rate-limit-manager.js");
    await rateLimitManager.close();
    logger.info("✅ Rate limit manager stopped");
  } catch (error) {
    logger.error("❌ Failed to stop rate limit manager", { error });
  }

  // Shutdown APM service
  try {
    const { apmService } = await import("@/services/monitoring/apm-service.js");
    await apmService.shutdown();
    logger.info("✅ APM service stopped");
  } catch (error) {
    logger.error("❌ Failed to stop APM service", { error });
  }

  // Stop FinBot consumer
  try {
    await stopFinBotConsumer();
    logger.info("✅ FinBot event consumer stopped");
  } catch (error) {
    logger.error("❌ Error stopping FinBot consumer", { error });
  }

  // Close WebSocket gateway
  try {
    await closeWebSocketGateway();
    logger.info("✅ WebSocket gateway closed");
  } catch (error) {
    logger.error("Error closing WebSocket gateway", { error });
  }

  // Stop performance metrics collection
  try {
    stopPerformanceMetricsCollection();
    logger.info("✅ Performance metrics collection stopped");
  } catch (error) {
    logger.error("❌ Error stopping performance metrics collection", { error });
  }

  await closeDatabaseConnection();
  logger.info("✅ Server shutdown complete");
});

export default app;
