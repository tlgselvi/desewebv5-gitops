import { Router, type Request, type Response } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { config } from "@/config/index.js";
import { logger } from "@/utils/logger.js";
import { asyncHandler, createError } from "@/middleware/errorHandler.js";

const authRouter: Router = Router();

/**
 * Handle GET requests to /login endpoint
 * Returns 405 Method Not Allowed with Allow header
 */
authRouter.get("/login", (req: Request, res: Response): void => {
  res.status(405).setHeader("Allow", "POST").json({
    success: false,
    error: "method_not_allowed",
    message: "GET method is not allowed for this endpoint. Use POST method.",
    allowedMethods: ["POST"],
    endpoint: "/api/v1/auth/login",
  });
});

authRouter.post("/login", (req: Request, res: Response): void => {
  const { username = "admin@poolfab.com.tr" } = req.body ?? {};

  try {
    const token = jwt.sign(
      {
        id: "mock-user",
        email: username,
        role: "admin",
        permissions: ["admin", "mcp.dashboard.read"],
      },
      config.security.jwtSecret,
      { expiresIn: "1h" },
    );

    logger.debug("Mock login token issued", { username });

    res.json({
      success: true,
      token,
      user: {
        id: "mock-user",
        email: username,
        role: "admin",
      },
    });
  } catch (error) {
    logger.error("Failed to generate mock login token", { error });
    res.status(500).json({
      success: false,
      error: "mock_login_failed",
      message: "Unable to generate mock login token",
    });
  }
});

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags: [Auth]
 *     description: Redirects user to Google OAuth consent screen
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 */
authRouter.get(
  "/google",
  (req: Request, res: Response, next): void => {
    // Check if Google OAuth is configured
    if (!config.apis.google.oauth?.clientId || !config.apis.google.oauth?.clientSecret) {
      logger.error("Google OAuth not configured");
      res.status(500).json({
        success: false,
        error: "google_oauth_not_configured",
        message: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.",
      });
      return;
    }
    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Auth]
 *     description: Handles Google OAuth callback and creates/updates user session
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Error from Google OAuth
 *     responses:
 *       302:
 *         description: Redirect to frontend with token or error
 */
authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${config.corsOrigin}/login?error=social_failed`,
    session: true,
  }),
  (req: Request, res: Response) => {
    try {
      // User is authenticated via Passport session
      const user = req.user as Express.User;

      if (!user) {
        logger.warn("Google OAuth callback: user not found in session");
        return res.redirect(`${config.corsOrigin}/login?error=social_failed`);
      }

      // Generate JWT token for frontend (maintain compatibility with existing frontend)
      const jwtPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.role === "admin" ? ["admin", "mcp.dashboard.read"] : [],
      };
      const expiresInValue = config.security.jwtExpiresIn ?? "24h";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = jwt.sign(jwtPayload, config.security.jwtSecret, {
        expiresIn: expiresInValue as any,
      });

      logger.info("Google OAuth login successful", {
        email: user.email,
        userId: user.id,
        role: user.role,
      });

      // Redirect to frontend callback page with token
      // Session is also stored in cookie for backend API calls
      res.redirect(`${config.corsOrigin}/auth/callback?token=${token}`);
    } catch (error) {
      logger.error("Error generating JWT token after Google OAuth", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.redirect(`${config.corsOrigin}/login?error=social_failed`);
    }
  },
);

/**
 * Get current authenticated user
 * Returns user info from session or JWT token
 */
authRouter.get("/me", (req: Request, res: Response) => {
  // Check Passport session first
  if (req.isAuthenticated() && req.user) {
    return res.json({
      success: true,
      user: req.user,
    });
  }

  // Fallback to JWT token (for API clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.security.jwtSecret) as {
        id: string;
        email: string;
        role: string;
      };
      return res.json({
        success: true,
        user: {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
        },
      });
    } catch (error) {
      // Invalid token, continue to 401
    }
  }

  return res.status(401).json({
    success: false,
    error: "Not authenticated",
  });
});

export { authRouter };

