import type { Request, Response, NextFunction } from 'express';
import { setRLSContext } from '@/db/rls-helper.js';
import type { RequestWithUser } from '@/middleware/auth.js';
import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';
import { CustomError } from '@/middleware/errorHandler.js';

/**
 * Row-Level Security (RLS) Middleware
 * 
 * Sets PostgreSQL session variables for RLS policies before each request.
 * This middleware must be used after authentication middleware.
 * 
 * The RLS policies in the database will use these session variables to filter
 * data based on organization_id and user role.
 * 
 * SECURITY: In production, this middleware will fail the request if RLS context
 * cannot be set, preventing unauthorized data access.
 */
export const setRLSContextMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reqWithUser = req as RequestWithUser;

    // Only set RLS context if user is authenticated
    if (reqWithUser.user) {
      const { id: userId, organizationId, role } = reqWithUser.user;

      // Validate required fields
      if (!userId) {
        logger.error('RLS context middleware: userId is missing', {
          path: req.path,
          method: req.method,
        });
        if (config.nodeEnv === 'production') {
          return next(new CustomError('Authentication error: User ID missing', 401));
        }
      }

      // Set RLS context for this request
      // This will be used by all database queries in this request
      try {
        await setRLSContext(organizationId, userId, role);
        
        // Store RLS context status in request for audit logging
        (req as any).rlsContextSet = true;
        (req as any).rlsContext = {
          organizationId,
          userId,
          role,
        };

        logger.debug('RLS context middleware applied', {
          userId,
          organizationId,
          role,
          path: req.path,
        });
      } catch (rlsError) {
        logger.error('RLS context middleware: Failed to set RLS context', {
          error: rlsError instanceof Error ? rlsError.message : String(rlsError),
          userId,
          organizationId,
          role,
          path: req.path,
          method: req.method,
        });
        
        // In production, fail the request if RLS context cannot be set
        if (config.nodeEnv === 'production') {
          return next(new CustomError('Security error: Failed to set RLS context', 500));
        }
        
        // In development, log warning but continue
        logger.warn('RLS context not set - continuing in development mode', {
          path: req.path,
        });
        (req as any).rlsContextSet = false;
      }
    } else {
      // No user authenticated, RLS policies will block all access
      logger.warn('RLS context middleware: No authenticated user', {
        path: req.path,
        method: req.method,
      });
      (req as any).rlsContextSet = false;
      
      // In production, fail requests without authentication
      if (config.nodeEnv === 'production') {
        return next(new CustomError('Authentication required', 401));
      }
    }

    next();
  } catch (error) {
    logger.error('RLS context middleware error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      path: req.path,
      method: req.method,
    });
    
    // In production, fail the request on unexpected errors
    if (config.nodeEnv === 'production') {
      return next(new CustomError('Security error: RLS middleware failure', 500));
    }
    
    // In development, continue but log the error
    next();
  }
};

