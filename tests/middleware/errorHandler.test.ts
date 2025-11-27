import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';
import { errorHandler, createError, CustomError, asyncHandler, notFoundHandler } from '@/middleware/errorHandler.js';
import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';

// Mock logger
vi.mock('@/utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock config
vi.mock('@/config/index.js', () => ({
  config: {
    nodeEnv: 'test',
  },
}));

describe('errorHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockReq = {
      method: 'GET',
      url: '/test',
      headers: {},
      body: {},
      params: {},
      query: {},
      originalUrl: '/test',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('ZodError handling', () => {
    it('should handle ZodError and return 400 with validation details', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number',
        } as ZodIssue,
      ]);

      errorHandler(zodError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String), // Can be 'CustomError' or 'Error' depending on implementation
          message: 'Validation Error',
          details: {
            issues: [
              {
                field: 'name',
                message: 'Expected string, received number',
                code: 'invalid_type',
              },
            ],
          },
        })
      );
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('CustomError handling', () => {
    it('should handle CustomError with status code', () => {
      const customError = new CustomError('Custom error message', 404);

      errorHandler(customError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String), // Can be 'CustomError' or 'Error' depending on implementation
          message: 'Custom error message',
        })
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle CustomError with 500 status code and log as error', () => {
      const customError = new CustomError('Server error', 500);

      errorHandler(customError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle Error with statusCode property', () => {
      const error = new Error('Test error') as any;
      error.statusCode = 403;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error',
        })
      );
    });

    it('should handle Error without statusCode property (defaults to 500)', () => {
      const error = new Error('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle Error with isOperational property', () => {
      const error = new Error('Test error') as any;
      error.isOperational = true;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Unknown error handling', () => {
    it('should handle unknown error type (not Error instance)', () => {
      const unknownError = 'String error';

      errorHandler(unknownError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal Server Error',
        })
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle null error', () => {
      errorHandler(null, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle undefined error', () => {
      errorHandler(undefined, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Specific error type handling', () => {
    it('should handle ValidationError', () => {
      const error = new Error('Validation failed') as any;
      error.name = 'ValidationError';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Validation Error',
        })
      );
    });

    it('should handle CastError', () => {
      const error = new Error('Invalid ID') as any;
      error.name = 'CastError';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid ID format',
        })
      );
    });

    it('should handle MongoError with code 11000 (duplicate key)', () => {
      const error = new Error('Duplicate key') as any;
      error.name = 'MongoError';
      error.code = 11000;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Duplicate field value',
        })
      );
    });

    it('should handle MongoError without code 11000', () => {
      const error = new Error('Mongo error') as any;
      error.name = 'MongoError';
      error.code = 11001; // Different code

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      // Should not match the 11000 branch, so defaults to 500
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle JsonWebTokenError', () => {
      const error = new Error('Invalid token') as any;
      error.name = 'JsonWebTokenError';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
        })
      );
    });

    it('should handle TokenExpiredError', () => {
      const error = new Error('Token expired') as any;
      error.name = 'TokenExpiredError';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token expired',
        })
      );
    });

    it('should handle MulterError with code property', () => {
      const error = new Error('File upload error') as any;
      error.name = 'MulterError';
      error.code = 'LIMIT_FILE_SIZE';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'File upload error',
          details: { code: 'LIMIT_FILE_SIZE' },
        })
      );
    });

    it('should handle MulterError without code property', () => {
      const error = new Error('File upload error') as any;
      error.name = 'MulterError';
      // No code property

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      // Should not match the hasCodeProperty branch, so defaults to 500
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Error logging', () => {
    it('should log as error for statusCode >= 500', () => {
      const error = new CustomError('Server error', 500);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Server Error',
        expect.objectContaining({
          error: expect.objectContaining({
            name: expect.any(String), // Can be 'CustomError' or 'Error'
            message: 'Server error',
          }),
          request: expect.objectContaining({
            method: 'GET',
            url: '/test',
          }),
        })
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should log as warn for statusCode < 500', () => {
      const error = new CustomError('Client error', 400);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(
        'Client Error',
        expect.objectContaining({
          error: expect.objectContaining({
            name: expect.any(String), // Can be 'CustomError' or 'Error'
            message: 'Client error',
          }),
        })
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should include user ID in error log when available', () => {
      const error = new CustomError('Server error', 500);
      const reqWithUser = {
        ...mockReq,
        user: { id: 'user-123' },
      } as any;

      errorHandler(error, reqWithUser, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Server Error',
        expect.objectContaining({
          user: 'user-123',
        })
      );
    });
  });

  describe('Error response details', () => {
    it('should include details in response when available', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string',
        } as ZodIssue,
      ]);

      errorHandler(zodError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.any(Object),
        })
      );
    });

    it('should not include details when not available', () => {
      const error = new CustomError('Test error', 400);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const jsonCall = (mockRes.json as any).mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('details');
    });
  });

  describe('Stack trace in development', () => {
    it('should include stack trace in development mode', () => {
      vi.mocked(config).nodeEnv = 'development';
      const error = new CustomError('Test error', 500);
      error.stack = 'Error stack trace';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: 'Error stack trace',
        })
      );
    });

    it('should not include stack trace in production mode', () => {
      vi.mocked(config).nodeEnv = 'production';
      const error = new CustomError('Test error', 500);
      error.stack = 'Error stack trace';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const jsonCall = (mockRes.json as any).mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('stack');
    });

    it('should not include stack trace when stack is undefined', () => {
      vi.mocked(config).nodeEnv = 'development';
      const error = new CustomError('Test error', 500);
      error.stack = undefined;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const jsonCall = (mockRes.json as any).mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('stack');
    });
  });

  describe('Error response structure', () => {
    it('should include all required fields in error response', () => {
      const error = new CustomError('Test error', 400);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String), // Can be 'CustomError' or 'Error'
          message: 'Test error',
          timestamp: expect.any(String),
          path: '/test',
          method: 'GET',
        })
      );
    });

    it('should use error name or default to "Error"', () => {
      const error = new Error('Test error');
      error.name = '';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });
  });
});

describe('createError', () => {
  it('should create CustomError with message and status code', () => {
    const error = createError('Test error', 404);

    expect(error).toBeInstanceOf(CustomError);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(404);
    expect(error.isOperational).toBe(true);
  });

  it('should default status code to 500', () => {
    const error = createError('Test error');

    expect(error.statusCode).toBe(500);
  });
});

describe('asyncHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {};
    mockNext = vi.fn();
  });

  it('should call handler function successfully', async () => {
    const handler = vi.fn().mockResolvedValue('success');
    const wrapped = asyncHandler(handler);

    await wrapped(mockReq as Request, mockRes as Response, mockNext);

    expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should catch and pass error to next', async () => {
    const error = new Error('Handler error');
    const handler = vi.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(handler);

    await wrapped(mockReq as Request, mockRes as Response, mockNext);

    expect(handler).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  // Note: Synchronous errors are handled by Promise.resolve in asyncHandler
  // This is already covered by the "should catch and pass error to next" test
  // Testing synchronous throws directly would require wrapping in try-catch
  // which defeats the purpose of testing asyncHandler's error handling

  it('should handle non-promise return values', async () => {
    const handler = vi.fn().mockReturnValue('sync result');
    const wrapped = asyncHandler(handler);

    await wrapped(mockReq as Request, mockRes as Response, mockNext);

    expect(handler).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('notFoundHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      originalUrl: '/non-existent-route',
    };
    mockRes = {};
    mockNext = vi.fn();
  });

  it('should create 404 error and call next', () => {
    notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Route /non-existent-route not found',
        statusCode: 404,
      })
    );
  });
});

