import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "@/config/index.js";
import { logger } from "@/utils/logger.js";
import { CustomError } from "@/middleware/errorHandler.js";

/**
 * Extended Request interface with user information
 */
export interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions?: string[];
  };
}

/**
 * JWT Authentication Middleware
 * Validates JWT token from Authorization header
 */
export const authenticate = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new CustomError("Authorization header is missing", 401);
    }

    // Check if it's Bearer token
    if (!authHeader.startsWith("Bearer ")) {
      throw new CustomError("Invalid authorization format. Use: Bearer <token>", 401);
    }

    // Extract token
    const token = authHeader.substring(7);

    if (!token) {
      throw new CustomError("Token is missing", 401);
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, config.security.jwtSecret) as {
        id: string;
        email: string;
        role: string;
        permissions?: string[];
        iat?: number;
        exp?: number;
      };

      // Attach user info to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
      };

      logger.debug("JWT authentication successful", {
        userId: decoded.id,
        email: decoded.email,
        role: decoded.role,
      });

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new CustomError("Token expired", 401);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new CustomError("Invalid token", 401);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof CustomError) {
      logger.warn("Authentication failed", {
        error: error.message,
        path: req.path,
        method: req.method,
      });
      next(error);
    } else {
      logger.error("Authentication error", {
        error: error instanceof Error ? error.message : String(error),
        path: req.path,
        method: req.method,
      });
      next(new CustomError("Authentication failed", 401));
    }
  }
};

/**
 * RBAC Authorization Middleware
 * Checks if user has required role(s) or permission(s)
 */
export const authorize = (requiredRolesOrPermissions: string[]) => {
  return (
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ): void => {
    try {
      if (!req.user) {
        throw new CustomError("User not authenticated", 401);
      }

      const { role, permissions = [] } = req.user;

      // Check if user has required role or permission
      const hasAccess =
        requiredRolesOrPermissions.includes(role) ||
        requiredRolesOrPermissions.some((perm) => permissions.includes(perm));

      if (!hasAccess) {
        logger.warn("Authorization failed", {
          userId: req.user.id,
          userRole: role,
          userPermissions: permissions,
          required: requiredRolesOrPermissions,
          path: req.path,
          method: req.method,
        });

        throw new CustomError(
          "Insufficient permissions. Required: " + requiredRolesOrPermissions.join(", "),
          403,
        );
      }

      logger.debug("Authorization successful", {
        userId: req.user.id,
        role,
        required: requiredRolesOrPermissions,
      });

      next();
    } catch (error) {
      if (error instanceof CustomError) {
        next(error);
      } else {
        logger.error("Authorization error", {
          error: error instanceof Error ? error.message : String(error),
          path: req.path,
          method: req.method,
        });
        next(new CustomError("Authorization failed", 403));
      }
    }
  };
};

/**
 * Optional Authentication Middleware
 * Tries to authenticate but doesn't fail if token is missing
 * Useful for endpoints that work with or without authentication
 */
export const optionalAuth = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided, continue without user
      return next();
    }

    const token = authHeader.substring(7);

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.security.jwtSecret) as {
        id: string;
        email: string;
        role: string;
        permissions?: string[];
      };

      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
      };

      logger.debug("Optional authentication successful", {
        userId: decoded.id,
        email: decoded.email,
      });
    } catch (error) {
      // Invalid token, but continue without user
      logger.debug("Optional authentication failed, continuing without user", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    next();
  } catch (error) {
    // Continue without user on any error
    logger.debug("Optional authentication error, continuing without user", {
      error: error instanceof Error ? error.message : String(error),
    });
    next();
  }
};

