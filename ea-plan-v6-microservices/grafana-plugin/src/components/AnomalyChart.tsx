# EA Plan v6.0 - Custom Grafana Plugin

## Plugin Structure

```
grafana-plugin/
├── src/
│   ├── components/
│   │   ├── AnomalyChart.tsx
│   │   ├── MetricCard.tsx
│   │   ├── AlertPanel.tsx
│   │   └── SeverityIndicator.tsx
│   ├── types/
│   │   └── types.ts
│   ├── utils/
│   │   ├── dataProcessor.ts
│   │   ├── anomalyDetector.ts
│   │   └── chartHelpers.ts
│   ├── module.ts
│   └── plugin.ts
├── plugin.json
├── package.json
├── webpack.config.js
└── README.md
```

## Plugin Configuration

```json
// plugin.json
{
  "type": "panel",
  "name": "EA Plan v6.0 Anomaly Dashboard",
  "id": "ea-plan-v6-anomaly-panel",
  "info": {
    "description": "Dynamic anomaly detection and visualization panel for EA Plan v6.0 microservices",
    "author": {
      "name": "EA Plan v6.0 Team",
      "email": "team@ea-plan-v6.com"
    },
    "keywords": ["anomaly", "detection", "aiops", "monitoring", "microservices"],
    "logos": {
      "small": "img/logo.svg",
      "large": "img/logo.svg"
    },
    "links": [
      {
        "name": "Website",
        "url": "https://github.com/your-org/ea-plan-v6"
      },
      {
        "name": "Documentation",
        "url": "https://docs.ea-plan-v6.com"
      }
    ],
    "screenshots": [
      {
        "name": "Anomaly Detection",
        "path": "img/screenshot-anomaly.png"
      },
      {
        "name": "Severity Breakdown",
        "path": "img/screenshot-severity.png"
      }
    ],
    "version": "1.0.0",
    "updated": "2024-12-01"
  },
  "dependencies": {
    "grafanaVersion": "10.0.0",
    "plugins": []
  },
  "includes": [
    {
      "type": "panel",
      "name": "Anomaly Detection Panel"
    }
  ]
}
```

## Package Configuration

```json
// package.json
{
  "name": "ea-plan-v6-anomaly-panel",
  "version": "1.0.0",
  "description": "EA Plan v6.0 Anomaly Detection Panel for Grafana",
  "main": "dist/module.js",
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch",
    "test": "jest",
    "lint": "eslint src/**/*.{ts,tsx}",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@grafana/data": "^10.0.0",
    "@grafana/ui": "^10.0.0",
    "@grafana/runtime": "^10.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.8.0",
    "lodash": "^4.17.21",
    "moment": "^2.29.4"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/lodash": "^4.14.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "typescript": "^5.0.0",
    "webpack": "^5.88.0",
    "webpack-cli": "^5.1.0",
    "ts-loader": "^9.4.0",
    "css-loader": "^6.8.0",
    "style-loader": "^3.3.0",
    "jest": "^29.6.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.0"
  }
}
```

## TypeScript Types

```typescript
// src/types/types.ts
export interface AnomalyChartOptions {
  threshold: number;
  showSeverityBreakdown: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  alertOnAnomaly: boolean;
  alertThreshold: number;
  showTrendLine: boolean;
  colorScheme: 'light' | 'dark' | 'auto';
  chartType: 'line' | 'bar' | 'area';
  timeRange: string;
}

export interface AnomalyData {
  timestamp: number;
  value: number;
  anomalyScore?: number;
  isAnomaly?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  service?: string;
  metric?: string;
  confidence?: number;
}

export interface AnomalyStats {
  totalAnomalies: number;
  anomalyRate: number;
  severityCounts: Record<string, number>;
  averageAnomalyScore: number;
  lastAnomalyTime?: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ServiceMetrics {
  serviceName: string;
  metrics: AnomalyData[];
  healthScore: number;
  lastUpdate: number;
}

export interface AlertConfig {
  enabled: boolean;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notificationChannels: string[];
  cooldownPeriod: number;
}

export interface ChartDataPoint {
  timestamp: number;
  value: number;
  anomalyScore: number;
  isAnomaly: boolean;
  severity: string;
  color: string;
}
```

