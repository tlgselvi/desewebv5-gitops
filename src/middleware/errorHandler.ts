import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

interface ErrorDetails {
  issues?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  code?: string | number;
}

interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  path: string;
  method: string;
  details?: ErrorDetails;
  stack?: string;
}

interface MongoError extends Error {
  code?: number;
}

interface MulterError extends Error {
  code?: string;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    [key: string]: unknown;
  };
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new CustomError(message, statusCode);
  return error;
};

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let details: ErrorDetails | undefined = undefined;

  // Handle different error types
  if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    details = {
      issues: error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    };
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'MongoError') {
    const mongoError = error as unknown as MongoError;
    if (mongoError.code === 11000) {
      statusCode = 409;
      message = 'Duplicate field value';
    }
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
    const multerError = error as unknown as MulterError;
    details = { code: multerError.code };
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Server Error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        params: req.params,
        query: req.query,
      },
      user: (req as AuthenticatedRequest).user?.id,
    });
  } else {
    logger.warn('Client Error', {
      error: {
        name: error.name,
        message: error.message,
      },
      request: {
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
      },
      user: (req as AuthenticatedRequest).user?.id,
    });
  }

  // Send error response
  const errorResponse: ErrorResponse = {
    error: error.name || 'Error',
    message,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
  };

  if (details) {
    errorResponse.details = details;
  }

  // Include stack trace in development
  if (config.nodeEnv === 'development') {
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = createError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};
