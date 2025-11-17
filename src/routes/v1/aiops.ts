import { Router, type Request, type Response } from "express";
import { authenticate } from "@/middleware/auth.js";
import { logger } from "@/utils/logger.js";

type AlertSeverity = "critical" | "high" | "medium" | "low";

type AlertPayload = {
  id: string;
  metric: string;
  severity: AlertSeverity;
  anomalyScore: number;
  context: {
    cluster: string;
    namespace: string;
    service: string;
    region: string;
  };
  createdAt: number;
  resolvedAt?: number | null;
  resolvedBy?: string;
};

type AlertStats = {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved: number;
  unresolved: number;
};

const aiopsRouter: Router = Router();

const mockAlertsTemplate: AlertPayload[] = [
  {
    id: "ALRT-901",
    metric: "prometheus_http_request_duration_seconds",
    severity: "critical",
    anomalyScore: 0.94,
    context: {
      cluster: "gke-prod-eu-1",
      namespace: "observability",
      service: "prometheus-server",
      region: "eu-central-1",
    },
    createdAt: Date.now() - 1000 * 60 * 5,
  },
  {
    id: "ALRT-902",
    metric: "kyverno_policy_violation_total",
    severity: "high",
    anomalyScore: 0.82,
    context: {
      cluster: "aks-shared-02",
      namespace: "policy-engine",
      service: "kyverno-controller",
      region: "westeurope",
    },
    createdAt: Date.now() - 1000 * 60 * 18,
  },
  {
    id: "ALRT-903",
    metric: "loki_ingester_memory_usage_bytes",
    severity: "medium",
    anomalyScore: 0.68,
    context: {
      cluster: "eks-aiops-core",
      namespace: "logging",
      service: "loki-ingester",
      region: "us-east-1",
    },
    createdAt: Date.now() - 1000 * 60 * 42,
    resolvedAt: Date.now() - 1000 * 60 * 8,
    resolvedBy: "aiops-bot",
  },
  {
    id: "ALRT-904",
    metric: "tempo_trace_ingestion_rate",
    severity: "low",
    anomalyScore: 0.41,
    context: {
      cluster: "gke-staging-aiops",
      namespace: "tracing",
      service: "tempo-gateway",
      region: "us-central1",
    },
    createdAt: Date.now() - 1000 * 60 * 60,
  },
];

const buildMockAlerts = (): AlertPayload[] => {
  // Clone the template to avoid mutation between requests
  return mockAlertsTemplate.map((alert, index) => ({
    ...alert,
    id: `${alert.id}-${index + 1}`,
  }));
};

const calculateStats = (alerts: AlertPayload[]): AlertStats => {
  return alerts.reduce<AlertStats>(
    (stats, alert) => {
      stats.total += 1;
      stats[alert.severity] += 1;
      if (alert.resolvedAt) {
        stats.resolved += 1;
      } else {
        stats.unresolved += 1;
      }
      return stats;
    },
    {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      resolved: 0,
      unresolved: 0,
    },
  );
};

aiopsRouter.get(
  "/anomalies/alerts",
  authenticate,
  (req: Request, res: Response): void => {
    const severityFilter =
      typeof req.query.severity === "string" ? req.query.severity.toLowerCase() : "all";
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    let alerts = buildMockAlerts();

    if (["critical", "high", "medium", "low"].includes(severityFilter)) {
      alerts = alerts.filter((alert) => alert.severity === severityFilter);
    }

    const sanitizedLimit = Number.isFinite(limit) && limit > 0 ? limit : 50;

    alerts = alerts.slice(0, sanitizedLimit);

    logger.debug("AIOps alerts served", {
      count: alerts.length,
      severityFilter,
      limit: sanitizedLimit,
    });

    res.json({
      success: true,
      alerts,
      generatedAt: new Date().toISOString(),
      filters: {
        severity: severityFilter,
        limit: sanitizedLimit,
      },
    });
  },
);

aiopsRouter.get(
  "/anomalies/alerts/stats",
  authenticate,
  (req: Request, res: Response): void => {
    const alerts = buildMockAlerts();
    const stats = calculateStats(alerts);
    const timeRange = typeof req.query.timeRange === "string" ? req.query.timeRange : "24h";

    res.json({
      success: true,
      stats: {
        ...stats,
        timeRange,
        generatedAt: new Date().toISOString(),
      },
    });
  },
);

export { aiopsRouter };

