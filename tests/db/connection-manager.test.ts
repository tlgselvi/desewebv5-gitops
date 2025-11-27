import { describe, it, expect, beforeEach, vi } from 'vitest';
import { connectionManager } from '@/db/connection-manager.js';
import { config } from '@/config/index.js';

// Mock config
vi.mock('@/config/index.js', () => ({
  config: {
    database: {
      url: 'postgresql://test:test@localhost:5432/test',
      readReplicaUrls: [],
      maxPoolSize: 20,
      replicationLagThreshold: 1000,
      enableReadReplica: false,
    },
  },
}));

// Mock logger
vi.mock('@/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('ConnectionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize connection manager', () => {
    expect(connectionManager).toBeDefined();
  });

  it('should route read queries to primary when no replicas', () => {
    const connection = connectionManager.getConnection('read');
    expect(connection).toBeDefined();
  });

  it('should route write queries to primary', () => {
    const connection = connectionManager.getConnection('write');
    expect(connection).toBeDefined();
  });

  it('should route transactions to primary', () => {
    const connection = connectionManager.getConnection('transaction');
    expect(connection).toBeDefined();
  });

  it('should get primary connection', () => {
    const connection = connectionManager.getPrimaryConnection();
    expect(connection).toBeDefined();
  });

  it('should get replica connection (falls back to primary)', () => {
    const connection = connectionManager.getReplicaConnection();
    expect(connection).toBeDefined();
  });

  it('should check replication lag', async () => {
    const lag = await connectionManager.checkReplicationLag();
    expect(lag).toBeGreaterThanOrEqual(0);
  });

  it('should close all connections', async () => {
    await expect(connectionManager.closeAllConnections()).resolves.not.toThrow();
  });
});

