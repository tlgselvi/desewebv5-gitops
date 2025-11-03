import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, users } from '@/db/index.js';
import { eq } from 'drizzle-orm';
import { config } from '@/config/index.js';
import { logger } from '@/utils/logger.js';
import { createError } from './errorHandler.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: unknown;
  };
}

/**
 * Authentication middleware to verify JWT tokens
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Development bypass for Master Control CLI
    if (config.nodeEnv === 'development' && req.headers['x-master-control-cli'] === 'true') {
      req.user = {
        id: 'master-control-cli',
        email: 'master-control@cptsystems.com',
        role: 'admin',
      };
      return next();
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        url: req.url,
      });
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
      return;
    }

    const token = authHeader.substring(7);

    if (!token) {
      logger.warn('Authentication failed: Empty token', {
        ip: req.ip,
        url: req.url,
      });
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authentication token',
      });
      return;
    }

    // Verify token
    let decoded: { id: string; email: string; role: string };
    try {
      decoded = jwt.verify(token, config.security.jwtSecret) as {
        id: string;
        email: string;
        role: string;
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Authentication failed: Token expired', {
          ip: req.ip,
          url: req.url,
        });
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Token has expired',
        });
        return;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Authentication failed: Invalid token', {
          ip: req.ip,
          url: req.url,
          error: error.message,
        });
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid authentication token',
        });
        return;
      }

      throw error;
    }

    // Verify user still exists and is active in database
    try {
      const userResult = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.id, decoded.id))
        .limit(1);

      if (userResult.length === 0) {
        logger.warn('Authentication failed: User not found', {
          userId: decoded.id,
          ip: req.ip,
          url: req.url,
        });
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not found',
        });
        return;
      }

      const user = userResult[0];

      if (!user.isActive) {
        logger.warn('Authentication failed: User inactive', {
          userId: user.id,
          ip: req.ip,
          url: req.url,
        });
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User account is disabled',
        });
        return;
      }

      // Fetch user roles from RBAC tables
      const userRolesResult = await db
        .select({ roleName: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, user.id));

      const roleNames = userRolesResult.map((r) => r.roleName as RoleName);
      
      // If no RBAC roles found, use legacy role field as fallback
      const finalRoles = roleNames.length > 0 ? roleNames : [user.role as RoleName];

      // Attach user to request object
      req.user = {
        id: user.id,
        email: user.email,
        roles: finalRoles,
        role: user.role, // Legacy field for backward compatibility
        firstName: user.firstName,
        lastName: user.lastName,
      };

      next();
    } catch (error) {
      logger.error('Database error during authentication', { error });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to verify user',
      });
      return;
    }
  } catch (error) {
    logger.error('Authentication middleware error', { error });
    next(error);
  }
};

/**
 * Role-based authorization middleware
 * Usage: authorize(['admin', 'manager'])
 */
export const authorize =
  (allowedRoles: string[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed: Insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        ip: req.ip,
        url: req.url,
      });
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for endpoints that work with or without authentication
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without authentication
    next();
    return;
  }

  // Try to authenticate but don't fail if it doesn't work
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.security.jwtSecret) as {
      id: string;
      email: string;
      role: string;
    };

    const userResult = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, decoded.id))
      .limit(1);

    if (userResult.length > 0 && userResult[0].isActive) {
      req.user = {
        id: userResult[0].id,
        email: userResult[0].email,
        role: userResult[0].role,
      };
    }
  } catch (error) {
    // Ignore authentication errors for optional auth
    logger.debug('Optional auth failed', { error });
  }

  next();
};

