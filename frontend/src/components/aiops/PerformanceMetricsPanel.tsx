"use client";
import { useEffect, useState } from "react";
import { api, getErrorMessage } from "@/api/client";

interface MetricData {
  name: string;
  value: number;
  labels?: Record<string, string>;
}

interface PerformanceData {
  httpRequests: {
    total: number;
    inProgress: number;
    avgDuration: number;
  };
  system: {
    cpuUsage?: number;
    memoryUsage?: number;
    nodejsMemoryUsage?: number;
  };
  database: {
    activeConnections: number;
  };
  seo: {
    analysisTotal: number;
    contentGenerationTotal: number;
    alertsTotal: number;
  };
}

export default function PerformanceMetricsPanel() {
  const [metrics, setMetrics] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get("/metrics", {
          responseType: "text",
        });
        const parsedMetrics = parsePrometheusMetrics(res.data);
        setMetrics(parsedMetrics);
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Poll every 15 seconds (metrics update more frequently)
    const intervalId = setInterval(fetchData, 15000);

    return () => clearInterval(intervalId);
  }, []);

  const parsePrometheusMetrics = (text: string): PerformanceData => {
    const lines = text.split("\n").filter((line) => line && !line.startsWith("#"));
    
    const data: PerformanceData = {
      httpRequests: {
        total: 0,
        inProgress: 0,
        avgDuration: 0,
      },
      system: {},
      database: {
        activeConnections: 0,
      },
      seo: {
        analysisTotal: 0,
        contentGenerationTotal: 0,
        alertsTotal: 0,
      },
    };

    let totalDuration = 0;
    let durationCount = 0;

    lines.forEach((line) => {
      // HTTP Requests Total
      if (line.startsWith("http_requests_total")) {
        const match = line.match(/http_requests_total\{[^}]*\}\s+(\d+)/);
        if (match) {
          data.httpRequests.total += parseFloat(match[1]);
        }
      }

      // HTTP Requests In Progress
      if (line.startsWith("http_requests_in_progress")) {
        const match = line.match(/http_requests_in_progress\{[^}]*\}\s+(\d+)/);
        if (match) {
          data.httpRequests.inProgress += parseFloat(match[1]);
        }
      }

      // HTTP Request Duration
      if (line.startsWith("http_request_duration_seconds")) {
        const match = line.match(/http_request_duration_seconds\{[^}]*\}\s+([\d.]+)/);
        if (match) {
          totalDuration += parseFloat(match[1]);
          durationCount++;
        }
      }

      // Database Connections
      if (line.startsWith("database_connections_active")) {
        const match = line.match(/database_connections_active\s+(\d+)/);
        if (match) {
          data.database.activeConnections = parseFloat(match[1]);
        }
      }

      // System Memory (Node.js)
      if (line.startsWith("process_resident_memory_bytes")) {
        const match = line.match(/process_resident_memory_bytes\s+(\d+)/);
        if (match) {
          data.system.memoryUsage = parseFloat(match[1]) / 1024 / 1024; // Convert to MB
        }
      }

      // SEO Metrics
      if (line.startsWith("seo_analysis_total")) {
        const match = line.match(/seo_analysis_total\{[^}]*\}\s+(\d+)/);
        if (match) {
          data.seo.analysisTotal += parseFloat(match[1]);
        }
      }

      if (line.startsWith("content_generation_total")) {
        const match = line.match(/content_generation_total\{[^}]*\}\s+(\d+)/);
        if (match) {
          data.seo.contentGenerationTotal += parseFloat(match[1]);
        }
      }

      if (line.startsWith("seo_alerts_total")) {
        const match = line.match(/seo_alerts_total\{[^}]*\}\s+(\d+)/);
        if (match) {
          data.seo.alertsTotal += parseFloat(match[1]);
        }
      }
    });

    // Calculate average duration
    if (durationCount > 0) {
      data.httpRequests.avgDuration = totalDuration / durationCount;
    }

    return data;
  };

  if (loading) {
    return (
      <div className="p-4 rounded bg-white border-2 border-gray-200 animate-pulse">
        <h2 className="font-bold text-lg mb-2">Performance Metrics</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded bg-red-50 border-2 border-red-300">
        <h2 className="font-bold text-lg mb-2">Performance Metrics</h2>
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-4 rounded bg-white border-2 border-gray-200">
        <h2 className="font-bold text-lg mb-2">Performance Metrics</h2>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded bg-white border-2 border-blue-200 bg-blue-50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-lg">Performance Metrics</h2>
          <p className="text-blue-700 text-sm font-semibold">Real-time Monitoring</p>
        </div>
        <span className="text-2xl">📊</span>
      </div>

      <div className="space-y-4 text-sm">
        {/* HTTP Requests */}
        <div>
          <p className="font-semibold text-gray-700 mb-2">HTTP Requests:</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Requests:</span>
              <span className="font-mono font-semibold">{metrics.httpRequests.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">In Progress:</span>
              <span
                className={`font-mono font-semibold ${
                  metrics.httpRequests.inProgress > 10 ? "text-orange-600" : "text-green-600"
                }`}
              >
                {metrics.httpRequests.inProgress}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg Duration:</span>
              <span className="font-mono font-semibold">
                {(metrics.httpRequests.avgDuration * 1000).toFixed(2)}ms
              </span>
            </div>
          </div>
        </div>

        {/* Database */}
        <div className="pt-2 border-t border-gray-300">
          <p className="font-semibold text-gray-700 mb-2">Database:</p>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Active Connections:</span>
            <span
              className={`font-mono font-semibold ${
                metrics.database.activeConnections > 50
                  ? "text-red-600"
                  : metrics.database.activeConnections > 20
                  ? "text-orange-600"
                  : "text-green-600"
              }`}
            >
              {metrics.database.activeConnections}
            </span>
          </div>
        </div>

        {/* SEO Metrics */}
        <div className="pt-2 border-t border-gray-300">
          <p className="font-semibold text-gray-700 mb-2">SEO Operations:</p>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Analyses:</span>
              <span className="font-mono text-xs">{metrics.seo.analysisTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Content Generated:</span>
              <span className="font-mono text-xs">{metrics.seo.contentGenerationTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Alerts:</span>
              <span className="font-mono text-xs">{metrics.seo.alertsTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* System Memory */}
        {metrics.system.memoryUsage && (
          <div className="pt-2 border-t border-gray-300">
            <p className="font-semibold text-gray-700 mb-2">System:</p>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Memory:</span>
              <span className="font-mono text-xs">{metrics.system.memoryUsage.toFixed(2)} MB</span>
            </div>
          </div>
        )}

        {/* Last Update */}
        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-300">
          <span>Updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}

