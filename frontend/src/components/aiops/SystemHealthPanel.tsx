"use client";
import { useEffect, useState } from "react";
import { apiMethods, getErrorMessage } from "@/api/client";

interface HealthData {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  database: "connected" | "disconnected";
  memory: {
    used: number;
    total: number;
  };
  services: {
    database: boolean;
    redis: boolean;
    openai: boolean;
    lighthouse: boolean;
  };
}

export default function SystemHealthPanel() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Health endpoint is at /health (not /api/v1/health)
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${baseUrl}/health`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json() as HealthData;
        setHealthData(data);
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Poll every 30 seconds
    const intervalId = setInterval(fetchData, 30000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="p-4 rounded bg-white border-2 border-gray-200 animate-pulse">
        <h2 className="font-bold text-lg mb-2">System Health</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded bg-red-50 border-2 border-red-300">
        <h2 className="font-bold text-lg mb-2">System Health</h2>
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="p-4 rounded bg-white border-2 border-gray-200">
        <h2 className="font-bold text-lg mb-2">System Health</h2>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  // Ensure services object exists with defaults (in case of error response)
  const services = healthData.services || {
    database: false,
    redis: false,
    openai: false,
    lighthouse: false,
  };

  const isHealthy = healthData.status === "healthy";
  const memoryUsagePercent = Math.round(
    (healthData.memory.used / healthData.memory.total) * 100
  );

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return (
    <div
      className={`p-4 rounded border-2 ${
        isHealthy
          ? "bg-green-50 border-green-300"
          : "bg-red-50 border-red-300"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-lg">System Health</h2>
          <p
            className={`font-semibold text-sm ${
              isHealthy ? "text-green-700" : "text-red-700"
            }`}
          >
            {isHealthy ? "✅ All Systems Operational" : "⚠️ System Issues Detected"}
          </p>
        </div>
        <span className="text-2xl">{isHealthy ? "✅" : "⚠️"}</span>
      </div>

      <div className="space-y-3 text-sm">
        {/* Services Status */}
        <div>
          <p className="font-semibold text-gray-700 mb-2">Services:</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <span className={services.database ? "text-green-600" : "text-red-600"}>
                {services.database ? "✅" : "❌"}
              </span>
              <span className="text-gray-600">Database</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={services.redis ? "text-green-600" : "text-red-600"}>
                {services.redis ? "✅" : "❌"}
              </span>
              <span className="text-gray-600">Redis</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={services.openai ? "text-green-600" : "text-red-600"}>
                {services.openai ? "✅" : "❌"}
              </span>
              <span className="text-gray-600">OpenAI</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={services.lighthouse ? "text-green-600" : "text-red-600"}>
                {services.lighthouse ? "✅" : "❌"}
              </span>
              <span className="text-gray-600">Lighthouse</span>
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold text-gray-700">Memory:</span>
            <span className="text-gray-600">{memoryUsagePercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                memoryUsagePercent > 80
                  ? "bg-red-500"
                  : memoryUsagePercent > 60
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${memoryUsagePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{healthData.memory.used} MB</span>
            <span>{healthData.memory.total} MB</span>
          </div>
        </div>

        {/* System Info */}
        <div className="space-y-1 pt-2 border-t border-gray-300">
          <div className="flex justify-between">
            <span className="text-gray-600">Uptime:</span>
            <span className="font-mono text-xs">{formatUptime(healthData.uptime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Version:</span>
            <span className="font-mono text-xs">{healthData.version}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Environment:</span>
            <span className="font-mono text-xs uppercase">{healthData.environment}</span>
          </div>
        </div>

        {/* Last Update */}
        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-300">
          <span>Last update: {new Date(healthData.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}

