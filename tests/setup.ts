import { afterAll, beforeAll, vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock logger to reduce noise during tests
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Drizzle ORM
// This is a simplified mock. For integration tests, use a real test DB container.
// For unit tests, we'll mock specific db calls within the test files.
vi.mock('@/db/index', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(),
          orderBy: vi.fn(),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
    transaction: vi.fn((callback) => callback({
        insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn() })) })),
        update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
        select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn() })) })),
    })),
  },
}));

beforeAll(() => {
  // Setup
});

afterAll(() => {
  // Cleanup
  vi.clearAllMocks();
});
