import compression from "compression";
import cors from "cors";
import express, { Application, Request, Response, NextFunction, Router } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer, Server as HttpServer } from "http";
import { logger } from "@/utils/logger.js";
import { optionalAuth } from "@/middleware/auth.js";

type RegisterRoutesContext = {
  app: Application;
  router: Router;
  basePath: string;
  httpServer: HttpServer;
  moduleId: string;
  port: number;
};

export type McpServerConfig = {
  moduleId: string;
  port: number;
  registerRoutes: (context: RegisterRoutesContext) => void;
};

export type McpServerInstance = {
  app: Application;
  httpServer: HttpServer;
};

const MCP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MCP_RATE_LIMIT_MAX = 100;

export const createMcpServer = (config: McpServerConfig): McpServerInstance => {
  const { moduleId, port, registerRoutes } = config;

  const app = express();
  const basePath = `/${moduleId}`;

  app.use(express.json());
  app.use(helmet());
  app.use(cors());
  app.use(compression());

  const limiter = rateLimit({
    windowMs: MCP_RATE_LIMIT_WINDOW_MS,
    max: MCP_RATE_LIMIT_MAX,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(basePath, limiter);
  app.use(basePath, optionalAuth);

  const router = express.Router();
  const httpServer = createServer(app);

  router.get("/health", (_req: Request, res: Response) => {
    return res.json({
      status: "healthy",
      service: `${moduleId}-mcp`,
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  registerRoutes({
    app,
    router,
    basePath,
    httpServer,
    moduleId,
    port,
  });

  app.use(basePath, router);

  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error("MCP server error", {
      moduleId,
      error: err.message,
      stack: err.stack,
      url: req.url,
    });

    return res.status(500).json({
      error: "internal_error",
      message: "Failed to process MCP request",
      moduleId,
      timestamp: new Date().toISOString(),
    });
  });

  httpServer.listen(port, () => {
    logger.info(`MCP Server started`, {
      moduleId,
      port,
      endpoint: basePath,
      wsEndpoint: `${basePath}/ws`,
    });
  });

  return { app, httpServer };
};


