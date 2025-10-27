import axios from 'axios';

export interface TelemetryData {
  timestamp: number;
  avgLatency: number;
  drift: boolean;
  metrics: Record<string, number>;
}

export class TelemetryAgent {
  private prometheusUrl: string;

  constructor(prometheusUrl: string = 'http://prometheus-service.monitoring:9090') {
    this.prometheusUrl = prometheusUrl;
  }

  /**
   * Collect metrics from Prometheus
   */
  async collectMetrics(): Promise<any> {
    try {
      const query = 'rate(http_request_duration_seconds_sum[5m])';
      const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
        params: { query },
      });
      return response.data;
    } catch (error) {
      console.error('Error collecting metrics from Prometheus:', error);
      return {};
    }
  }

  /**
   * Detect drift between actual and predicted values
   */
  detectDrift(actual: number, predicted: number, threshold: number = 0.05): boolean {
    const drift = Math.abs(actual - predicted) / Math.max(predicted, 1e-6);
    return drift > threshold;
  }

  /**
   * Calculate average latency from metrics
   */
  calculateAverageLatency(data: any): number {
    try {
      const values = data?.data?.result?.map((item: any) => parseFloat(item.value[1])) || [];
      if (values.length === 0) return 0;
      
      const sum = values.reduce((acc: number, val: number) => acc + val, 0);
      return sum / values.length;
    } catch (error) {
      console.error('Error calculating average latency:', error);
      return 0;
    }
  }

  /**
   * Run telemetry collection and detection
   */
  async run(interval: number = 60000): Promise<TelemetryData> {
    const data = await this.collectMetrics();
    const avgLatency = this.calculateAverageLatency(data);
    const drift = this.detectDrift(avgLatency, 1.0);

    const telemetryData: TelemetryData = {
      timestamp: Date.now(),
      avgLatency,
      drift,
      metrics: {
        avgLatency,
        predictedLatency: 1.0,
        driftPercentage: avgLatency > 0 ? ((avgLatency - 1.0) / 1.0) * 100 : 0,
      },
    };

    console.log(JSON.stringify(telemetryData));
    return telemetryData;
  }

  /**
   * Get current system state
   */
  async getSystemState(): Promise<TelemetryData> {
    return this.run();
  }
}

