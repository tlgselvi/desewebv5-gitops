import { Router, Request, Response } from "express";
import { logger } from "@/utils/logger.js";
import AnomalyDetector from "@/services/aiops/anomalyDetector.js";
import { anomalyAlertService } from "@/services/aiops/anomalyAlertService.js";

const router = Router();
const anomalyDetector = new AnomalyDetector();

/**
 * POST /api/v1/aiops/anomalies/detect
 * Detect anomalies in metric values
 */
router.post(
  "/anomalies/detect",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { metric, values, timestamps } = req.body;

      if (!metric) {
        res.status(400).json({
          success: false,
          error: "metric is required",
        });
        return;
      }

      if (!values || !Array.isArray(values)) {
        res.status(400).json({
          success: false,
          error: "values array is required",
        });
        return;
      }

      if (values.length === 0) {
        res.status(400).json({
          success: false,
          error: "values array cannot be empty",
        });
        return;
      }

      // Validate timestamps length if provided
      if (
        timestamps &&
        Array.isArray(timestamps) &&
        timestamps.length !== values.length
      ) {
        res.status(400).json({
          success: false,
          error: "timestamps array length must match values array length",
        });
        return;
      }

      const data = {
        metric,
        values,
        timestamps:
          timestamps ||
          values.map((_, i) => Date.now() - (values.length - i) * 1000),
      };

      const anomalies = anomalyDetector.detectAnomalies(data);

      // Create alerts for critical/high severity anomalies
      const criticalAnomalies = anomalies.filter(
        (a) => a.severity === "critical" || a.severity === "high",
      );

      const alerts = [];
      for (const anomaly of criticalAnomalies) {
        try {
          const alert = await anomalyAlertService.createCriticalAlert(
            metric,
            anomaly,
            {
              totalValues: values.length,
            },
          );
          alerts.push(alert);
        } catch (error) {
          logger.error("Failed to create alert for anomaly", {
            error: error instanceof Error ? error.message : String(error),
            metric,
            anomaly,
          });
        }
      }

      logger.info("Anomalies detected", {
        metric,
        totalValues: values.length,
        anomalyCount: anomalies.length,
        criticalCount: criticalAnomalies.length,
        alertCount: alerts.length,
      });

      res.status(200).json({
        success: true,
        metric,
        totalValues: values.length,
        anomalyCount: anomalies.length,
        anomalies,
        alerts: alerts.length > 0 ? alerts : undefined,
      });
    } catch (error) {
      logger.error("Error detecting anomalies", { error });
      res.status(500).json({
        success: false,
        error: "Failed to detect anomalies",
      });
    }
  },
);

/**
 * POST /api/v1/aiops/anomalies/p95
 * Detect p95 percentile anomalies
 */
router.post(
  "/anomalies/p95",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { values, timestamps } = req.body;

      if (!values || !Array.isArray(values)) {
        res.status(400).json({
          success: false,
          error: "values array is required",
        });
        return;
      }

      const data = {
        values,
        timestamps:
          timestamps ||
          values.map((_, i) => Date.now() - (values.length - i) * 1000),
      };

      const result = anomalyDetector.detectp95Anomaly(data);

      logger.info("P95 anomaly detected", {
        isAnomaly: result.result?.isAnomaly,
        severity: result.result?.severity,
        score: result.result?.score,
      });

      res.status(200).json({
        success: true,
        anomaly: result.result,
        percentiles: result.percentiles,
      });
    } catch (error) {
      logger.error("Error detecting p95 anomaly", { error });
      res.status(500).json({
        success: false,
        error: "Failed to detect p95 anomaly",
      });
    }
  },
);

/**
 * POST /api/v1/aiops/anomalies/p99
 * Detect p99 percentile anomalies
 */
