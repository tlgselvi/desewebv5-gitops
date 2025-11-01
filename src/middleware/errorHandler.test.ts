import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { errorHandler, CustomError, createError, asyncHandler, notFoundHandler } from './errorHandler.js';

describe('ErrorHandler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/test',
      path: '/test',
      originalUrl: '/test',
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('errorHandler', () => {
    it('should handle JsonWebTokenError with 401 status', () => {
      // Arrange
      const jwtError = new Error('Invalid token');
      jwtError.name = 'JsonWebTokenError';

      // Act
      errorHandler(jwtError as AppError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalled();
      const callArg = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.message).toBe('Invalid token');
    });

    it('should handle TokenExpiredError with 401 status', () => {
      // Arrange
      const tokenError = new Error('Token expired');
      tokenError.name = 'TokenExpiredError';

      // Act
      errorHandler(tokenError as AppError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle ValidationError with 400 status', () => {
      // Arrange
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';

      // Act
      errorHandler(validationError as AppError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle CastError with 400 status', () => {
      // Arrange
      const castError = new Error('Invalid ID');
      castError.name = 'CastError';

      // Act
      errorHandler(castError as AppError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
      const callArg = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.message).toBe('Invalid ID format');
    });

    it('should handle ZodError with 400 status', () => {
      // Arrange
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          path: ['field'],
          message: 'Invalid type',
          expected: 'string',
          received: 'number',
        },
      ]);

      // Act
      errorHandler(zodError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
      const callArg = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg).toHaveProperty('details');
      expect(callArg.details).toHaveProperty('issues');
    });

    it('should handle CustomError with custom status code', () => {
      // Arrange
      const customError = new CustomError('Not Found', 404);

      // Act
      errorHandler(customError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle unknown error with 500 status', () => {
      // Arrange
      const error = new Error('Unknown error');

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should include stack trace in development mode', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      const callArg = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg).toHaveProperty('stack');

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('CustomError', () => {
    it('should create error with status code', () => {
      // Arrange & Act
      const error = new CustomError('Not Found', 404);

      // Assert
      expect(error.message).toBe('Not Found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should create error with default values', () => {
      // Arrange & Act
      const error = new CustomError('Error');

      // Assert
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('createError', () => {
    it('should create AppError with message and status code', () => {
      // Act
      const error = createError('Bad Request', 400);

      // Assert
      expect(error.message).toBe('Bad Request');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('asyncHandler', () => {
    it('should handle async function success', async () => {
      // Arrange
      const asyncFn = async (req: Request, res: Response, next: NextFunction) => {
        res.status(200).json({ success: true });
      };
      const wrapped = asyncHandler(asyncFn);

      // Act
      await wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch and forward errors', async () => {
      // Arrange
      const asyncFn = async () => {
        throw new Error('Test error');
      };
      const wrapped = asyncHandler(asyncFn);

      // Act
      await wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('notFoundHandler', () => {
    it('should create 404 error and call next', () => {
      // Act
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(errorArg.statusCode).toBe(404);
      expect(errorArg.message).toContain('not found');
    });
  });
});

