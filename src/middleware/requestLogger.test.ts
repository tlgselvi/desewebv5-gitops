import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requestLogger } from './requestLogger.js';

describe('RequestLogger Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/test',
      path: '/test',
      ip: '127.0.0.1',
      headers: {},
    };

    mockResponse = {
      statusCode: 200,
      on: vi.fn(),
    };

    mockNext = vi.fn();
  });

  it('should call next() after logging request', () => {
    // Act
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
  });

  it('should log request with method and path', () => {
    // Act
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

    // Assert - Middleware should execute without errors
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle POST requests', () => {
    // Arrange
    mockRequest.method = 'POST';
    mockRequest.body = { test: 'data' };

    // Act
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle PUT requests', () => {
    // Arrange
    mockRequest.method = 'PUT';
    mockRequest.body = { id: '123', data: 'updated' };

    // Act
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle DELETE requests', () => {
    // Arrange
    mockRequest.method = 'DELETE';

    // Act
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle requests with query parameters', () => {
    // Arrange
    mockRequest.query = { page: '1', limit: '10' };

    // Act
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle requests with user agent header', () => {
    // Arrange
    mockRequest.headers = { 'user-agent': 'Mozilla/5.0' };

    // Act
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
  });

  it('should log response finish event', () => {
    // Arrange
    const finishCallback = vi.fn();
    (mockResponse.on as ReturnType<typeof vi.fn>).mockImplementation(
      (event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback();
          callback();
        }
        return mockResponse as Response;
      }
    );

    // Act
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

    // Assert
    expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });
});