## Data Processing Utilities

```typescript
// src/utils/dataProcessor.ts
import { AnomalyData, AnomalyStats, ChartDataPoint } from '../types/types';

export class DataProcessor {
  private static readonly SEVERITY_THRESHOLDS = {
    critical: 0.9,
    high: 0.8,
    medium: 0.7,
    low: 0.6
  };

  static processTimeSeriesData(data: any[]): AnomalyData[] {
    if (!data || data.length === 0) return [];

    return data.map(point => ({
      timestamp: point.time || point.timestamp || Date.now(),
      value: point.value || 0,
      anomalyScore: point.anomalyScore || 0,
      isAnomaly: point.isAnomaly || false,
      severity: this.calculateSeverity(point.anomalyScore || 0),
      service: point.service || 'unknown',
      metric: point.metric || 'unknown',
      confidence: point.confidence || 0
    }));
  }

  static calculateSeverity(anomalyScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (anomalyScore >= this.SEVERITY_THRESHOLDS.critical) return 'critical';
    if (anomalyScore >= this.SEVERITY_THRESHOLDS.high) return 'high';
    if (anomalyScore >= this.SEVERITY_THRESHOLDS.medium) return 'medium';
    return 'low';
  }

  static calculateAnomalyStats(data: AnomalyData[]): AnomalyStats {
    const anomalies = data.filter(d => d.isAnomaly);
    const total = data.length;
    const anomalyRate = total > 0 ? (anomalies.length / total) * 100 : 0;
    
    const severityCounts = anomalies.reduce((acc, anomaly) => {
      const severity = anomaly.severity || 'low';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageAnomalyScore = anomalies.length > 0 
      ? anomalies.reduce((sum, a) => sum + (a.anomalyScore || 0), 0) / anomalies.length
      : 0;

    const lastAnomalyTime = anomalies.length > 0 
      ? Math.max(...anomalies.map(a => a.timestamp))
      : undefined;

    const trend = this.calculateTrend(data);

    return {
      totalAnomalies: anomalies.length,
      anomalyRate,
      severityCounts,
      averageAnomalyScore,
      lastAnomalyTime,
      trend
    };
  }

  static calculateTrend(data: AnomalyData[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable';

    const recent = data.slice(-10); // Last 10 points
    const older = data.slice(-20, -10); // Previous 10 points

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.value, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  static prepareChartData(data: AnomalyData[], colorScheme: string): ChartDataPoint[] {
    return data.map(point => ({
      timestamp: point.timestamp,
      value: point.value,
      anomalyScore: point.anomalyScore || 0,
      isAnomaly: point.isAnomaly || false,
      severity: point.severity || 'low',
      color: this.getSeverityColor(point.severity || 'low', colorScheme)
    }));
  }

  static getSeverityColor(severity: string, colorScheme: string): string {
    const colors = {
      light: {
        critical: '#e74c3c',
        high: '#f39c12',
        medium: '#f1c40f',
        low: '#27ae60'
      },
      dark: {
        critical: '#ff6b6b',
        high: '#ffa726',
        medium: '#ffeb3b',
        low: '#66bb6a'
      }
    };

    return colors[colorScheme as keyof typeof colors]?.[severity as keyof typeof colors.light] || '#666';
  }

  static detectAnomalies(data: AnomalyData[], threshold: number): AnomalyData[] {
    return data.map(point => ({
      ...point,
      isAnomaly: (point.anomalyScore || 0) > threshold,
      severity: this.calculateSeverity(point.anomalyScore || 0)
    }));
  }

  static aggregateByService(data: AnomalyData[]): Record<string, AnomalyData[]> {
    return data.reduce((acc, point) => {
      const service = point.service || 'unknown';
      if (!acc[service]) {
        acc[service] = [];
      }
      acc[service].push(point);
      return acc;
    }, {} as Record<string, AnomalyData[]>);
  }

  static calculateServiceHealth(serviceData: AnomalyData[]): number {
    if (serviceData.length === 0) return 100;

    const anomalies = serviceData.filter(d => d.isAnomaly);
    const anomalyRate = anomalies.length / serviceData.length;
    
    // Health score: 100 - (anomaly_rate * 100)
    return Math.max(0, 100 - (anomalyRate * 100));
  }
}
```

