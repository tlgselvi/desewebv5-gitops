import type { Request, Response, NextFunction } from "express";
import { logger } from "@/utils/logger.js";
import { CustomError } from "@/middleware/errorHandler.js";
import type { RequestWithUser } from "@/middleware/auth.js";

/**
 * RBAC Role-Based Access Control Middleware
 * Checks if user has one of the allowed roles
 * 
 * @param allowedRoles - Array of role names that are allowed to access the route
 * @returns Express middleware function
 */
export const requireRole = (allowedRoles: string[]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    try {
      const reqWithUser = req as RequestWithUser;
      if (!reqWithUser.user) {
        throw new CustomError("User not authenticated", 401);
      }

      const { role } = reqWithUser.user;

      // Check if user has one of the allowed roles
      if (!allowedRoles.includes(role)) {
        logger.warn("Role-based authorization failed", {
          userId: reqWithUser.user.id,
          userRole: role,
          allowedRoles,
          path: req.path,
          method: req.method,
        });

        throw new CustomError(
          `Insufficient permissions. Required roles: ${allowedRoles.join(", ")}`,
          403,
        );
      }

      logger.debug("Role-based authorization successful", {
        userId: reqWithUser.user.id,
        role,
        allowedRoles,
      });

      next();
    } catch (error) {
      if (error instanceof CustomError) {
        next(error);
      } else {
        logger.error("Role-based authorization error", {
          error: error instanceof Error ? error.message : String(error),
          path: req.path,
          method: req.method,
        });
        next(new CustomError("Authorization failed", 403));
      }
    }
  };
};

