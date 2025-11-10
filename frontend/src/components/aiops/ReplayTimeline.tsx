"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/aiops/remediation-log");
      if (!res.ok) {
        throw new Error("Auto-remediation kayıtları alınamadı");
      }
      const data: ReplayResponse = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-400/40";
      case "medium":
        return "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-400/40";
      case "low":
        return "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-400/40";
      default:
        return "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-slate-700/40 dark:text-slate-200 dark:border-slate-600/40";
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

  if (loading && events.length === 0) {
    return (
      <Card className="space-y-4 bg-white dark:bg-slate-900">
        <Skeleton className="w-1/3" />
        <Skeleton className="w-1/2" />
        <Skeleton className="h-28" />
      </Card>
    );
  }

  if (error && events.length === 0) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-400/40 dark:bg-red-500/10">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-200">Auto-Remediation Replay</h2>
        <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-purple-100 p-2 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">
            <ArrowRightLeft className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Auto-Remediation Replay
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Jarvis otomasyon zincirinden geriye dönük eylemler
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {events.length > 0 && (
            <Badge variant="outline" className="text-xs text-purple-600">
              {events.length} kayıt
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Auto-remediation kayıtlarını yenile"
            onClick={fetchData}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-300/40 dark:bg-amber-500/10 dark:text-amber-200">
          {error}
        </div>
      )}

      <div className="mt-5 max-h-72 space-y-2 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <div className="rounded-lg bg-gray-50 px-4 py-6 text-center text-gray-500 dark:bg-slate-800 dark:text-slate-400">
            Henüz otomatik düzeltme kaydı bulunmuyor.
          </div>
        ) : (
          events.map((event, index) => (
            <div
              key={`${event.metric}-${event.timestamp}-${index}`}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-purple-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-purple-500/40"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                  <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                  <Badge variant="outline" className={cn("text-xs", getSeverityColor(event.severity))}>
                    {event.severity.toUpperCase()}
                  </Badge>
                  <span className="text-lg">{getStatusIcon(event.status)}</span>
                </div>
                <Badge variant="outline" className="text-xs text-gray-500 dark:border-slate-700 dark:text-slate-300">
                  {event.status.toUpperCase()}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
                <span className="font-semibold text-gray-900 dark:text-slate-100">{event.metric}</span>:{" "}
                {event.action}
              </p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