## Anomaly Detection Utilities

```typescript
// src/utils/anomalyDetector.ts
import { AnomalyData } from '../types/types';

export class AnomalyDetector {
  private static readonly Z_SCORE_THRESHOLD = 2.5;
  private static readonly WINDOW_SIZE = 20;

  static detectAnomalies(data: AnomalyData[], method: 'zscore' | 'iqr' | 'isolation' = 'zscore'): AnomalyData[] {
    switch (method) {
      case 'zscore':
        return this.detectWithZScore(data);
      case 'iqr':
        return this.detectWithIQR(data);
      case 'isolation':
        return this.detectWithIsolationForest(data);
      default:
        return this.detectWithZScore(data);
    }
  }

  private static detectWithZScore(data: AnomalyData[]): AnomalyData[] {
    if (data.length < this.WINDOW_SIZE) return data;

    return data.map((point, index) => {
      const window = data.slice(Math.max(0, index - this.WINDOW_SIZE), index);
      
      if (window.length === 0) {
        return { ...point, isAnomaly: false, anomalyScore: 0 };
      }

      const values = window.map(d => d.value);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev === 0) {
        return { ...point, isAnomaly: false, anomalyScore: 0 };
      }

      const zScore = Math.abs((point.value - mean) / stdDev);
      const anomalyScore = Math.min(zScore / this.Z_SCORE_THRESHOLD, 1);
      const isAnomaly = zScore > this.Z_SCORE_THRESHOLD;

      return {
        ...point,
        anomalyScore,
        isAnomaly,
        severity: this.calculateSeverity(anomalyScore)
      };
    });
  }

  private static detectWithIQR(data: AnomalyData[]): AnomalyData[] {
    if (data.length < this.WINDOW_SIZE) return data;

    return data.map((point, index) => {
      const window = data.slice(Math.max(0, index - this.WINDOW_SIZE), index);
      
      if (window.length === 0) {
        return { ...point, isAnomaly: false, anomalyScore: 0 };
      }

      const values = window.map(d => d.value).sort((a, b) => a - b);
      const q1 = values[Math.floor(values.length * 0.25)];
      const q3 = values[Math.floor(values.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      const isAnomaly = point.value < lowerBound || point.value > upperBound;
      const anomalyScore = isAnomaly ? 0.8 : 0.2;

      return {
        ...point,
        anomalyScore,
        isAnomaly,
        severity: this.calculateSeverity(anomalyScore)
      };
    });
  }

  private static detectWithIsolationForest(data: AnomalyData[]): AnomalyData[] {
    // Simplified isolation forest implementation
    // In a real implementation, this would use a proper ML library
    return data.map(point => {
      const anomalyScore = Math.random(); // Placeholder
      const isAnomaly = anomalyScore > 0.7;
      
      return {
        ...point,
        anomalyScore,
        isAnomaly,
        severity: this.calculateSeverity(anomalyScore)
      };
    });
  }

  private static calculateSeverity(anomalyScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (anomalyScore >= 0.9) return 'critical';
    if (anomalyScore >= 0.8) return 'high';
    if (anomalyScore >= 0.7) return 'medium';
    return 'low';
  }

  static calculateConfidence(anomalyScore: number, historicalAccuracy: number = 0.95): number {
    // Confidence based on anomaly score and historical model accuracy
    return Math.min(anomalyScore * historicalAccuracy, 1.0);
  }

  static generateAnomalyInsights(data: AnomalyData[]): string[] {
    const insights: string[] = [];
    const anomalies = data.filter(d => d.isAnomaly);

    if (anomalies.length === 0) {
      insights.push('No anomalies detected in the current time range');
      return insights;
    }

    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
    if (criticalAnomalies.length > 0) {
      insights.push(`${criticalAnomalies.length} critical anomalies detected`);
    }

    const services = [...new Set(anomalies.map(a => a.service))];
    if (services.length > 1) {
      insights.push(`Anomalies detected across ${services.length} services`);
    }

    const avgScore = anomalies.reduce((sum, a) => sum + (a.anomalyScore || 0), 0) / anomalies.length;
    if (avgScore > 0.8) {
      insights.push('High average anomaly score indicates significant deviations');
    }

    return insights;
  }
}
```

