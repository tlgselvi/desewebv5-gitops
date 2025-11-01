import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { masterControlRoutes } from './masterControl.js';
import { errorHandler } from '@/middleware/errorHandler.js';
import { createAdminAuthHeaders } from '../../tests/helpers.js';
import * as masterControlService from '@/services/masterControl.js';

// Mock masterControl service
vi.mock('@/services/masterControl.js', () => ({
  masterControl: {
    executeWorkflow: vi.fn(),
    executeCommand: vi.fn(),
    verifyEnvironment: vi.fn(),
    checkRulesCompliance: vi.fn(),
    collectMetrics: vi.fn(),
    trainPredictiveModels: vi.fn(),
    syncDocura: vi.fn(),
    updatePhase7: vi.fn(),
    generateCEOReport: vi.fn(),
  },
}));

// Mock authentication middleware
vi.mock('@/middleware/auth.js', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'admin-user-id', email: 'admin@example.com', role: 'admin' };
    next();
  },
  authorize: () => (req: any, res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/v1/master-control', masterControlRoutes);
app.use(errorHandler);

describe('Master Control - Workflow Execution', () => {
  const adminHeaders = createAdminAuthHeaders();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /execute - Workflow Execution', () => {
    it('should execute workflow with all steps successfully', async () => {
      const mockWorkflowResult = {
        success: true,
        steps: [
          {
            step: 'rule-verify',
            status: 'completed',
            result: {
              compliant: true,
              violations: [],
              securityPolicy: { exists: true, valid: true },
            },
            duration: 1234,
          },
          {
            step: 'observe',
            status: 'completed',
            result: {
              prometheus: { connected: true, metricsCollected: 4 },
              grafana: { connected: true, dashboards: 5 },
            },
            duration: 2345,
          },
          {
            step: 'aiops-tune',
            status: 'completed',
            result: {
              trained: true,
              modelType: 'isolation-forest',
              accuracy: 0.87,
            },
            duration: 5678,
          },
          {
            step: 'docura-sync',
            status: 'completed',
            result: {
              docura: { synced: true },
              seo: { synced: true },
            },
            duration: 3456,
          },
          {
            step: 'phase-update',
            status: 'completed',
            result: {
              phase: 'v6.7',
              manifestsLoaded: 15,
              servicesDeployed: [
                { name: 'backend', status: 'deployed', namespace: 'ea-web' },
              ],
            },
            duration: 8901,
          },
        ],
        totalDuration: 25000,
        startedAt: '2025-01-27T10:00:00Z',
        completedAt: '2025-01-27T10:00:25Z',
      };

      vi.mocked(masterControlService.masterControl.executeWorkflow).mockResolvedValue(
        mockWorkflowResult as any
      );

      const workflowRequest = {
        workflow: [
          {
            step: 'rule-verify',
            action: 'validate',
            source: 'rules.yaml',
            policy: 'securityPolicy.yaml',
          },
          {
            step: 'observe',
            targets: ['prometheus', 'grafana'],
            metrics: ['up', 'cpu_usage_seconds_total', 'http_requests_total'],
          },
          {
            step: 'aiops-tune',
            model: 'IsolationForest',
            dataset: 'observability-metrics',
            parameters: { n_estimators: 200, contamination: 0.05 },
          },
          {
            step: 'docura-sync',
            action: 'sync',
            docura_image: 'ghcr.io/cptsystems/docura-builder:latest',
            seo_observer: true,
          },
          {
            step: 'phase-update',
            target_phase: 'v6.7',
            apply_manifests: true,
            commit_changes: true,
          },
        ],
        auto_commit: true,
        self_update: true,
        validation: true,
        observability_check: true,
        full_cycle: true,
      };

      const response = await request(app)
        .post('/api/v1/master-control/execute')
        .set(adminHeaders)
        .send(workflowRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.steps).toHaveLength(5);
      expect(response.body.totalDuration).toBe(25000);
      expect(masterControlService.masterControl.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow: workflowRequest.workflow,
          auto_commit: true,
          self_update: true,
          validation: true,
          observability_check: true,
          full_cycle: true,
        })
      );
    });

    it('should validate workflow schema correctly', async () => {
      const invalidWorkflow = {
        workflow: [
          {
            step: 'invalid-step', // Invalid step
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/master-control/execute')
        .set(adminHeaders)
        .send(invalidWorkflow);

      expect(response.status).toBe(400);
    });

    it('should handle workflow execution errors gracefully', async () => {
      vi.mocked(masterControlService.masterControl.executeWorkflow).mockRejectedValue(
        new Error('Workflow execution failed')
      );

      const workflowRequest = {
        workflow: [
          {
            step: 'rule-verify',
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/master-control/execute')
        .set(adminHeaders)
        .send(workflowRequest);

      expect(response.status).toBe(500);
    });

    it('should execute legacy command when workflow is not provided', async () => {
      const mockCEOReport = {
        cevap: '✅ Sistem tam uyumlu',
        kanit: { schemas: {}, metrics: {}, evidence: [] },
        sonrakiAdim: { action: 'Continue', priority: 'low' },
        timestamp: '2025-01-27T10:00:00Z',
        version: '6.6.0',
      };

      vi.mocked(masterControlService.masterControl.executeCommand).mockResolvedValue(
        mockCEOReport as any
      );

      const commandRequest = {
        command: 'deploy',
        params: {},
      };

      const response = await request(app)
        .post('/api/v1/master-control/execute')
        .set(adminHeaders)
        .send(commandRequest);

      expect(response.status).toBe(200);
      expect(response.body.cevap).toBe('✅ Sistem tam uyumlu');
      expect(masterControlService.masterControl.executeCommand).toHaveBeenCalledWith(
        'deploy',
        {}
      );
    });
  });

  describe('POST /execute - Workflow Steps', () => {
    it('should handle rule-verify step with validation', async () => {
      const mockResult = {
        success: true,
        steps: [
          {
            step: 'rule-verify',
            status: 'completed',
            result: {
              compliant: true,
              violations: [],
              securityPolicy: { exists: true, valid: true },
            },
          },
        ],
        totalDuration: 1000,
        startedAt: '2025-01-27T10:00:00Z',
        completedAt: '2025-01-27T10:00:01Z',
      };

      vi.mocked(masterControlService.masterControl.executeWorkflow).mockResolvedValue(
        mockResult as any
      );

      const response = await request(app)
        .post('/api/v1/master-control/execute')
        .set(adminHeaders)
        .send({
          workflow: [
            {
              step: 'rule-verify',
              action: 'validate',
              source: 'rules.yaml',
              policy: 'securityPolicy.yaml',
            },
          ],
          validation: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.steps[0].step).toBe('rule-verify');
    });

    it('should handle observe step with metrics filtering', async () => {
      const mockResult = {
        success: true,
        steps: [
          {
            step: 'observe',
            status: 'completed',
            result: {
              prometheus: { connected: true, metricsCollected: 3 },
              grafana: { connected: true },
              observabilityChecks: {
                targets: {
                  prometheus: { connected: true, health: 'healthy' },
                },
                metrics: {
                  requested: ['up', 'cpu_usage_seconds_total'],
                  available: ['up', 'cpu_usage_seconds_total'],
                  missing: [],
                },
              },
            },
          },
        ],
        totalDuration: 2000,
        startedAt: '2025-01-27T10:00:00Z',
        completedAt: '2025-01-27T10:00:02Z',
      };

      vi.mocked(masterControlService.masterControl.executeWorkflow).mockResolvedValue(
        mockResult as any
      );

      const response = await request(app)
        .post('/api/v1/master-control/execute')
        .set(adminHeaders)
        .send({
          workflow: [
            {
              step: 'observe',
              targets: ['prometheus'],
              metrics: ['up', 'cpu_usage_seconds_total'],
            },
          ],
          observability_check: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.steps[0].result.observabilityChecks).toBeDefined();
    });
  });

  describe('POST /execute - Workflow Flags', () => {
    it('should handle auto_commit flag', async () => {
      const mockResult = {
        success: true,
        steps: [],
        totalDuration: 1000,
        startedAt: '2025-01-27T10:00:00Z',
        completedAt: '2025-01-27T10:00:01Z',
      };

      vi.mocked(masterControlService.masterControl.executeWorkflow).mockResolvedValue(
        mockResult as any
      );

      const response = await request(app)
        .post('/api/v1/master-control/execute')
        .set(adminHeaders)
        .send({
          workflow: [{ step: 'phase-update', commit_changes: true }],
          auto_commit: true,
        });

      expect(response.status).toBe(200);
      expect(masterControlService.masterControl.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          auto_commit: true,
        })
      );
    });

    it('should handle self_update flag', async () => {
      const mockResult = {
        success: true,
        steps: [],
        totalDuration: 1000,
        startedAt: '2025-01-27T10:00:00Z',
        completedAt: '2025-01-27T10:00:01Z',
      };

      vi.mocked(masterControlService.masterControl.executeWorkflow).mockResolvedValue(
        mockResult as any
      );

      const response = await request(app)
        .post('/api/v1/master-control/execute')
        .set(adminHeaders)
        .send({
          workflow: [{ step: 'rule-verify' }],
          self_update: true,
        });

      expect(response.status).toBe(200);
      expect(masterControlService.masterControl.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          self_update: true,
        })
      );
    });

    it('should handle full_cycle flag', async () => {
      const mockResult = {
        success: true,
        steps: [
          { step: 'rule-verify', status: 'completed' },
          {
            step: 'full-cycle-completion',
            status: 'completed',
            result: {
              environment: { namespace: { exists: true } },
              deployment: { healthScore: 100 },
            },
          },
        ],
        totalDuration: 5000,
        startedAt: '2025-01-27T10:00:00Z',
        completedAt: '2025-01-27T10:00:05Z',
      };

      vi.mocked(masterControlService.masterControl.executeWorkflow).mockResolvedValue(
        mockResult as any
      );

      const response = await request(app)
        .post('/api/v1/master-control/execute')
        .set(adminHeaders)
        .send({
          workflow: [{ step: 'rule-verify' }],
          full_cycle: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.steps.some((s: any) => s.step === 'full-cycle-completion')).toBe(true);
    });
  });
});

