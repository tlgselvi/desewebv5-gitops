import { beforeEach, afterEach, vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.API_VERSION = process.env.API_VERSION || 'v1';
process.env.TEST_AUTH_TOKEN = 'test-token';

// Mock global fetch
global.fetch = vi.fn();

// Mock localStorage for browser-like environment
if (typeof global.localStorage === 'undefined') {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  };
  (global as any).localStorage = localStorageMock;
}

// Mock Redis client
vi.mock('@/services/storage/redisClient', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    mget: vi.fn(),
    ping: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
  checkRedisConnection: vi.fn().mockResolvedValue(true),
  SafeRedis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
  },
  FeedbackStore: {
    save: vi.fn(),
    getAll: vi.fn(),
    clear: vi.fn(),
    count: vi.fn(),
  },
}));

// Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