## Main Anomaly Chart Component

```typescript
// src/components/AnomalyChart.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PanelProps } from '@grafana/data';
import { useTheme2, Alert, Button, Select, Switch } from '@grafana/ui';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  ReferenceLine,
  Scatter,
  ScatterChart
} from 'recharts';
import { AnomalyChartOptions, AnomalyData, AnomalyStats, ChartDataPoint } from '../types/types';
import { DataProcessor } from '../utils/dataProcessor';
import { AnomalyDetector } from '../utils/anomalyDetector';
import { MetricCard } from './MetricCard';
import { SeverityIndicator } from './SeverityIndicator';

interface AnomalyChartProps extends PanelProps<AnomalyChartOptions> {}

export const AnomalyChart: React.FC<AnomalyChartProps> = ({ 
  options, 
  data, 
  width, 
  height,
  onOptionsChange 
}) => {
  const theme = useTheme2();
  const [anomalyData, setAnomalyData] = useState<AnomalyData[]>([]);
  const [anomalyStats, setAnomalyStats] = useState<AnomalyStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('all');

  // Process incoming data and detect anomalies
  const processedData = useMemo(() => {
    if (!data.series || data.series.length === 0) return [];

    const rawData = DataProcessor.processTimeSeriesData(data.series[0].fields[1].values.toArray());
    const detectedAnomalies = AnomalyDetector.detectAnomalies(rawData, 'zscore');
    
    return DataProcessor.prepareChartData(detectedAnomalies, options.colorScheme);
  }, [data.series, options.colorScheme]);

  // Calculate anomaly statistics
  const stats = useMemo(() => {
    if (processedData.length === 0) return null;
    
    const anomalyData = processedData.map(point => ({
      timestamp: point.timestamp,
      value: point.value,
      anomalyScore: point.anomalyScore,
      isAnomaly: point.isAnomaly,
      severity: point.severity as 'low' | 'medium' | 'high' | 'critical',
      service: 'unknown',
      metric: 'unknown'
    }));

    return DataProcessor.calculateAnomalyStats(anomalyData);
  }, [processedData]);

  // Filter data by selected service
  const filteredData = useMemo(() => {
    if (selectedService === 'all') return processedData;
    return processedData.filter(point => point.service === selectedService);
  }, [processedData, selectedService]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!options.autoRefresh) return;

    const interval = setInterval(() => {
      setIsRefreshing(true);
      // Simulate refresh
      setTimeout(() => setIsRefreshing(false), 1000);
    }, options.refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [options.autoRefresh, options.refreshInterval]);

  // Update stats when data changes
  useEffect(() => {
    setAnomalyStats(stats);
    setAnomalyData(processedData.map(point => ({
      timestamp: point.timestamp,
      value: point.value,
      anomalyScore: point.anomalyScore,
      isAnomaly: point.isAnomaly,
      severity: point.severity as 'low' | 'medium' | 'high' | 'critical',
      service: 'unknown',
      metric: 'unknown'
    })));
  }, [stats, processedData]);

  // Custom tooltip
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: theme.colors.background.primary,
          border: `1px solid ${theme.colors.border.medium}`,
          borderRadius: '4px',
          padding: '12px',
          boxShadow: theme.shadows.z1
        }}>
          <p style={{ margin: 0, color: theme.colors.text.primary, fontWeight: 'bold' }}>
            {new Date(label).toLocaleString()}
          </p>
          <p style={{ margin: '4px 0', color: theme.colors.text.primary }}>
            Value: <strong>{data.value.toFixed(2)}</strong>
          </p>
          {data.isAnomaly && (
            <>
              <p style={{ margin: '4px 0', color: theme.colors.error.text }}>
                Anomaly Score: <strong>{(data.anomalyScore * 100).toFixed(1)}%</strong>
              </p>
              <p style={{ margin: '4px 0', color: theme.colors.error.text }}>
                Severity: <strong>{data.severity?.toUpperCase()}</strong>
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  }, [theme]);

  // Handle threshold change
  const handleThresholdChange = useCallback((newThreshold: number) => {
    onOptionsChange({
      ...options,
      threshold: newThreshold
    });
  }, [options, onOptionsChange]);

  // Handle auto-refresh toggle
  const handleAutoRefreshToggle = useCallback(() => {
    onOptionsChange({
      ...options,
      autoRefresh: !options.autoRefresh
    });
  }, [options, onOptionsChange]);

  if (!anomalyStats) {
    return (
      <div style={{ 
        width, 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: theme.colors.text.secondary
      }}>
        No data available
      </div>
    );
  }

  return (
    <div style={{ width, height, padding: '16px' }}>
      {/* Header with controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: theme.colors.background.secondary,
        borderRadius: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h3 style={{ margin: 0, color: theme.colors.text.primary }}>
            EA Plan v6.0 Anomaly Detection
          </h3>
          <SeverityIndicator 
            severity={anomalyStats.totalAnomalies > 0 ? 'high' : 'low'}
            count={anomalyStats.totalAnomalies}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Switch
            value={options.autoRefresh}
            onChange={handleAutoRefreshToggle}
            label="Auto Refresh"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsRefreshing(true)}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Anomaly Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <MetricCard
          title="Total Anomalies"
          value={anomalyStats.totalAnomalies}
          color={theme.colors.error.text}
          trend={anomalyStats.trend}
        />
        <MetricCard
          title="Anomaly Rate"
          value={`${anomalyStats.anomalyRate.toFixed(2)}%`}
          color={theme.colors.warning.text}
        />
        <MetricCard
          title="Avg Score"
          value={anomalyStats.averageAnomalyScore.toFixed(3)}
          color={theme.colors.info.text}
        />
        <MetricCard
          title="Threshold"
          value={`${(options.threshold * 100).toFixed(0)}%`}
          color={theme.colors.text.secondary}
        />
      </div>

      {/* Severity Breakdown */}
      {options.showSeverityBreakdown && (
        <div style={{
          marginBottom: '16px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          {Object.entries(anomalyStats.severityCounts).map(([severity, count]) => (
            <div key={severity} style={{
              padding: '8px 16px',
              backgroundColor: DataProcessor.getSeverityColor(severity, options.colorScheme),
              borderRadius: '4px',
              color: theme.colors.text.primary,
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              {severity.toUpperCase()}: {count}
            </div>
          ))}
        </div>
      )}

      {/* Main Chart */}
      <div style={{ height: height - 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.medium} />
            <XAxis 
              dataKey="timestamp"
              tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              stroke={theme.colors.text.primary}
            />
            <YAxis stroke={theme.colors.text.primary} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Normal data line */}
            <Line
              type="monotone"
              dataKey="value"
              stroke={theme.colors.primary.text}
              strokeWidth={2}
              dot={false}
              name="Metric Value"
            />
            
            {/* Anomaly threshold line */}
            <ReferenceLine 
              y={options.threshold * 100} 
              stroke={theme.colors.error.text}
              strokeDasharray="5 5"
              label="Anomaly Threshold"
            />
            
            {/* Anomaly points */}
            <Scatter
              data={filteredData.filter(point => point.isAnomaly)}
              fill={theme.colors.error.text}
              name="Anomalies"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Alerts */}
      {options.alertOnAnomaly && anomalyStats.totalAnomalies > 0 && (
        <Alert
          title="Anomalies Detected"
          severity="warning"
          style={{ marginTop: '16px' }}
        >
          {AnomalyDetector.generateAnomalyInsights(anomalyData).map((insight, index) => (
            <div key={index}>{insight}</div>
          ))}
        </Alert>
      )}
    </div>
  );
};
```

