"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivitySquare, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getToken } from "@/lib/auth";

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

  const fetchAlerts = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (filterSeverity !== "all") {
        params.append("severity", filterSeverity);
      }
      params.append("limit", "50");

      const res = await fetch(`/api/v1/aiops/anomalies/alerts?${params}`);
      const result = await res.json();

      if (result.success && result.alerts) {
        const filteredAlerts = (result.alerts as Alert[]).filter((alert) => {
          if (filterStatus === "resolved") {
            return Boolean(alert.resolvedAt);
          }
          if (filterStatus === "unresolved") {
            return !alert.resolvedAt;
          }
          return true;
        });
        setAlerts(filteredAlerts);
      } else {
        setError(result.error || "Failed to fetch alerts");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch alerts");
    } finally {
      setLoading(false);
    }
  }, [filterSeverity, filterStatus]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/aiops/anomalies/alerts/stats?timeRange=24h");
      const result = await res.json();

      if (result.success && result.stats) {
        setStats(result.stats);
      }
    } catch (err) {
      console.error("Error fetching alert stats:", err);
    }
  }, []);

  const resolveAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/v1/aiops/anomalies/alerts/${alertId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resolvedBy: (() => {
            try {
              const token = getToken();
              if (token) {
                const decoded = JSON.parse(atob(token.split(".")[1]));
                return decoded.email || decoded.id || "user";
              }
              return "user";
            } catch {
              return "user";
            }
          })(),
        }),
      });

      const result = await res.json();

      if (result.success) {
        await fetchAlerts();
        await fetchStats();
        toast.success("Uyarı kapatıldı", {
          description: alertId,
        });
      } else {
        setError(result.error || "Failed to resolve alert");
        toast.error(result.error || "Uyarı kapatılamadı");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve alert");
      toast.error("Uyarı kapatılırken hata oluştu");
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchStats();

    const intervalId = setInterval(() => {
      fetchAlerts();
      fetchStats();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchAlerts, fetchStats]);

  const getSeverityBadgeClass = useCallback((severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-400/40";
      case "high":
        return "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-400/40";
      case "medium":
        return "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-400/40";
      case "low":
        return "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-400/40";
      default:
        return "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-slate-700/40 dark:text-slate-200 dark:border-slate-600/40";
    }
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const severityOptions = useMemo(
    () => [
      { value: "all", label: "Tümü" },
      { value: "critical", label: "Critical" },
      { value: "high", label: "High" },
      { value: "medium", label: "Medium" },
      { value: "low", label: "Low" },
    ],
    [],
  );

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "Tümü" },
      { value: "unresolved", label: "Açık" },
      { value: "resolved", label: "Çözüldü" },
    ],
    [],
  );

  if (loading && alerts.length === 0) {
    return (
      <Card className="space-y-4 bg-white dark:bg-slate-900">
        <Skeleton className="w-1/3" />
        <Skeleton className="w-1/2" />
        <Skeleton className="h-32" />
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="space-y-2 border-blue-100 bg-blue-50/70 dark:border-blue-500/30 dark:bg-blue-500/15">
            <p className="text-xs uppercase text-blue-600 dark:text-blue-200">Toplam uyarı</p>
            <p className="text-3xl font-semibold text-blue-900 dark:text-blue-100">{stats.total}</p>
            <span className="text-xs text-blue-700 dark:text-blue-100/80">Son 24 saat</span>
          </Card>
          <Card className="space-y-2 border-rose-100 bg-rose-50/80 dark:border-rose-500/30 dark:bg-rose-500/15">
            <p className="text-xs uppercase text-rose-600 dark:text-rose-200">Critical</p>
            <p className="text-3xl font-semibold text-rose-700 dark:text-rose-100">{stats.critical}</p>
            <span className="text-xs text-rose-500 dark:text-rose-100/80">Kyverno enforcement</span>
          </Card>
          <Card className="space-y-2 border-orange-100 bg-orange-50/70 dark:border-orange-500/30 dark:bg-orange-500/15">
            <p className="text-xs uppercase text-orange-600 dark:text-orange-200">High</p>
            <p className="text-3xl font-semibold text-orange-700 dark:text-orange-100">{stats.high}</p>
            <span className="text-xs text-orange-500 dark:text-orange-100/80">Prometheus alarm akışı</span>
          </Card>
          <Card className="space-y-2 border-emerald-100 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/15">
            <p className="text-xs uppercase text-emerald-600 dark:text-emerald-200">Çözülen</p>
            <p className="text-3xl font-semibold text-emerald-700 dark:text-emerald-100">{stats.resolved}</p>
            <span className="text-xs text-emerald-500 dark:text-emerald-100/80">Jarvis otomasyon zinciri</span>
          </Card>
        </div>
      )}

      <Card className="bg-white dark:bg-slate-900">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-500/20 dark:text-amber-200">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Uyarı Yönetimi</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Kyverno, ArgoCD ve Prometheus kaynaklı olayları izleyin.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Uyarıları yenile"
              onClick={() => {
                fetchAlerts();
                fetchStats();
              }}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
              <ActivitySquare className="h-4 w-4 text-blue-500" />
              <span>Severity</span>
              <select
                value={filterSeverity}
                onChange={(event) => setFilterSeverity(event.target.value)}
                className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/40"
              >
                {severityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Status</span>
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
                className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/40"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Aktif Uyarılar</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">{alerts.length} kayıt listeleniyor</p>
              </div>
              <Badge variant="outline" className="text-xs text-gray-500 dark:border-slate-700 dark:text-slate-300">
                Otomatik yenileme 30s
              </Badge>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {alerts.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
                  Filtre kriterlerine uyan uyarı bulunamadı.
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="px-6 py-4 transition hover:bg-blue-50/40 dark:hover:bg-slate-800/60"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", getSeverityBadgeClass(alert.severity))}
                          >
                            {alert.severity.toUpperCase()}
                          </Badge>
                          {alert.resolvedAt ? (
                            <Badge variant="success" className="text-xs">
                              Çözüldü
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-xs">
                              Açık
                            </Badge>
                          )}
                          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                            {alert.metric}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                          Anomali Skoru:{" "}
                          <span className="font-semibold text-gray-900 dark:text-slate-100">
                            {alert.anomalyScore.toFixed(2)}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                          Oluşturulma: {formatTimestamp(alert.createdAt)}
                          {alert.resolvedAt && (
                            <>
                              {" · "}
                              Çözüm: {formatTimestamp(alert.resolvedAt)}
                              {alert.resolvedBy && ` (${alert.resolvedBy})`}
                            </>
                          )}
                        </div>
                        {alert.context && Object.keys(alert.context).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-blue-600 underline-offset-2 hover:underline dark:text-blue-300">
                              Bağlamı görüntüle
                            </summary>
                            <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-700 dark:bg-slate-800 dark:text-slate-300">
                              {JSON.stringify(alert.context, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                      {!alert.resolvedAt && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => resolveAlert(alert.id)}
                          className="dark:bg-emerald-600 dark:hover:bg-emerald-500"
                        >
                          Uyarıyı kapat
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
