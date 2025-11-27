/**
 * Incident Response Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  incidentResponseService,
  createIncident,
  type Incident,
  type IncidentSeverity,
} from '@/services/monitoring/incident-response.js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('IncidentResponseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createIncident', () => {
    it('should create an incident with all required fields', async () => {
      const incident = await createIncident(
        'Test Incident',
        'This is a test incident description',
        'high',
        'test-service'
      );

      expect(incident).toBeDefined();
      expect(incident.id).toMatch(/^INC-\d+-[a-z0-9]+$/);
      expect(incident.title).toBe('Test Incident');
      expect(incident.description).toBe('This is a test incident description');
      expect(incident.severity).toBe('high');
      expect(incident.source).toBe('test-service');
      expect(incident.timestamp).toBeInstanceOf(Date);
    });

    it('should create incident with metadata', async () => {
      const incident = await createIncident(
        'Test Incident',
        'Description',
        'critical',
        'test-service',
        { userId: '123', requestId: 'abc' }
      );

      expect(incident.metadata).toEqual({ userId: '123', requestId: 'abc' });
    });

    it('should store incident in active incidents', async () => {
      const incident = await createIncident(
        'Active Incident',
        'Description',
        'medium',
        'test-service'
      );

      const retrieved = incidentResponseService.getIncident(incident.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Active Incident');
    });
  });

  describe('getActiveIncidents', () => {
    it('should return only active (unresolved) incidents', async () => {
      // Create multiple incidents
      const incident1 = await createIncident('Incident 1', 'Desc', 'low', 'test');
      const incident2 = await createIncident('Incident 2', 'Desc', 'medium', 'test');

      // Resolve one
      await incidentResponseService.resolveIncident(incident1.id);

      const activeIncidents = incidentResponseService.getActiveIncidents();
      
      expect(activeIncidents.some(i => i.id === incident2.id)).toBe(true);
      expect(activeIncidents.some(i => i.id === incident1.id)).toBe(false);
    });
  });

  describe('acknowledgeIncident', () => {
    it('should acknowledge an existing incident', async () => {
      const incident = await createIncident('Test', 'Desc', 'high', 'test');
      
      const result = incidentResponseService.acknowledgeIncident(incident.id);
      
      expect(result).toBe(true);
      
      const updated = incidentResponseService.getIncident(incident.id);
      expect(updated?.acknowledgedAt).toBeInstanceOf(Date);
    });

    it('should return false for non-existent incident', () => {
      const result = incidentResponseService.acknowledgeIncident('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('resolveIncident', () => {
    it('should resolve an existing incident', async () => {
      const incident = await createIncident('Test', 'Desc', 'high', 'test');
      
      const result = await incidentResponseService.resolveIncident(incident.id);
      
      expect(result).toBe(true);
      
      const updated = incidentResponseService.getIncident(incident.id);
      expect(updated?.resolvedAt).toBeInstanceOf(Date);
    });

    it('should return false for non-existent incident', async () => {
      const result = await incidentResponseService.resolveIncident('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('severity levels', () => {
    const severities: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];

    severities.forEach((severity) => {
      it(`should create incident with ${severity} severity`, async () => {
        const incident = await createIncident(
          `${severity} incident`,
          'Description',
          severity,
          'test'
        );

        expect(incident.severity).toBe(severity);
      });
    });
  });
});

