'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface PerformanceMetrics {
  lcp: number
  tbt: number
  tti: number
  performance: number
  accessibility: number
  seo: number
  timestamp: string
}

interface AIOpsFeedbackProps {
  metrics?: PerformanceMetrics
}

export function AIOpsFeedback({ metrics }: AIOpsFeedbackProps) {
  const [drift, setDrift] = useState<number>(0)
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (!metrics) return

    // Calculate performance drift from baseline
    const baseline = {
      lcp: 2500,
      tbt: 200,
      tti: 3800,
      performance: 90,
      accessibility: 95,
      seo: 95,
    }

    const lcpDrift = ((metrics.lcp - baseline.lcp) / baseline.lcp) * 100
    const tbtDrift = ((metrics.tbt - baseline.tbt) / baseline.tbt) * 100
    const performanceDrift = ((metrics.performance - baseline.performance) / baseline.performance) * 100

    const avgDrift = (lcpDrift + tbtDrift + performanceDrift) / 3
    setDrift(avgDrift)

    // Generate optimization suggestions based on metrics
    const newSuggestions: string[] = []

    if (metrics.lcp > baseline.lcp) {
      newSuggestions.push('Consider preloading critical resources and optimizing images')
    }
    if (metrics.tbt > baseline.tbt) {
      newSuggestions.push('Implement code splitting and remove unused JavaScript')
    }
    if (metrics.tti > baseline.tti) {
      newSuggestions.push('Defer non-critical scripts and enable React concurrent rendering')
    }
    if (metrics.performance < baseline.performance) {
      newSuggestions.push('Enable Turbopack and optimize bundle size')
    }

    setSuggestions(newSuggestions)

    // Auto-alert if drift exceeds 10%
    if (avgDrift > 10) {
      // Send alert to monitoring system
      fetch('/api/metrics/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'performance_drift',
          severity: 'high',
          drift: avgDrift,
          metrics: metrics,
          timestamp: new Date().toISOString(),
          suggestions: newSuggestions
        })
      }).catch((error) => {
        logger.error('Failed to send AIOps alert', error, {
          type: 'performance_drift',
          severity: 'high',
          drift: avgDrift,
        });
      })

      // Log performance drift alert
      logger.warn(`AIOps Alert: Performance drift detected (${avgDrift.toFixed(1)}%)`, {
        metrics,
        suggestions: newSuggestions,
        drift: avgDrift,
      })
    }
  }, [metrics])

  const getDriftStatus = () => {
    if (drift > 10) return { status: 'error', icon: TrendingDown, color: 'text-red-500' }
    if (drift > 5) return { status: 'warning', icon: AlertTriangle, color: 'text-yellow-500' }
    return { status: 'success', icon: TrendingUp, color: 'text-green-500' }
  }

  const driftStatus = getDriftStatus()
  const StatusIcon = driftStatus.icon

  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">AIOps Performance Feedback</h3>
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-5 w-5 ${driftStatus.color}`} />
          <span className={`text-sm font-medium ${driftStatus.color}`}>
            {drift > 0 ? '+' : ''}{drift.toFixed(1)}% drift
          </span>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{metrics.lcp}ms</div>
            <div className="text-xs text-muted-foreground">LCP</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{metrics.tbt}ms</div>
            <div className="text-xs text-muted-foreground">TBT</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{metrics.performance}</div>
            <div className="text-xs text-muted-foreground">Performance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{metrics.accessibility}</div>
            <div className="text-xs text-muted-foreground">Accessibility</div>
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Optimization Suggestions:</h4>
          <ul className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <Activity className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {drift > 10 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-800">
              Performance regression detected! Consider immediate optimization.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
