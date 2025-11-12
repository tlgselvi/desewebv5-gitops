import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
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

type ErrorResponse = {
  error: string;
  message: string;
  timestamp: string;
  path: string;
  method: string;
  details?: unknown;
  stack?: string;
};

interface RequestWithUser extends Request {
  user?: {
    id?: string;
  };
}

const hasCodeProperty = (value: unknown): value is { code?: unknown } => {
  return typeof value === 'object' && value !== null && 'code' in value;
};

const toAppError = (error: unknown): AppError => {
  if (error instanceof CustomError) {
    return error;
  }

  if (error instanceof Error) {
    const candidate = error as AppError;
    if (candidate.statusCode === undefined) {
      candidate.statusCode = 500;
    }
    if (candidate.isOperational === undefined) {
      candidate.isOperational = false;
    }
    return candidate;
  }

  return new CustomError('Internal Server Error', 500);
};

export const errorHandler = (
  error: unknown,
  req: RequestWithUser,
  res: Response,
  _next: NextFunction
): void => {
  const zodError = error instanceof ZodError ? error : null;
  const appError = zodError ? new CustomError('Validation Error', 400) : toAppError(error);

  let statusCode = appError.statusCode || 500;
  let message = appError.message || 'Internal Server Error';
  let details: unknown = undefined;

  // Handle different error types
  if (zodError) {
    statusCode = 400;
    message = 'Validation Error';
    details = {
      issues: zodError.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    };
  } else if (appError.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (appError.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (appError.name === 'MongoError' && hasCodeProperty(appError) && appError.code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value';
  } else if (appError.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (appError.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (appError.name === 'MulterError' && hasCodeProperty(appError)) {
    statusCode = 400;
    message = 'File upload error';
    details = { code: appError.code };
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Server Error', {
      error: {
        name: appError.name,
        message: appError.message,
        stack: appError.stack,
      },
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        params: req.params,
        query: req.query,
      },
      user: req.user?.id,
    });
  } else {
    logger.warn('Client Error', {
      error: {
        name: appError.name,
        message: appError.message,
      },
      request: {
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
      },
      user: req.user?.id,
    });
  }

  // Send error response
  const errorResponse: ErrorResponse = {
    error: appError.name || 'Error',
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
    if (appError.stack) {
      errorResponse.stack = appError.stack;
    }
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = createError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};
