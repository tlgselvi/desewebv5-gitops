import type { Request, Response, NextFunction } from "express";
import { logger } from "@/utils/logger.js";
import { CustomError } from "@/middleware/errorHandler.js";
import type { RequestWithUser } from "@/middleware/auth.js";
import { hasPermission, type Module, type Action } from "@/services/rbac/permission.service.js";

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

/**
 * Module-based Permission Middleware
 * Checks if user has permission to access a specific module with a specific action
 * 
 * @param module - Module name (finance, crm, inventory, hr, iot, seo, service, settings, admin)
 * @param action - Action type (read, write, delete, all)
 * @returns Express middleware function
 */
export const requireModulePermission = (module: Module, action: Action = 'read') => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const reqWithUser = req as RequestWithUser;
      if (!reqWithUser.user) {
        throw new CustomError("User not authenticated", 401);
      }

      const { id: userId, organizationId } = reqWithUser.user;

      if (!organizationId) {
        throw new CustomError("Organization ID is required", 400);
      }

      // Check permission
      const hasAccess = await hasPermission(userId, organizationId, module, action);

      if (!hasAccess) {
        logger.warn("Module permission check failed", {
          userId,
          organizationId,
          module,
          action,
          path: req.path,
          method: req.method,
        });

        throw new CustomError(
          `Insufficient permissions. Required: ${module}:${action}`,
          403,
        );
      }

      logger.debug("Module permission check successful", {
        userId,
        module,
        action,
      });

      next();
    } catch (error) {
      if (error instanceof CustomError) {
        next(error);
      } else {
        logger.error("Module permission check error", {
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
 * HTTP Method to Action mapping
 * Used to automatically determine action from HTTP method
 */
const methodToAction: Record<string, Action> = {
  GET: 'read',
  POST: 'write',
  PUT: 'write',
  PATCH: 'write',
  DELETE: 'delete',
};

/**
 * Auto-detect module from route path
 * Example: /api/v1/finance/invoices -> finance
 */
function detectModuleFromPath(path: string): Module | null {
  const moduleMatch = path.match(/\/api\/v1\/([^\/]+)/);
  if (!moduleMatch) {
    return null;
  }

  const moduleName = moduleMatch[1] as Module;
  const validModules: Module[] = ['finance', 'crm', 'inventory', 'hr', 'iot', 'seo', 'service', 'settings', 'admin'];
  
  if (validModules.includes(moduleName)) {
    return moduleName;
  }

  return null;
}

/**
 * Automatic Module Permission Middleware
 * Automatically detects module from route path and action from HTTP method
 * 
 * @param module - Optional module name (if not provided, will be detected from path)
 * @returns Express middleware function
 */
export const requireModuleAccess = (module?: Module) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const reqWithUser = req as RequestWithUser;
      if (!reqWithUser.user) {
        throw new CustomError("User not authenticated", 401);
      }

      // Detect module from path if not provided
      const detectedModule = module || detectModuleFromPath(req.path);
      
      if (!detectedModule) {
        logger.warn("Could not detect module from path", {
          path: req.path,
          method: req.method,
        });
        // If module cannot be detected, allow access (backward compatibility)
        return next();
      }

      // Detect action from HTTP method
      const action = methodToAction[req.method] || 'read';

      const { id: userId, organizationId } = reqWithUser.user;

      if (!organizationId) {
        throw new CustomError("Organization ID is required", 400);
      }

      // Check permission
      const hasAccess = await hasPermission(userId, organizationId, detectedModule, action);

      if (!hasAccess) {
        logger.warn("Module access check failed", {
          userId,
          organizationId,
          module: detectedModule,
          action,
          path: req.path,
          method: req.method,
        });

        throw new CustomError(
          `Insufficient permissions. Required: ${detectedModule}:${action}`,
          403,
        );
      }

      logger.debug("Module access check successful", {
        userId,
        module: detectedModule,
        action,
      });

      next();
    } catch (error) {
      if (error instanceof CustomError) {
        next(error);
      } else {
        logger.error("Module access check error", {
          error: error instanceof Error ? error.message : String(error),
          path: req.path,
          method: req.method,
        });
        next(new CustomError("Authorization failed", 403));
      }
    }
  };
};
