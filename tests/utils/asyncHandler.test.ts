import { describe, it, expect, vi } from 'vitest';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { Request, Response, NextFunction } from 'express';

describe('asyncHandler', () => {
  it('should wrap async function and return middleware', () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const handler = asyncHandler(asyncFn);

    expect(typeof handler).toBe('function');
    expect(handler.length).toBe(3); // Express middleware signature: (req, res, next)
  });

  it('should call async function with req, res, next', async () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const handler = asyncHandler(asyncFn);
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await handler(req, res, next);

    expect(asyncFn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle successful async operations', async () => {
    const asyncFn = vi.fn().mockResolvedValue('success');
    const handler = asyncHandler(asyncFn);
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await handler(req, res, next);

    expect(asyncFn).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch errors and pass to next', async () => {
    const error = new Error('Test error');
    const asyncFn = vi.fn().mockRejectedValue(error);
    const handler = asyncHandler(asyncFn);
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await handler(req, res, next);

    expect(asyncFn).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
  });

  it('should handle different error types', async () => {
    const error = new TypeError('Type error');
    const asyncFn = vi.fn().mockRejectedValue(error);
    const handler = asyncHandler(asyncFn);
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should handle string errors', async () => {
    const error = 'String error';
    const asyncFn = vi.fn().mockRejectedValue(error);
    const handler = asyncHandler(asyncFn);
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should handle errors with custom properties', async () => {
    const error = new Error('Custom error');
    (error as any).statusCode = 400;
    (error as any).code = 'CUSTOM_ERROR';
    const asyncFn = vi.fn().mockRejectedValue(error);
    const handler = asyncHandler(asyncFn);
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect((next.mock.calls[0][0] as any).statusCode).toBe(400);
    expect((next.mock.calls[0][0] as any).code).toBe('CUSTOM_ERROR');
  });

  it('should work with Express request/response objects', async () => {
    const asyncFn = vi.fn().mockImplementation(async (req: Request, res: Response) => {
      (res as any).status = vi.fn().mockReturnValue(res);
      (res as any).json = vi.fn().mockReturnValue(res);
      return res.status(200).json({ success: true });
    });
    const handler = asyncHandler(asyncFn);
    const req = { body: { test: 'data' } } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    await handler(req, res, next);

    expect(asyncFn).toHaveBeenCalledWith(req, res, next);
  });

  it('should handle multiple sequential calls', async () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const handler = asyncHandler(asyncFn);
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await handler(req, res, next);
    await handler(req, res, next);
    await handler(req, res, next);

    expect(asyncFn).toHaveBeenCalledTimes(3);
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle promise rejection without throwing', async () => {
    const error = new Error('Promise rejection');
    const asyncFn = vi.fn().mockRejectedValue(error);
    const handler = asyncHandler(asyncFn);
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    // Should not throw, should call next with error
    await expect(handler(req, res, next)).resolves.not.toThrow();
    expect(next).toHaveBeenCalledWith(error);
  });
});

