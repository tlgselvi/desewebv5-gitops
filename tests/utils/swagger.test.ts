import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Application } from 'express';
import { setupSwagger } from '@/utils/swagger.js';

// Mock swagger dependencies
vi.mock('swagger-jsdoc', () => ({
  default: vi.fn(() => ({
    openapi: '3.0.0',
    info: {
      title: 'Dese EA Plan API',
      version: '1.0.0',
    },
    paths: {},
  })),
}));

vi.mock('swagger-ui-express', () => ({
  default: {
    serve: vi.fn((req: any, res: any, next: any) => next()),
    setup: vi.fn(() => vi.fn((req: any, res: any, next: any) => next())),
  },
}));

describe('Swagger Setup', () => {
  let app: Application;
  let useCalls: any[];
  let getCalls: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    useCalls = [];
    getCalls = [];
    
    // Create mock Express app
    app = {
      use: vi.fn((...args: any[]) => {
        useCalls.push(args);
        return app;
      }),
      get: vi.fn((...args: any[]) => {
        getCalls.push(args);
        return app;
      }),
    } as unknown as Application;
  });

  it('should setup Swagger UI endpoint', () => {
    setupSwagger(app);

    // Verify app.use was called for /api-docs
    const apiDocsCall = useCalls.find((call: any[]) => call[0] === '/api-docs');
    expect(apiDocsCall).toBeDefined();
    expect(app.use).toHaveBeenCalled();
  });

  it('should setup Swagger JSON endpoint', () => {
    setupSwagger(app);

    // Verify app.get was called for /api-docs.json
    const jsonCall = getCalls.find((call: any[]) => call[0] === '/api-docs.json');
    expect(jsonCall).toBeDefined();
    expect(app.get).toHaveBeenCalled();
  });

  it('should not throw error when called', () => {
    expect(() => setupSwagger(app)).not.toThrow();
  });

  it('should be callable multiple times', () => {
    expect(() => {
      setupSwagger(app);
      setupSwagger(app);
    }).not.toThrow();
  });
});

