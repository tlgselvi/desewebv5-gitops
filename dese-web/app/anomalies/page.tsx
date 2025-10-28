'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Clock, CheckCircle, XCircle, Filter } from 'lucide-react'
import { apiClient, type AnomalyTimeline, type Anomaly } from '../../lib/api/client'

export default function AnomalyTimelinePage() {
  const [filter, setFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all')
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null)

  // Fetch anomaly timeline with SWR
  const { data: timeline, error, isLoading } = useSWR<AnomalyTimeline[]>(
    'anomaly-timeline',
    () => apiClient.getAnomalyTimeline(),
    {
      refreshInterval: 15000, // Refresh every 15 seconds
      revalidateOnFocus: true,
      onError: (err) => {
        console.error('Anomaly timeline fetch error:', err)
        // Return mock data on error
        return [
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            anomalies: [
              {
                id: '1',
                timestamp: new Date(Date.now() - 3000000).toISOString(),
                severity: 'high',
                type: 'Latency Spike',
                description: 'P95 latency increased by 150ms',
                zScore: 3.2,
                resolved: false
              },
              {
                id: '2',
                timestamp: new Date(Date.now() - 1800000).toISOString(),
                severity: 'medium',
                type: 'Error Rate',
                description: 'Error rate exceeded threshold',
                zScore: 2.1,
                resolved: true
              }
            ],
            totalCount: 2
          },
          {
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            anomalies: [
              {
                id: '3',
                timestamp: new Date(Date.now() - 900000).toISOString(),
                severity: 'critical',
                type: 'System Failure',
                description: 'Database connection timeout',
                zScore: 4.5,
                resolved: true
              }
            ],
            totalCount: 1
          }
        ]
      }
    }
  )

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return XCircle
      case 'high': return AlertTriangle
      case 'medium': return AlertTriangle
      case 'low': return AlertTriangle
      default: return AlertTriangle
    }
  }

  const filteredTimeline = timeline?.map(entry => ({
    ...entry,
    anomalies: entry.anomalies.filter(anomaly => 
      filter === 'all' || anomaly.severity === filter
    )
  })).filter(entry => entry.anomalies.length > 0) || []

  const totalAnomalies = timeline?.reduce((sum, entry) => sum + entry.anomalies.length, 0) || 0
  const unresolvedAnomalies = timeline?.reduce((sum, entry) => 
    sum + entry.anomalies.filter(a => !a.resolved).length, 0
  ) || 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">Loading anomaly timeline...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Anomaly Timeline</h1>
          <p className="text-muted-foreground">Real-time anomaly detection and resolution tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {totalAnomalies} total, {unresolvedAnomalies} unresolved
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-800">Using mock data - API endpoint not available</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Filter by severity:</span>
          <div className="flex gap-2">
            {(['all', 'low', 'medium', 'high', 'critical'] as const).map((severity) => (
              <button
                key={severity}
                onClick={() => setFilter(severity)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filter === severity
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        <AnimatePresence>
          {filteredTimeline.map((entry, index) => (
            <motion.div
              key={entry.timestamp}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border rounded-lg p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">
                  {new Date(entry.timestamp).toLocaleString()}
                </h3>
                <span className="text-sm text-muted-foreground">
                  ({entry.anomalies.length} anomalies)
                </span>
              </div>

              <div className="space-y-3">
                {entry.anomalies.map((anomaly) => {
                  const SeverityIcon = getSeverityIcon(anomaly.severity)
                  return (
                    <motion.div
                      key={anomaly.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.02 }}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${getSeverityColor(anomaly.severity)}`}
                      onClick={() => setSelectedAnomaly(anomaly)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <SeverityIcon size={20} />
                          <div>
                            <h4 className="font-medium">{anomaly.type}</h4>
                            <p className="text-sm opacity-80">{anomaly.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-medium">Z-Score: {anomaly.zScore}</p>
                            <p className="text-xs opacity-80">
                              {new Date(anomaly.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {anomaly.resolved ? (
                              <CheckCircle size={16} className="text-green-600" />
                            ) : (
                              <XCircle size={16} className="text-red-600" />
                            )}
                            <span className="text-xs">
                              {anomaly.resolved ? 'Resolved' : 'Active'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Anomaly Detail Modal */}
      <AnimatePresence>
        {selectedAnomaly && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setSelectedAnomaly(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border rounded-lg p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Anomaly Details</h3>
                <button
                  onClick={() => setSelectedAnomaly(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XCircle size={20} />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="text-sm">{selectedAnomaly.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm">{selectedAnomaly.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Severity</label>
                  <p className="text-sm capitalize">{selectedAnomaly.severity}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Z-Score</label>
                  <p className="text-sm">{selectedAnomaly.zScore}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="text-sm">{selectedAnomaly.resolved ? 'Resolved' : 'Active'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <p className="text-sm">{new Date(selectedAnomaly.timestamp).toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
