'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Activity, AlertTriangle, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react'
import { MetricCard } from '../../components/ui/MetricCard'
import dynamic from 'next/dynamic'
import { apiClient, type AIOpsMetrics } from '../../lib/api/client'

const TrendChart = dynamic(() => import('../../components/ui/TrendChart').then(m => m.TrendChart), { ssr: false })

export default function AIOpsDashboard() {
  const [error, setError] = useState<string | null>(null)

  // Fetch metrics with SWR for real-time updates
  const { data: metrics, isLoading } = useSWR<AIOpsMetrics>(
    'aiops-metrics',
    () => apiClient.getMetrics(),
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      onError: (err) => {
        console.error('Metrics fetch error:', err)
        setError('Failed to fetch metrics. Using mock data.')
        // Fallback to mock data
        return {
          anomalyCount: 3,
          correlationAccuracy: 0.89,
          remediationSuccess: 0.92,
          avgLatency: 187,
          errorRate: 0.007,
          uptime: 99.9,
          timestamp: new Date().toISOString()
        }
      }
    }
  )

  const anomalyCount = metrics?.anomalyCount ?? 0

  // Mock trend data for charts - using static timestamps to avoid Date.now() in render
  const trendData = [
    { timestamp: '2024-01-01T10:00:00Z', latency: 180, accuracy: 0.88 },
    { timestamp: '2024-01-01T10:05:00Z', latency: 185, accuracy: 0.89 },
    { timestamp: '2024-01-01T10:10:00Z', latency: 190, accuracy: 0.87 },
    { timestamp: '2024-01-01T10:15:00Z', latency: 187, accuracy: 0.89 },
    { timestamp: '2024-01-01T10:20:00Z', latency: 185, accuracy: 0.90 },
    { timestamp: '2024-01-01T10:25:00Z', latency: 187, accuracy: 0.89 },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">Loading metrics...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AIOps Dashboard</h1>
          <p className="text-muted-foreground">Real-time monitoring and anomaly detection</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Live</span>
          {metrics?.timestamp && (
            <span className="text-xs text-muted-foreground">
              Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Active Anomalies"
          value={anomalyCount}
          icon={AlertTriangle}
          status={anomalyCount > 5 ? 'error' : anomalyCount > 2 ? 'warning' : 'success'}
          trend="down"
          subtitle="Z-score based detection"
        />
        
        <MetricCard
          title="Correlation Accuracy"
          value={`${((metrics?.correlationAccuracy || 0) * 100).toFixed(1)}%`}
          icon={Activity}
          status={metrics?.correlationAccuracy && metrics.correlationAccuracy >= 0.85 ? 'success' : 'warning'}
          trend="up"
          subtitle="Event correlation engine"
        />
        
        <MetricCard
          title="Remediation Success"
          value={`${((metrics?.remediationSuccess || 0) * 100).toFixed(1)}%`}
          icon={CheckCircle}
          status={metrics?.remediationSuccess && metrics.remediationSuccess >= 0.9 ? 'success' : 'warning'}
          trend="stable"
          subtitle="Auto-remediation pipeline"
        />
        
        <MetricCard
          title="Avg Latency"
          value={`${metrics?.avgLatency || 0}ms`}
          icon={Clock}
          status={(metrics?.avgLatency ?? Infinity) < 250 ? 'success' : 'warning'}
          trend="down"
          subtitle="p95 response time"
        />
        
        <MetricCard
          title="Error Rate"
          value={`${((metrics?.errorRate || 0) * 100).toFixed(3)}%`}
          icon={XCircle}
          status={(metrics?.errorRate ?? 1) < 0.01 ? 'success' : 'warning'}
          trend="down"
          subtitle="HTTP error percentage"
        />
        
        <MetricCard
          title="Uptime"
          value={`${metrics?.uptime || 0}%`}
          icon={TrendingUp}
          status={(metrics?.uptime ?? 0) >= 99.9 ? 'success' : 'warning'}
          trend="stable"
          subtitle="System availability"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Latency Trend</h3>
          <TrendChart 
            data={trendData} 
            dataKey="latency" 
            color="#3b82f6"
            height={200}
          />
        </div>

        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Accuracy Trend</h3>
          <TrendChart 
            data={trendData} 
            dataKey="accuracy" 
            color="#10b981"
            height={200}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Anomalies</h3>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={16} className="text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">Anomaly #{i}</p>
                    <p className="text-xs text-muted-foreground">Z-score: 2.3</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">2m ago</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Anomaly Detection</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Operational</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Correlation Engine</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Operational</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Remediation Pipeline</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}