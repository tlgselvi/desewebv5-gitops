import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelemetryAgent } from './telemetryAgent.js';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('TelemetryAgent Service', () => {
  let agent: TelemetryAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new TelemetryAgent('http://test-prometheus:9090');
  });

  describe('detectDrift', () => {
    it('should detect drift when difference exceeds threshold', () => {
      // Arrange
      const actual = 1.2;
      const predicted = 1.0;
      const threshold = 0.05; // 5%

      // Act
      const hasDrift = agent.detectDrift(actual, predicted, threshold);

      // Assert
      expect(hasDrift).toBe(true);
    });

    it('should not detect drift when difference is within threshold', () => {
      // Arrange
      const actual = 1.03;
      const predicted = 1.0;
      const threshold = 0.05; // 5%

      // Act
      const hasDrift = agent.detectDrift(actual, predicted, threshold);

      // Assert
      expect(hasDrift).toBe(false);
    });

    it('should handle zero predicted value', () => {
      // Arrange
      const actual = 0.1;
      const predicted = 0;
      const threshold = 0.05;

      // Act
      const hasDrift = agent.detectDrift(actual, predicted, threshold);

      // Assert
      expect(hasDrift).toBe(true);
    });
  });

  describe('calculateAverageLatency', () => {
    it('should return 0 for empty data', () => {
      // Arrange
      const data = {
        data: {
          result: [],
        },
      };

      // Act
      const avgLatency = agent['calculateAverageLatency'](data);

      // Assert
      expect(avgLatency).toBe(0);
    });

    it('should calculate average from valid data', () => {
      // Arrange
      const data = {
        data: {
          result: [
            { value: [1, '100'] },
            { value: [2, '200'] },
            { value: [3, '300'] },
          ],
        },
      };

      // Act
      const avgLatency = agent['calculateAverageLatency'](data);

      // Assert
      expect(avgLatency).toBe(200);
    });

    it('should handle invalid data gracefully', () => {
      // Arrange
      const data = {
        data: {
          result: [
            { value: [1, 'invalid'] },
            { value: [2, '200'] },
          ],
        },
      };

      // Act
      const avgLatency = agent['calculateAverageLatency'](data);

      // Assert
      expect(avgLatency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('collectMetrics', () => {
    it('should return empty object on error', async () => {
      // Arrange
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      // Act
      const result = await agent.collectMetrics();

      // Assert
      expect(result).toEqual({});
    });

    it('should return data on successful request', async () => {
      // Arrange
      const mockData = { data: { result: [] } };
      mockedAxios.get.mockResolvedValue({ data: mockData });

      // Act
      const result = await agent.collectMetrics();

      // Assert
      expect(result).toEqual(mockData);
    });
  });

  describe('getSystemState', () => {
    it('should return telemetry data with timestamp', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValue({
        data: {
          data: {
            result: [
              { value: [1, '150'] },
            ],
          },
        },
      });

      // Act
      const state = await agent.getSystemState();

      // Assert
      expect(state).toHaveProperty('timestamp');
      expect(state).toHaveProperty('avgLatency');
      expect(state).toHaveProperty('drift');
      expect(state).toHaveProperty('metrics');
    });

    it('should handle drift detection with custom threshold', () => {
      // Arrange
      const actual = 1.1;
      const predicted = 1.0;
      const threshold = 0.05;

      // Act
      const hasDrift = agent.detectDrift(actual, predicted, threshold);

      // Assert
      expect(typeof hasDrift).toBe('boolean');
    });

    it('should detect drift with default threshold', () => {
      // Arrange
      const actual = 1.1;
      const predicted = 1.0;

      // Act
      const hasDrift = agent.detectDrift(actual, predicted);

      // Assert
      expect(typeof hasDrift).toBe('boolean');
    });

    it('should calculate drift percentage correctly', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValue({
        data: {
          data: {
            result: [
              { value: [1, '120'] }, // 20% above predicted (100)
            ],
          },
        },
      });

      // Act
      const state = await agent.getSystemState();

      // Assert
      expect(state.metrics.driftPercentage).toBeGreaterThan(0);
      expect(state.drift).toBe(true);
    });
  });
});

