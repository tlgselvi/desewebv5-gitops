"use client";
import { useEffect, useState } from "react";

interface RemediationEvent {
  timestamp: number;
  metric: string;
  action: string;
  severity: "low" | "medium" | "high";
  status: "executed" | "pending" | "failed";
}

interface ReplayResponse {
  success: boolean;
  count: number;
  events: RemediationEvent[];
}

export default function ReplayTimeline() {
  const [events, setEvents] = useState<RemediationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/v1/aiops/remediation-log");
        if (!res.ok) {
          throw new Error("Failed to fetch remediation log");
        }
        const data: ReplayResponse = await res.json();
        if (data.success) {
          setEvents(data.events);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600 bg-red-100";
      case "medium":
        return "text-orange-600 bg-orange-100";
      case "low":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "executed":
        return "✅";
      case "pending":
        return "⏳";
      case "failed":
        return "❌";
      default:
        return "❓";
    }
  };

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <h2 className="font-bold text-lg mb-2">Auto-Remediation Replay</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50">
        <h2 className="font-bold text-lg mb-2">Auto-Remediation Replay</h2>
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">Auto-Remediation Replay</h2>
        {events.length > 0 && (
          <span className="text-sm text-gray-500">
            {events.length} {events.length === 1 ? "event" : "events"}
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <p className="text-gray-500">No remediation actions logged.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events.map((event, i) => (
            <div
              key={i}
              className="border-b py-2 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(
                        event.severity
                      )}`}
                    >
                      {event.severity.toUpperCase()}
                    </span>
                    <span className="text-lg">{getStatusIcon(event.status)}</span>
                  </div>
                  <p className="text-sm">
                    <b className="text-gray-900">{event.metric}</b>: {event.action}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
