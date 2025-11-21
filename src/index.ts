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

// Passport stratejisini yükle (sadece import etmek yeterli)
import "@/services/passport.js";

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

// Input sanitization
app.use(sanitizeInput);

// Request size limiter (10MB)
app.use(requestSizeLimiter(10 * 1024 * 1024));

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

// Session ve Passport Middleware
// ÖNEMLİ: Bu middleware'ler CORS'tan sonra ve rotalardan önce gelmelidir.
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

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use(requestLogger);

// Prometheus metrics
if (config.monitoring.prometheus) {
  app.use(prometheusMiddleware);
}

// API routes
setupRoutes(app);

// Swagger documentation
if (!dev) {
  setupSwagger(app);
}

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
  // In Hybrid Mode, only handle API routes - ignore frontend routes
  app.use((req: Request, res: Response): void => {
    // Only return 404 for API routes that don't exist
    // Frontend routes (like /login, /dashboard, etc.) should be ignored
    if (req.path.startsWith("/api/") && !res.headersSent) {
      res.status(404).json({
        error: "Not Found",
        message: "API endpoint not found. Frontend runs separately on port 3001.",
        path: req.path,
      });
      return;
    }
    // For non-API routes, do nothing (they're handled by frontend)
    // This prevents backend from interfering with frontend routes
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
  logger.info(`🚀 Dese EA Plan v6.8.1 server started`, {
    port: config.port,
    environment: config.nodeEnv,
    version:
      process.env.APP_VERSION || process.env.npm_package_version || "6.8.1",
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

  // Start FinBot event consumer
  try {
    await startFinBotConsumer();
    logger.info("✅ FinBot event consumer started");
  } catch (error) {
    logger.error("❌ Failed to start FinBot event consumer", { error });
    // Don't exit - app can continue without consumer
  }
});

// Graceful shutdown
gracefulShutdown(server, async () => {
  logger.info("🔄 Gracefully shutting down server...");

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

  await closeDatabaseConnection();
  logger.info("✅ Server shutdown complete");
});

export default app;