router.post(
  "/anomalies/p99",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { values, timestamps } = req.body;

      if (!values || !Array.isArray(values)) {
        res.status(400).json({
          success: false,
          error: "values array is required",
        });
        return;
      }

      const data = {
        values,
        timestamps:
          timestamps ||
          values.map((_, i) => Date.now() - (values.length - i) * 1000),
      };

      const result = anomalyDetector.detectp99Anomaly(data);

      logger.info("P99 anomaly detected", {
        isAnomaly: result.result?.isAnomaly,
        severity: result.result?.severity,
        score: result.result?.score,
      });

      res.status(200).json({
        success: true,
        anomaly: result.result,
        percentiles: result.percentiles,
      });
    } catch (error) {
      logger.error("Error detecting p99 anomaly", { error });
      res.status(500).json({
        success: false,
        error: "Failed to detect p99 anomaly",
      });
    }
  },
);

/**
 * POST /api/v1/aiops/anomalies/aggregate
 * Aggregate anomaly scores
 */
router.post(
  "/anomalies/aggregate",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { scores } = req.body;

      if (!scores || !Array.isArray(scores)) {
        res.status(400).json({
          success: false,
          error: "scores array is required",
        });
        return;
      }

      const aggregated = anomalyDetector.aggregateAnomalyScores(scores);

      logger.info("Anomaly scores aggregated", {
        totalScores: scores.length,
        criticalCount: aggregated.criticalCount,
        highCount: aggregated.highCount,
        aggregatedScore: aggregated.aggregatedScore,
      });

      res.status(200).json({
        success: true,
        aggregated,
      });
    } catch (error) {
      logger.error("Error aggregating anomaly scores", { error });
      res.status(500).json({
        success: false,
        error: "Failed to aggregate anomaly scores",
      });
    }
  },
);

/**
 * POST /api/v1/aiops/anomalies/critical
 * Identify critical anomalies
 */
router.post(
  "/anomalies/critical",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { anomalies } = req.body;

      if (!anomalies || !Array.isArray(anomalies)) {
        res.status(400).json({
          success: false,
          error: "anomalies array is required",
        });
        return;
      }

      const critical = anomalyDetector.identifyCriticalAnomalies(anomalies);

      logger.info("Critical anomalies identified", {
        totalServices: anomalies.length,
        criticalCount: critical.length,
      });

      res.status(200).json({
        success: true,
        critical,
        count: critical.length,
      });
    } catch (error) {
      logger.error("Error identifying critical anomalies", { error });
      res.status(500).json({
        success: false,
        error: "Failed to identify critical anomalies",
      });
    }
  },
);

/**
 * POST /api/v1/aiops/anomalies/trend
 * Detect trend deviation
 */
router.post(
  "/anomalies/trend",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { values, timestamps, windowSize } = req.body;

      if (!values || !Array.isArray(values)) {
        res.status(400).json({
          success: false,
          error: "values array is required",
        });
        return;
      }

      const data = {
        values,
        timestamps:
          timestamps ||
          values.map((_, i) => Date.now() - (values.length - i) * 1000),
      };

      const trend = anomalyDetector.detectTrendDeviation(
        data,
        windowSize || 10,
      );

      logger.info("Trend deviation detected", {
        trend: trend.trend,
        deviation: trend.deviation,
        isSignificant: trend.isSignificant,
      });

      res.status(200).json({
        success: true,
        trend,
      });
    } catch (error) {
      logger.error("Error detecting trend deviation", { error });
      res.status(500).json({
        success: false,
        error: "Failed to detect trend deviation",
      });
    }
  },
);

/**
 * POST /api/v1/aiops/anomalies/timeline
 * Generate anomaly timeline for visualization
 */
router.post(
  "/anomalies/timeline",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { scores, timeRange } = req.body;

      if (!scores || !Array.isArray(scores)) {
        res.status(400).json({
          success: false,
          error: "scores array is required",
        });
        return;
      }

      const timeline = anomalyDetector.generateAnomalyTimeline(
        scores,
        timeRange,
      );

      logger.info("Anomaly timeline generated", {
        dataPoints: timeline.timeline.length,
        totalAnomalies: timeline.summary.totalAnomalies,
        criticalAnomalies: timeline.summary.criticalAnomalies,
      });

      res.status(200).json({
        success: true,
        timeline,
      });
    } catch (error) {
      logger.error("Error generating anomaly timeline", { error });
      res.status(500).json({
        success: false,
        error: "Failed to generate anomaly timeline",
      });
    }
  },
);