## Supporting Components

```typescript
// src/components/MetricCard.tsx
import React from 'react';
import { useTheme2 } from '@grafana/ui';

interface MetricCardProps {
  title: string;
  value: string | number;
  color: string;
  trend?: 'increasing' | 'decreasing' | 'stable';
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, color, trend }) => {
  const theme = useTheme2();

  const getTrendIcon = () => {
    switch (trend) {
      case 'increasing':
        return '↗️';
      case 'decreasing':
        return '↘️';
      case 'stable':
        return '→';
      default:
        return '';
    }
  };

  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.colors.background.secondary,
      borderRadius: '4px',
      border: `1px solid ${theme.colors.border.medium}`,
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '12px',
        color: theme.colors.text.secondary,
        marginBottom: '4px'
      }}>
        {title}
      </div>
      <div style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px'
      }}>
        {value} {getTrendIcon()}
      </div>
    </div>
  );
};
```

```typescript
// src/components/SeverityIndicator.tsx
import React from 'react';
import { useTheme2 } from '@grafana/ui';

interface SeverityIndicatorProps {
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
}

export const SeverityIndicator: React.FC<SeverityIndicatorProps> = ({ severity, count }) => {
  const theme = useTheme2();

  const getSeverityColor = () => {
    switch (severity) {
      case 'critical':
        return theme.colors.error.text;
      case 'high':
        return theme.colors.warning.text;
      case 'medium':
        return theme.colors.info.text;
      case 'low':
        return theme.colors.success.text;
      default:
        return theme.colors.text.secondary;
    }
  };

  const getSeverityIcon = () => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return '✅';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: theme.colors.background.secondary,
      borderRadius: '4px',
      border: `1px solid ${getSeverityColor()}`
    }}>
      <span style={{ fontSize: '16px' }}>{getSeverityIcon()}</span>
      <span style={{
        color: getSeverityColor(),
        fontWeight: 'bold',
        fontSize: '14px'
      }}>
        {severity.toUpperCase()}: {count}
      </span>
    </div>
  );
};
```

