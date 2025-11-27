import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, createModuleLogger, logPerformance, logError, logAudit } from '@/utils/logger.js';
import { config } from '@/config/index.js';

// Mock config
vi.mock('@/config/index.js', () => ({
  config: {
    logging: {
      level: 'info',
      maxSize: '20m',
      maxFiles: '14d',
    },
    nodeEnv: 'test',
  },
}));

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logger instance', () => {
    it('should have info method', () => {
      expect(logger.info).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should have warn method', () => {
      expect(logger.warn).toBeDefined();
      expect(typeof logger.warn).toBe('function');
    });

    it('should have error method', () => {
      expect(logger.error).toBeDefined();
      expect(typeof logger.error).toBe('function');
    });

    it('should have debug method', () => {
      expect(logger.debug).toBeDefined();
      expect(typeof logger.debug).toBe('function');
    });

    it('should log info messages', () => {
      const spy = vi.spyOn(logger, 'info');
      logger.info('Test message');
      expect(spy).toHaveBeenCalledWith('Test message');
    });

    it('should log warn messages', () => {
      const spy = vi.spyOn(logger, 'warn');
      logger.warn('Warning message');
      expect(spy).toHaveBeenCalledWith('Warning message');
    });

    it('should log error messages', () => {
      const spy = vi.spyOn(logger, 'error');
      logger.error('Error message');
      expect(spy).toHaveBeenCalledWith('Error message');
    });

    it('should log debug messages', () => {
      const spy = vi.spyOn(logger, 'debug');
      logger.debug('Debug message');
      expect(spy).toHaveBeenCalledWith('Debug message');
    });

    it('should log with metadata', () => {
      const spy = vi.spyOn(logger, 'info');
      logger.info('Test message', { key: 'value', number: 123 });
      expect(spy).toHaveBeenCalledWith('Test message', { key: 'value', number: 123 });
    });
  });

  describe('createModuleLogger', () => {
    it('should create a child logger with module name', () => {
      const moduleLogger = createModuleLogger('test-module');
      expect(moduleLogger).toBeDefined();
      expect(moduleLogger.info).toBeDefined();
    });

    it('should create different loggers for different modules', () => {
      const logger1 = createModuleLogger('module1');
      const logger2 = createModuleLogger('module2');
      expect(logger1).not.toBe(logger2);
    });
  });

  describe('logPerformance', () => {
    it('should log performance metrics', () => {
      const spy = vi.spyOn(logger, 'info');
      const startTime = Date.now() - 100; // 100ms ago

      logPerformance('test-operation', startTime);

      expect(spy).toHaveBeenCalled();
      const callArgs = spy.mock.calls[0];
      expect(callArgs[0]).toContain('Performance: test-operation');
      expect(callArgs[1]).toHaveProperty('operation', 'test-operation');
      expect(callArgs[1]).toHaveProperty('duration');
    });

    it('should log performance with metadata', () => {
      const spy = vi.spyOn(logger, 'info');
      const startTime = Date.now() - 50;
      const metadata = { userId: 'user-1', requestId: 'req-1' };

      logPerformance('test-operation', startTime, metadata);

      expect(spy).toHaveBeenCalled();
      const callArgs = spy.mock.calls[0][1];
      expect(callArgs).toHaveProperty('userId', 'user-1');
      expect(callArgs).toHaveProperty('requestId', 'req-1');
    });

    it('should calculate duration correctly', () => {
      const spy = vi.spyOn(logger, 'info');
      const startTime = Date.now() - 250; // 250ms ago

      logPerformance('test-operation', startTime);

      const callArgs = spy.mock.calls[0][1];
      expect(callArgs.duration).toMatch(/\d+ms/);
    });
  });

  describe('logError', () => {
    it('should log error with details', () => {
      const spy = vi.spyOn(logger, 'error');
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      logError(error);

      expect(spy).toHaveBeenCalled();
      const callArgs = spy.mock.calls[0];
      expect(callArgs[0]).toBe('Application Error');
      expect(callArgs[1]).toHaveProperty('error');
      expect(callArgs[1].error).toHaveProperty('name', 'Error');
      expect(callArgs[1].error).toHaveProperty('message', 'Test error');
      expect(callArgs[1].error).toHaveProperty('stack', 'Error stack trace');
    });

    it('should log error with context', () => {
      const spy = vi.spyOn(logger, 'error');
      const error = new Error('Test error');
      const context = { userId: 'user-1', operation: 'test' };

      logError(error, context);

      expect(spy).toHaveBeenCalled();
      const callArgs = spy.mock.calls[0][1];
      expect(callArgs).toHaveProperty('context', context);
    });

    it('should handle errors without stack', () => {
      const spy = vi.spyOn(logger, 'error');
      const error = new Error('Test error');
      delete (error as any).stack;

      logError(error);

      expect(spy).toHaveBeenCalled();
      const callArgs = spy.mock.calls[0][1];
      expect(callArgs.error).toHaveProperty('name');
      expect(callArgs.error).toHaveProperty('message');
    });
  });

  describe('logAudit', () => {
    it('should log audit events', () => {
      const spy = vi.spyOn(logger, 'info');
      logAudit('user_login', 'user-1');

      expect(spy).toHaveBeenCalled();
      const callArgs = spy.mock.calls[0];
      expect(callArgs[0]).toBe('Audit Log');
      expect(callArgs[1]).toHaveProperty('action', 'user_login');
      expect(callArgs[1]).toHaveProperty('userId', 'user-1');
      expect(callArgs[1]).toHaveProperty('timestamp');
    });

    it('should log audit without userId', () => {
      const spy = vi.spyOn(logger, 'info');
      logAudit('system_event');

      expect(spy).toHaveBeenCalled();
      const callArgs = spy.mock.calls[0][1];
      expect(callArgs).toHaveProperty('action', 'system_event');
      expect(callArgs.userId).toBeUndefined();
    });

    it('should log audit with metadata', () => {
      const spy = vi.spyOn(logger, 'info');
      const metadata = { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0' };

      logAudit('user_action', 'user-1', metadata);

      expect(spy).toHaveBeenCalled();
      const callArgs = spy.mock.calls[0][1];
      expect(callArgs).toHaveProperty('ipAddress', '192.168.1.1');
      expect(callArgs).toHaveProperty('userAgent', 'Mozilla/5.0');
    });

    it('should include timestamp in audit log', () => {
      const spy = vi.spyOn(logger, 'info');
      const beforeTime = new Date().toISOString();

      logAudit('test_action');

      const afterTime = new Date().toISOString();
      const callArgs = spy.mock.calls[0][1];
      const logTime = callArgs.timestamp;

      expect(logTime).toBeDefined();
      expect(logTime >= beforeTime && logTime <= afterTime).toBe(true);
    });
  });
});

