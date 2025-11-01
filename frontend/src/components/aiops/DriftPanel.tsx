"use client";
import { useEffect, useState } from "react";

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
  const [data, setData] = useState<TelemetryData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiMethods.get<{ success: boolean; data?: TelemetryData }>("/aiops/collect");
        
        if (result.success && result.data) {
          const telemetryData = result.data;
          setData(telemetryData);
          setDrift(telemetryData.drift);
        }
      } catch (error) {
        console.error("Error fetching AIOps data:", error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Poll every minute
    const intervalId = setInterval(fetchData, 60000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
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
