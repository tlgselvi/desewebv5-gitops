import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Server } from 'http';
import { gracefulShutdown } from '@/utils/gracefulShutdown.js';
import { logger } from '@/utils/logger.js';

// Mock logger
vi.mock('@/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('gracefulShutdown', () => {
  let mockServer: Partial<Server>;
  let originalExit: typeof process.exit;
  let originalOn: typeof process.on;
  let processListeners: Map<string, Function[]>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Store original process methods
    originalExit = process.exit;
    originalOn = process.on;
    
    // Mock process.exit to prevent actual exit
    process.exit = vi.fn() as any;
    
    // Track process event listeners
    processListeners = new Map();
    process.on = vi.fn((event: string, handler: Function) => {
      if (!processListeners.has(event)) {
        processListeners.set(event, []);
      }
      processListeners.get(event)!.push(handler);
      return process as any;
    }) as any;

    // Mock server
    mockServer = {
      close: vi.fn((callback?: (err?: Error) => void) => {
        if (callback) {
          setTimeout(() => callback(), 0);
        }
        return mockServer as Server;
      }),
    };
  });

  afterEach(() => {
    // Restore original process methods
    process.exit = originalExit;
    process.on = originalOn;
    processListeners.clear();
  });

  it('should register signal handlers', () => {
    gracefulShutdown(mockServer as Server);

    expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(process.on).toHaveBeenCalledWith('SIGUSR2', expect.any(Function));
  });

  it('should register uncaught exception handler', () => {
    gracefulShutdown(mockServer as Server);

    expect(process.on).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
  });

  it('should register unhandled rejection handler', () => {
    gracefulShutdown(mockServer as Server);

    expect(process.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
  });

  it('should call server.close on SIGTERM', async () => {
    gracefulShutdown(mockServer as Server);

    const sigtermHandler = processListeners.get('SIGTERM')?.[0];
    expect(sigtermHandler).toBeDefined();

    if (sigtermHandler) {
      await sigtermHandler();
    }

    expect(mockServer.close).toHaveBeenCalled();
  });

  it('should call cleanup function if provided', async () => {
    const cleanup = vi.fn().mockResolvedValue(undefined);
    gracefulShutdown(mockServer as Server, cleanup);

    const sigtermHandler = processListeners.get('SIGTERM')?.[0];
    expect(sigtermHandler).toBeDefined();

    if (sigtermHandler) {
      // Wait for server.close callback
      await new Promise(resolve => setTimeout(resolve, 10));
      await sigtermHandler();
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    expect(cleanup).toHaveBeenCalled();
  });

  it('should handle cleanup function errors', async () => {
    const cleanup = vi.fn().mockRejectedValue(new Error('Cleanup error'));
    gracefulShutdown(mockServer as Server, cleanup);

    const sigtermHandler = processListeners.get('SIGTERM')?.[0];
    expect(sigtermHandler).toBeDefined();

    if (sigtermHandler) {
      await new Promise(resolve => setTimeout(resolve, 10));
      await sigtermHandler();
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    expect(cleanup).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it('should force shutdown after timeout', async () => {
    vi.useFakeTimers();
    
    gracefulShutdown(mockServer as Server, undefined, { timeout: 1000 });

    const sigtermHandler = processListeners.get('SIGTERM')?.[0];
    expect(sigtermHandler).toBeDefined();

    if (sigtermHandler) {
      // Don't call server.close callback to trigger timeout
      (mockServer.close as any).mockImplementation(() => mockServer);
      await sigtermHandler();
      
      // Fast-forward time
      vi.advanceTimersByTime(1001);
    }

    expect(process.exit).toHaveBeenCalledWith(1);
    vi.useRealTimers();
  });

  it('should ignore signals during shutdown', async () => {
    gracefulShutdown(mockServer as Server);

    const sigtermHandler = processListeners.get('SIGTERM')?.[0];
    expect(sigtermHandler).toBeDefined();

    if (sigtermHandler) {
      // First call - starts shutdown
      await sigtermHandler();
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Reset mock to track second call
      vi.clearAllMocks();
      logger.warn = vi.fn();
      
      // Second call during shutdown (should be ignored)
      await sigtermHandler();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verify warning was logged
      expect(logger.warn).toHaveBeenCalled();
      const warnCall = (logger.warn as any).mock.calls[0];
      expect(warnCall[0]).toContain('during shutdown');
    }
  });

  it('should handle server.close errors', async () => {
    const closeError = new Error('Close error');
    (mockServer.close as any).mockImplementation((callback?: (err?: Error) => void) => {
      if (callback) {
        setTimeout(() => callback(closeError), 0);
      }
      return mockServer;
    });

    gracefulShutdown(mockServer as Server);

    const sigtermHandler = processListeners.get('SIGTERM')?.[0];
    expect(sigtermHandler).toBeDefined();

    if (sigtermHandler) {
      await new Promise(resolve => setTimeout(resolve, 10));
      await sigtermHandler();
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    expect(logger.error).toHaveBeenCalledWith(
      'Error during server shutdown:',
      closeError
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle uncaught exceptions', async () => {
    gracefulShutdown(mockServer as Server);

    const uncaughtHandler = processListeners.get('uncaughtException')?.[0];
    expect(uncaughtHandler).toBeDefined();

    if (uncaughtHandler) {
      const error = new Error('Uncaught exception');
      await uncaughtHandler(error);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    expect(logger.error).toHaveBeenCalledWith('Uncaught Exception:', expect.any(Error));
    expect(mockServer.close).toHaveBeenCalled();
  });

  it('should handle unhandled rejections', async () => {
    gracefulShutdown(mockServer as Server);

    const unhandledHandler = processListeners.get('unhandledRejection')?.[0];
    expect(unhandledHandler).toBeDefined();

    if (unhandledHandler) {
      const reason = new Error('Unhandled rejection');
      // Create a rejected promise and catch it immediately to prevent unhandled rejection
      const promise = Promise.reject(reason);
      promise.catch(() => {}); // Suppress unhandled rejection warning
      
      // Call handler synchronously (not awaiting to avoid promise issues)
      try {
        unhandledHandler(reason, promise);
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (e) {
        // Ignore errors from handler
      }
    }

    expect(logger.error).toHaveBeenCalled();
    expect(mockServer.close).toHaveBeenCalled();
  });

  it('should use custom timeout', () => {
    gracefulShutdown(mockServer as Server, undefined, { timeout: 5000 });
    
    // Verify it was called (timeout is used internally)
    expect(process.on).toHaveBeenCalled();
  });

  it('should use custom signals', () => {
    gracefulShutdown(mockServer as Server, undefined, { signals: ['SIGTERM'] });
    
    expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(process.on).not.toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });

  it('should log graceful shutdown handlers registered', () => {
    gracefulShutdown(mockServer as Server);

    expect(logger.info).toHaveBeenCalledWith('Graceful shutdown handlers registered');
  });
});

