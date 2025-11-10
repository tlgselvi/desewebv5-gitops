"use client";

import { useCallback, useEffect, useState } from "react";
import { BrainCircuit, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface FeedbackEntry {
  timestamp: number;
  metric: string;
  anomaly: boolean;
  verdict: boolean;
  comment: string;
}

interface FeedbackResponse {
  success: boolean;
  count: number;
  feedback: FeedbackEntry[];
}

export default function InsightsPanel() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/aiops/feedback");
      if (!res.ok) {
        throw new Error("Geribildirim verisi alınamadı");
      }
      const data: FeedbackResponse = await res.json();
      if (data.success) {
        setFeedback(data.feedback);
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

  if (loading && feedback.length === 0) {
    return (
      <Card className="space-y-4 bg-white dark:bg-slate-900">
        <Skeleton className="w-2/5" />
        <Skeleton className="w-1/2" />
        <Skeleton className="h-24" />
      </Card>
    );
  }

  if (error && feedback.length === 0) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-400/40 dark:bg-red-500/10">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-200">AIOps Insights</h2>
        <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
            <BrainCircuit className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">AIOps Insights</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Operatör geri bildirimleri ve anomali değerlendirmeleri
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {feedback.length > 0 && (
            <Badge variant="outline" className="text-xs text-blue-600">
              {feedback.length} kayıt
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Insights verisini yenile"
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

      <div className="mt-5 max-h-80 space-y-3 overflow-y-auto pr-1">
        {feedback.length === 0 ? (
          <div className="rounded-lg bg-gray-50 px-4 py-6 text-center text-gray-500 dark:bg-slate-800 dark:text-slate-400">
            Henüz geri bildirim bulunmuyor.
          </div>
        ) : (
          feedback
            .slice()
            .reverse()
            .map((f, index) => (
              <div
                key={`${f.metric}-${f.timestamp}-${index}`}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {f.metric}
                      </p>
                      <Badge variant={f.verdict ? "success" : "warning"}>
                        {f.verdict ? "Doğrulandı" : "Yanlış Pozitif"}
                      </Badge>
                      {f.anomaly && (
                        <Badge variant="outline" className="border-orange-300 text-orange-600">
                          Anomali
                        </Badge>
                      )}
                    </div>
                    {f.comment && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">“{f.comment}”</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    {new Date(f.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
        )}
      </div>
    </Card>
  );
}
