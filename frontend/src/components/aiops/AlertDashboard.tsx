"use client";

import { useEffect, useState } from "react";

interface Alert {
  id: string;
  metric: string;
  severity: "critical" | "high" | "medium" | "low";
  anomalyScore: number;
  context?: Record<string, unknown>;
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

interface AlertStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved: number;
  unresolved: number;
}

export default function AlertDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (filterSeverity !== "all") {
        params.append("severity", filterSeverity);
      }
      params.append("limit", "50");

      const res = await fetch(`/api/v1/aiops/anomalies/alerts?${params}`);
      const result = await res.json();

      if (result.success) {
        let filteredAlerts = result.alerts || [];

        // Filter by status
        if (filterStatus === "resolved") {
          filteredAlerts = filteredAlerts.filter((a: Alert) => a.resolvedAt);
        } else if (filterStatus === "unresolved") {
          filteredAlerts = filteredAlerts.filter((a: Alert) => !a.resolvedAt);
        }

        setAlerts(filteredAlerts);
      } else {
        setError(result.error || "Failed to fetch alerts");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch alerts");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/v1/aiops/anomalies/alerts/stats?timeRange=24h");
      const result = await res.json();

      if (result.success && result.stats) {
        setStats(result.stats);
      }
    } catch (err) {
      console.error("Error fetching alert stats:", err);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/v1/aiops/anomalies/alerts/${alertId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resolvedBy: "user", // TODO: Get from auth context
        }),
      });

      const result = await res.json();

      if (result.success) {
        // Refresh alerts
        await fetchAlerts();
        await fetchStats();
      } else {
        setError(result.error || "Failed to resolve alert");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve alert");
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchStats();

    // Poll every 30 seconds
    const intervalId = setInterval(() => {
      fetchAlerts();
      fetchStats();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [filterSeverity, filterStatus]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="p-6 rounded-lg bg-white border-2 border-gray-200">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-white border-2 border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Total Alerts</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="p-4 rounded-lg bg-white border-2 border-red-200">
            <div className="text-sm text-gray-600 mb-1">Critical</div>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </div>
          <div className="p-4 rounded-lg bg-white border-2 border-orange-200">
            <div className="text-sm text-gray-600 mb-1">High</div>
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
          </div>
          <div className="p-4 rounded-lg bg-white border-2 border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Unresolved</div>
            <div className="text-2xl font-bold text-gray-900">{stats.unresolved}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Severity:</label>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="unresolved">Unresolved</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <button
          onClick={() => {
            fetchAlerts();
            fetchStats();
          }}
          className="px-4 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
          {error}
        </div>
      )}

      {/* Alerts List */}
      <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Active Alerts</h2>
          <p className="text-sm text-gray-600">
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""} found
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No alerts found matching your filters.
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-semibold border ${getSeverityColor(
                          alert.severity
                        )}`}
                      >
                        {alert.severity.toUpperCase()}
                      </span>
                      {alert.resolvedAt && (
                        <span className="px-2 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
                          RESOLVED
                        </span>
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {alert.metric}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Anomaly Score: <span className="font-semibold">{alert.anomalyScore.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Created: {formatTimestamp(alert.createdAt)}
                      {alert.resolvedAt && (
                        <>
                          {" • "}
                          Resolved: {formatTimestamp(alert.resolvedAt)}
                          {alert.resolvedBy && ` by ${alert.resolvedBy}`}
                        </>
                      )}
                    </div>
                    {alert.context && Object.keys(alert.context).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          View Context
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(alert.context, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  {!alert.resolvedAt && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="ml-4 px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