/**
 * POST /api/v1/aiops/anomalies/alerts/create
 * Create alert for anomaly (manual trigger)
 */
router.post(
  "/anomalies/alerts/create",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { metric, anomalyScore, context } = req.body;

      if (!metric) {
        res.status(400).json({
          success: false,
          error: "metric is required",
        });
        return;
      }

      if (!anomalyScore) {
        res.status(400).json({
          success: false,
          error: "anomalyScore is required",
        });
        return;
      }

      const alert = await anomalyAlertService.createCriticalAlert(
        metric,
        anomalyScore,
        context,
      );

      logger.info("Manual anomaly alert created", {
        alertId: alert.id,
        metric,
        severity: alert.severity,
      });

      res.status(201).json({
        success: true,
        alert,
      });
    } catch (error) {
      logger.error("Error creating anomaly alert", { error });
      res.status(500).json({
        success: false,
        error: "Failed to create anomaly alert",
      });
    }
  },
);

/**
 * GET /api/v1/aiops/anomalies/alerts
 * Get recent anomaly alerts
 */
router.get(
  "/anomalies/alerts",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const severity = req.query.severity as string | undefined;

      const alerts = await anomalyAlertService.getRecentAlerts(limit, severity);

      logger.info("Anomaly alerts retrieved", {
        count: alerts.length,
        severity,
      });

      res.status(200).json({
        success: true,
        alerts,
        count: alerts.length,
        limit,
      });
    } catch (error) {
      logger.error("Error retrieving anomaly alerts", { error });
      res.status(500).json({
        success: false,
        error: "Failed to retrieve anomaly alerts",
      });
    }
  },
);

/**
 * GET /api/v1/aiops/anomalies/alerts/history
 * Get alert history for time range
 */
router.get(
  "/anomalies/alerts/history",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const startTime =
        parseInt(req.query.startTime as string) ||
        Date.now() - 24 * 60 * 60 * 1000; // Default 24h
      const endTime = parseInt(req.query.endTime as string) || Date.now();
      const severity = req.query.severity as string | undefined;

      const history = await anomalyAlertService.getAlertHistory(
        startTime,
        endTime,
        severity,
      );

      logger.info("Anomaly alert history retrieved", {
        totalCount: history.totalCount,
        timeRange: history.timeRange,
      });

      res.status(200).json({
        success: true,
        history,
      });
    } catch (error) {
      logger.error("Error retrieving alert history", { error });
      res.status(500).json({
        success: false,
        error: "Failed to retrieve alert history",
      });
    }
  },
);

/**
 * POST /api/v1/aiops/anomalies/alerts/:alertId/resolve
 * Resolve an alert
 */
router.post(
  "/anomalies/alerts/:alertId/resolve",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { alertId } = req.params;
      const { resolvedBy } = req.body;

      const resolved = await anomalyAlertService.resolveAlert(
        alertId,
        resolvedBy,
      );

      if (!resolved) {
        res.status(404).json({
          success: false,
          error: "Alert not found",
        });
        return;
      }

      logger.info("Anomaly alert resolved", { alertId, resolvedBy });

      res.status(200).json({
        success: true,
        message: "Alert resolved successfully",
        alertId,
      });
    } catch (error) {
      logger.error("Error resolving alert", { error });
      res.status(500).json({
        success: false,
        error: "Failed to resolve alert",
      });
    }
  },
);

/**
 * GET /api/v1/aiops/anomalies/alerts/stats
 * Get alert statistics
 */
router.get(
  "/anomalies/alerts/stats",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const timeRange = (req.query.timeRange as string) || "24h";

      const stats = await anomalyAlertService.getAlertStats(timeRange);

      logger.info("Anomaly alert stats retrieved", { timeRange, stats });

      res.status(200).json({
        success: true,
        stats,
        timeRange,
      });
    } catch (error) {
      logger.error("Error retrieving alert stats", { error });
      res.status(500).json({
        success: false,
        error: "Failed to retrieve alert stats",
      });
    }
  },
);

export { router as anomalyRoutes };
