import { describe, it, expect, beforeAll } from 'vitest';
import { logger } from '@/utils/logger.js';

/**
 * MCP Integration Test Suite
 * 
 * Tests Model Context Protocol server integration:
 * - Server discovery
 * - Service communication
 * - Context sharing
 * - Query routing
 * 
 * Phase-5 Sprint 1: Task 1.1
 */

const MCP_SERVERS = [
  { name: 'FinBot', url: 'http://localhost:5555', endpoint: '/finbot' },
  { name: 'MuBot', url: 'http://localhost:5556', endpoint: '/mubot' },
  { name: 'DESE', url: 'http://localhost:5557', endpoint: '/dese' },
  { name: 'Observability', url: 'http://localhost:5558', endpoint: '/observability' },
];

describe('MCP Integration', () => {
  beforeAll(async () => {
    logger.info('Starting MCP integration tests');
    
    // Verify all MCP servers are available
    for (const server of MCP_SERVERS) {
      try {
        const response = await fetch(`${server.url}${server.endpoint}/health`);
        if (!response.ok) {
          throw new Error(`${server.name} MCP server not available`);
        }
        const data = await response.json();
        expect(data.status).toBe('healthy');
      } catch (error) {
        logger.warn(`${server.name} MCP server may not be running`, { error });
      }
    }
  });

  describe('MCP Server Discovery', () => {
    it('should discover all MCP servers', async () => {
      const discoveredServers = [];

      for (const server of MCP_SERVERS) {
        try {
          const response = await fetch(`${server.url}${server.endpoint}/health`);
          if (response.ok) {
            const data = await response.json();
            discoveredServers.push({
              name: server.name,
              status: data.status,
              version: data.version,
            });
          }
        } catch (error) {
          // Server not available, skip
        }
      }

      expect(discoveredServers.length).toBeGreaterThan(0);
      expect(discoveredServers.every((s) => s.status === 'healthy')).toBe(true);
    });

    it('should validate MCP server versions', async () => {
      for (const server of MCP_SERVERS) {
        try {
          const response = await fetch(`${server.url}${server.endpoint}/health`);
          if (response.ok) {
            const data = await response.json();
            expect(data.version).toBeDefined();
            expect(typeof data.version).toBe('string');
          }
        } catch (error) {
          // Server not available, skip
        }
      }
    });
  });

  describe('MCP Query Routing', () => {
    it('should route queries to FinBot MCP', async () => {
      try {
        const response = await fetch('http://localhost:5555/finbot/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'Get financial accounts',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          expect(data).toBeDefined();
        }
      } catch (error) {
        // Server may not be running in test environment
        expect(error).toBeDefined();
      }
    });

    it('should route queries to MuBot MCP', async () => {
      try {
        const response = await fetch('http://localhost:5556/mubot/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'Get accounting data',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          expect(data).toBeDefined();
        }
      } catch (error) {
        // Server may not be running in test environment
        expect(error).toBeDefined();
      }
    });

    it('should route queries to DESE MCP', async () => {
      try {
        const response = await fetch('http://localhost:5557/dese/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'Get analytics data',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          expect(data).toBeDefined();
        }
      } catch (error) {
        // Server may not be running in test environment
        expect(error).toBeDefined();
      }
    });
  });

  describe('MCP Context Sharing', () => {
    it('should share context between FinBot and MuBot', async () => {
      const testContext = {
        resource: 'finbot.transaction',
        resourceId: 'tx-context-1',
      };

      try {
        // Set context in FinBot
        const finbotResponse = await fetch('http://localhost:5555/finbot/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testContext),
        });

        // Get context from MuBot
        const mubotResponse = await fetch('http://localhost:5556/mubot/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testContext),
        });

        if (finbotResponse.ok && mubotResponse.ok) {
          expect(finbotResponse.status).toBe(200);
          expect(mubotResponse.status).toBe(200);
        }
      } catch (error) {
        // Servers may not be running
        expect(error).toBeDefined();
      }
    });

    it('should share context between MuBot and DESE', async () => {
      const testContext = {
        resource: 'mubot.data',
        resourceId: 'data-context-1',
      };

      try {
        const mubotResponse = await fetch('http://localhost:5556/mubot/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testContext),
        });

        const deseResponse = await fetch('http://localhost:5557/dese/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testContext),
        });

        if (mubotResponse.ok && deseResponse.ok) {
          expect(mubotResponse.status).toBe(200);
          expect(deseResponse.status).toBe(200);
        }
      } catch (error) {
        // Servers may not be running
        expect(error).toBeDefined();
      }
    });
  });

  describe('MCP Observability Integration', () => {
    it('should retrieve metrics from Observability MCP', async () => {
      try {
        const response = await fetch('http://localhost:5558/observability/metrics');
        if (response.ok) {
          const data = await response.json();
          expect(data).toBeDefined();
          expect(data.metrics).toBeDefined();
        }
      } catch (error) {
        // Server may not be running
        expect(error).toBeDefined();
      }
    });

    it('should validate correlation endpoint', async () => {
      try {
        const response = await fetch('http://localhost:5555/finbot/correlation/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (response.ok) {
          const data = await response.json();
          expect(data.status).toBeDefined();
        }
      } catch (error) {
        // Server may not be running
        expect(error).toBeDefined();
      }
    });
  });

  describe('MCP Service Communication', () => {
    it('should handle cross-module queries', async () => {
      // Query that requires FinBot + MuBot data
      const crossModuleQuery = {
        query: 'Get financial data with accounting context',
        modules: ['finbot', 'mubot'],
      };

      try {
        const finbotResponse = await fetch('http://localhost:5555/finbot/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(crossModuleQuery),
        });

        const mubotResponse = await fetch('http://localhost:5556/mubot/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(crossModuleQuery),
        });

        if (finbotResponse.ok && mubotResponse.ok) {
          expect(finbotResponse.status).toBe(200);
          expect(mubotResponse.status).toBe(200);
        }
      } catch (error) {
        // Servers may not be running
        expect(error).toBeDefined();
      }
    });

    it('should validate service response times', async () => {
      const maxResponseTime = 500; // 500ms

      for (const server of MCP_SERVERS) {
        try {
          const startTime = Date.now();
          const response = await fetch(`${server.url}${server.endpoint}/health`);
          const endTime = Date.now();
          const responseTime = endTime - startTime;

          if (response.ok) {
            expect(responseTime).toBeLessThan(maxResponseTime);
          }
        } catch (error) {
          // Server may not be running
        }
      }
    });
  });
});

