"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/api/client";
import { getErrorMessage } from "@/api/client";

interface TelemetryData {
  timestamp: number;
  avgLatency: number;
  drift: boolean;
  metrics: {
    avgLatency: number;
    predictedLatency: number;
    driftPercentage: number;
  };
}

export default function DriftPanel() {
  const [drift, setDrift] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TelemetryData | null>(null);
  const retryCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<{ success: boolean; data?: TelemetryData }>("/aiops/collect");
        const result = response.data;
        
        if (result.success && result.data) {
          const telemetryData = result.data;
          setData(telemetryData);
          setDrift(telemetryData.drift);
          retryCountRef.current = 0; // Reset retry count on success
        }
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err);
        console.error("Error fetching AIOps data:", err);
        
        // Handle 429 (Too Many Requests) with exponential backoff
        if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
          retryCountRef.current += 1;
          const backoffDelay = Math.min(300000, 60000 * Math.pow(2, retryCountRef.current)); // Max 5 minutes
          
          setError(`Rate limit exceeded. Retrying in ${Math.round(backoffDelay / 1000)}s...`);
          
          // Clear existing interval
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          
          // Schedule retry with exponential backoff
          setTimeout(() => {
            fetchData();
            // Resume normal polling after successful retry
            if (!intervalRef.current) {
              intervalRef.current = setInterval(fetchData, 120000); // 2 minutes instead of 1
            }
          }, backoffDelay);
          
          setLoading(false); // Allow UI to show error state
          return;
        } else {
          setError(errorMessage);
          retryCountRef.current = 0;
        }
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Poll every 2 minutes (reduced from 1 minute to avoid rate limiting)
    intervalRef.current = setInterval(fetchData, 120000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (loading && !data) {
    return (
      <div className="p-4 rounded bg-gray-100 animate-pulse">
        <h2 className="font-bold text-lg">AIOps Drift Monitor</h2>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded ${
        drift ? "bg-red-200 border-2 border-red-500" : "bg-green-200 border-2 border-green-500"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">AIOps Drift Monitor</h2>
          <p className={`font-semibold ${drift ? "text-red-700" : "text-green-700"}`}>
            {drift ? "⚠️ Drift Detected" : "✅ Stable"}
          </p>
          {error && (
            <p className="text-xs text-orange-600 mt-1">{error}</p>
          )}
        </div>
        {drift && (
          <span className="text-2xl animate-pulse">⚠️</span>
        )}
      </div>

      {data && (
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Avg Latency:</span>
            <span className="font-mono">{data.avgLatency.toFixed(3)}s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Predicted:</span>
            <span className="font-mono">{data.metrics.predictedLatency.toFixed(3)}s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Drift %:</span>
            <span className={`font-mono ${Math.abs(data.metrics.driftPercentage) > 5 ? "text-red-600" : "text-green-600"}`}>
              {data.metrics.driftPercentage > 0 ? "+" : ""}
              {data.metrics.driftPercentage.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Last update:</span>
            <span>{new Date(data.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
