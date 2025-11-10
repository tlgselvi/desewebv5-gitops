"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/aiops/collect");
      const result = await res.json();

      if (result.success && result.data) {
        const telemetryData: TelemetryData = result.data;
        setData(telemetryData);
        setDrift(telemetryData.drift);
      }
    } catch (error) {
      console.error("Error fetching AIOps data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 60000);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <Card className="space-y-3 bg-white dark:bg-slate-900">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton />
        <Skeleton className="w-3/4" />
      </Card>
    );
  }

  const statusIcon = drift ? (
    <AlertTriangle className="h-10 w-10 text-red-500" />
  ) : (
    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
  );

  const statusBadge = drift ? (
    <Badge variant="warning">Drift tespit edildi</Badge>
  ) : (
    <Badge variant="success">Stabil</Badge>
  );

  return (
    <Card
      variant="outlined"
      className={cn(
        "relative overflow-hidden border-2 bg-white dark:border-slate-800 dark:bg-slate-900",
        drift
          ? "border-red-200 bg-gradient-to-br from-red-50 via-white to-white dark:from-red-900/40 dark:via-slate-900"
          : "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-900/30 dark:via-slate-900",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
            AIOps Drift Monitor
          </p>
          <div className="flex items-center gap-3">
            {statusIcon}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
                {drift ? "Kyverno &amp; Prometheus senkron sapması" : "Kyverno politikaları dengede"}
              </h2>
              <div className="mt-2 flex items-center gap-2">{statusBadge}</div>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Drift verisini yenile"
          onClick={fetchData}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {data && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-slate-800/60">
            <p className="text-xs uppercase text-gray-500 dark:text-slate-400">Gerçeklenen gecikme</p>
            <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
              {data.avgLatency.toFixed(3)}s
            </p>
          </div>
          <div className="rounded-xl bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-slate-800/60">
            <p className="text-xs uppercase text-gray-500 dark:text-slate-400">Tahmin edilen</p>
            <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
              {data.metrics.predictedLatency.toFixed(3)}s
            </p>
          </div>
          <div
            className={cn(
              "rounded-xl p-4 shadow-sm backdrop-blur",
              Math.abs(data.metrics.driftPercentage) > 5
                ? "bg-red-100/70 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                : "bg-emerald-100/70 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
            )}
          >
            <p className="text-xs uppercase">Drift oranı</p>
            <p className="mt-2 text-lg font-semibold">
              {data.metrics.driftPercentage > 0 ? "+" : ""}
              {data.metrics.driftPercentage.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
        <span>Son yenileme: {data ? new Date(data.timestamp).toLocaleTimeString() : "—"}</span>
        <span>Otomatik yenileme 60s</span>
      </div>
    </Card>
  );
}