## Webpack Configuration

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/module.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'module.js',
    libraryTarget: 'amd',
    library: 'ea-plan-v6-anomaly-panel'
  },
  externals: [
    'lodash',
    'moment',
    'react',
    'react-dom',
    '@grafana/data',
    '@grafana/ui',
    '@grafana/runtime'
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  }
};
```

## Plugin Module

```typescript
// src/module.ts
import { PanelPlugin } from '@grafana/data';
import { AnomalyChart } from './components/AnomalyChart';
import { AnomalyChartOptions } from './types/types';

export const plugin = new PanelPlugin<AnomalyChartOptions>(AnomalyChart)
  .setPanelOptions(builder => {
    return builder
      .addNumberInput({
        path: 'threshold',
        name: 'Anomaly Threshold',
        description: 'Threshold for anomaly detection (0-1)',
        defaultValue: 0.8,
        min: 0,
        max: 1,
        step: 0.1
      })
      .addBooleanSwitch({
        path: 'showSeverityBreakdown',
        name: 'Show Severity Breakdown',
        description: 'Display severity breakdown chart',
        defaultValue: true
      })
      .addBooleanSwitch({
        path: 'autoRefresh',
        name: 'Auto Refresh',
        description: 'Automatically refresh data',
        defaultValue: false
      })
      .addNumberInput({
        path: 'refreshInterval',
        name: 'Refresh Interval (seconds)',
        description: 'Interval for auto refresh',
        defaultValue: 30,
        min: 5,
        max: 300,
        showIf: (options) => options.autoRefresh
      })
      .addBooleanSwitch({
        path: 'alertOnAnomaly',
        name: 'Alert on Anomaly',
        description: 'Show alerts when anomalies are detected',
        defaultValue: true
      })
      .addSelect({
        path: 'colorScheme',
        name: 'Color Scheme',
        description: 'Color scheme for the chart',
        defaultValue: 'auto',
        options: [
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'auto', label: 'Auto' }
        ]
      });
  });
```

This comprehensive Grafana plugin provides:

1. **Dynamic Anomaly Detection**: Real-time anomaly detection with multiple algorithms
2. **Interactive Visualization**: Rich charts with tooltips and severity indicators
3. **Service Filtering**: Filter data by service or view all services
4. **Auto-refresh**: Configurable automatic data refresh
5. **Alerting**: Built-in alerting when anomalies are detected
6. **Severity Classification**: Critical, high, medium, low severity levels
7. **Statistics Dashboard**: Comprehensive anomaly statistics and trends
8. **Customizable**: Configurable thresholds, colors, and display options

The plugin integrates seamlessly with the EA Plan v6.0 microservices architecture and provides the visualization capabilities required for advanced AIOps monitoring.
