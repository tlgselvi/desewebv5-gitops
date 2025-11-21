import { Router } from "express";
import { z } from "zod";
import { logger } from "@/utils/logger.js";
import { asyncHandler } from "@/middleware/errorHandler.js";
import { anomalyDetector, } from "@/services/aiops/anomalyDetector.js";
import { anomalyAlertService } from "@/services/aiops/anomalyAlertService.js";
const router = Router();
const severityEnum = z.enum(["low", "medium", "high", "critical"]);
const detectAnomalySchema = z.object({
    metric: z.string().min(1),
    values: z.array(z.number()).min(1),
    timestamps: z.array(z.number()).optional(),
});
const percentileDetectionSchema = z.object({
    values: z.array(z.number()).min(1),
    timestamps: z.array(z.number()).optional(),
});
const anomalyScoreSchema = z.object({
    index: z.number().int().nonnegative().optional(),
    value: z.number(),
    score: z.number(),
    severity: severityEnum,
    deviation: z.number().optional(),
    percentile: z.string().min(1).optional(),
    isAnomaly: z.boolean().optional(),
    timestamp: z.number().int().optional(),
    message: z.string().optional(),
    context: z.record(z.string(), z.unknown()).optional(),
});
const aggregateScoresSchema = z.object({
    scores: z.array(anomalyScoreSchema).min(1),
});
const criticalDetectionSchema = z.object({
    anomalies: z.array(anomalyScoreSchema).min(1),
});
const trendDetectionSchema = z.object({
    values: z.array(z.number()).min(1),
    timestamps: z.array(z.number()).optional(),
    windowSize: z.number().int().positive().max(500).optional(),
});
const timelineSchema = z.object({
    scores: z.array(anomalyScoreSchema).min(1),
    timeRange: z
        .object({
        start: z.number().int().optional(),
        end: z.number().int().optional(),
        granularity: z.enum(["minute", "hour", "day"]).optional(),
    })
        .optional(),
});
const createAlertSchema = z.object({
    metric: z.string().min(1),
    anomalyScore: anomalyScoreSchema,
    context: z.record(z.string(), z.unknown()).optional(),
});
const alertsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(500).default(50),
    severity: severityEnum.optional(),
});
const historyQuerySchema = z.object({
    startTime: z.coerce.number().int().optional(),
    endTime: z.coerce.number().int().optional(),
    severity: severityEnum.optional(),
});
const resolveAlertSchema = z.object({
    resolvedBy: z.string().min(1).default("system"),
});
const statsQuerySchema = z.object({
    timeRange: z.string().min(1).default("24h"),
});
const normalizeTimestamps = (values, timestamps) => {
    if (Array.isArray(timestamps) && timestamps.length === values.length) {
        return timestamps;
    }
    const now = Date.now();
    return values.map((_, index) => now - (values.length - index) * 1000);
};
const toAnomalyScore = (entry) => {
    const baseScore = {
        index: entry.index ?? 0,
        value: entry.value,
        score: entry.score,
        severity: entry.severity,
        deviation: entry.deviation ?? entry.score,
        percentile: entry.percentile ?? "zscore",
        isAnomaly: entry.isAnomaly ?? true,
        timestamp: entry.timestamp ?? Date.now(),
    };
    if (entry.message !== undefined) {
        baseScore.message = entry.message;
    }
    if (entry.context && Object.keys(entry.context).length > 0) {
        baseScore.context = entry.context;
    }
    return baseScore;
};
/**
 * POST /api/v1/aiops/anomalies/detect
 * Detect anomalies in metric values
 */
router.post("/anomalies/detect", asyncHandler(async (req, res) => {
    const { metric, values, timestamps } = detectAnomalySchema.parse(req.body);
    const detectionPayload = {
        metric,
        values,
        timestamps: normalizeTimestamps(values, timestamps),
    };
    const anomalies = anomalyDetector.detectAnomalies(detectionPayload);
    const criticalAnomalies = anomalies.filter((anomaly) => anomaly.severity === "critical" || anomaly.severity === "high");
    const alerts = [];
    for (const anomaly of criticalAnomalies) {
        try {
            const alert = await anomalyAlertService.createCriticalAlert(metric, anomaly, {
                totalValues: values.length,
            });
            alerts.push(alert);
        }
        catch (error) {
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
    return res.status(200).json({
        success: true,
        metric,
        totalValues: values.length,
        anomalyCount: anomalies.length,
        anomalies,
        alerts: alerts.length > 0 ? alerts : undefined,
    });
}));
/**
 * POST /api/v1/aiops/anomalies/p95
 * Detect p95 percentile anomalies
 */
router.post("/anomalies/p95", asyncHandler(async (req, res) => {
    const { values, timestamps } = percentileDetectionSchema.parse(req.body);
    const result = anomalyDetector.detectp95Anomaly({
        values,
        timestamps: normalizeTimestamps(values, timestamps),
    });
    logger.info("P95 anomaly detected", {
        isAnomaly: result.result?.isAnomaly,
        severity: result.result?.severity,
        score: result.result?.score,
    });
    return res.status(200).json({
        success: true,
        anomaly: result.result,
        percentiles: result.percentiles,
    });
}));
/**
 * POST /api/v1/aiops/anomalies/p99
 * Detect p99 percentile anomalies
 */
router.post("/anomalies/p99", asyncHandler(async (req, res) => {
    const { values, timestamps } = percentileDetectionSchema.parse(req.body);
    const result = anomalyDetector.detectp99Anomaly({
        values,
        timestamps: normalizeTimestamps(values, timestamps),
    });
    logger.info("P99 anomaly detected", {
        isAnomaly: result.result?.isAnomaly,
        severity: result.result?.severity,
        score: result.result?.score,
    });
    return res.status(200).json({
        success: true,
        anomaly: result.result,
        percentiles: result.percentiles,
    });
}));
/**
 * POST /api/v1/aiops/anomalies/aggregate
 * Aggregate anomaly scores
 */
router.post("/anomalies/aggregate", asyncHandler(async (req, res) => {
    const { scores } = aggregateScoresSchema.parse(req.body);
    const normalizedScores = scores.map(toAnomalyScore);
    const aggregated = anomalyDetector.aggregateAnomalyScores(normalizedScores);
    logger.info("Anomaly scores aggregated", {
        totalScores: normalizedScores.length,
        criticalCount: aggregated.criticalCount,
        highCount: aggregated.highCount,
        aggregatedScore: aggregated.aggregatedScore,
    });
    return res.status(200).json({
        success: true,
        aggregated,
    });
}));
/**
 * POST /api/v1/aiops/anomalies/critical
 * Identify critical anomalies
 */
router.post("/anomalies/critical", asyncHandler(async (req, res) => {
    const { anomalies } = criticalDetectionSchema.parse(req.body);
    const normalizedAnomalies = anomalies.map(toAnomalyScore);
    const critical = anomalyDetector.identifyCriticalAnomalies(normalizedAnomalies);
    logger.info("Critical anomalies identified", {
        totalServices: normalizedAnomalies.length,
        criticalCount: critical.length,
    });
    return res.status(200).json({
        success: true,
        critical,
        count: critical.length,
    });
}));
/**
 * POST /api/v1/aiops/anomalies/trend
 * Detect trend deviation
 */
router.post("/anomalies/trend", asyncHandler(async (req, res) => {
    const { values, timestamps, windowSize } = trendDetectionSchema.parse(req.body);
    const trend = anomalyDetector.detectTrendDeviation({
        values,
        timestamps: normalizeTimestamps(values, timestamps),
    }, windowSize ?? 10);
    logger.info("Trend deviation detected", {
        trend: trend.trend,
        deviation: trend.deviation,
        isSignificant: trend.isSignificant,
    });
    return res.status(200).json({
        success: true,
        trend,
    });
}));
/**
 * POST /api/v1/aiops/anomalies/timeline
 * Generate anomaly timeline for visualization
 */
router.post("/anomalies/timeline", asyncHandler(async (req, res) => {
    const { scores, timeRange } = timelineSchema.parse(req.body);
    const normalizedScores = scores.map(toAnomalyScore);
    const timeline = anomalyDetector.generateAnomalyTimeline(normalizedScores, timeRange);
    logger.info("Anomaly timeline generated", {
        dataPoints: timeline.timeline.length,
        totalAnomalies: timeline.summary.totalAnomalies,
        criticalAnomalies: timeline.summary.criticalAnomalies,
    });
    return res.status(200).json({
        success: true,
        timeline,
    });
}));
/**
 * POST /api/v1/aiops/anomalies/alerts/create
 * Create alert for anomaly (manual trigger)
 */
router.post("/anomalies/alerts/create", asyncHandler(async (req, res) => {
    const { metric, anomalyScore, context } = createAlertSchema.parse(req.body);
    const normalizedScore = toAnomalyScore(anomalyScore);
    const alert = await anomalyAlertService.createCriticalAlert(metric, normalizedScore, context);
    logger.info("Manual anomaly alert created", {
        alertId: alert.id,
        metric,
        severity: alert.severity,
    });
    return res.status(201).json({
        success: true,
        alert,
    });
}));
/**
 * GET /api/v1/aiops/anomalies/alerts
 * Get recent anomaly alerts
 */
router.get("/anomalies/alerts", asyncHandler(async (req, res) => {
    const { limit, severity } = alertsQuerySchema.parse(req.query);
    const alerts = await anomalyAlertService.getRecentAlerts(limit, severity);
    logger.info("Anomaly alerts retrieved", {
        count: alerts.length,
        severity,
    });
    return res.status(200).json({
        success: true,
        alerts,
        count: alerts.length,
        limit,
        severity,
    });
}));
/**
 * GET /api/v1/aiops/anomalies/alerts/history
 * Get alert history for time range
 */
router.get("/anomalies/alerts/history", asyncHandler(async (req, res) => {
    const { startTime, endTime, severity } = historyQuerySchema.parse(req.query);
    const effectiveStart = startTime ?? Date.now() - 24 * 60 * 60 * 1000;
    const effectiveEnd = endTime ?? Date.now();
    const history = await anomalyAlertService.getAlertHistory(effectiveStart, effectiveEnd, severity);
    logger.info("Anomaly alert history retrieved", {
        totalCount: history.totalCount,
        timeRange: history.timeRange,
    });
    return res.status(200).json({
        success: true,
        history,
    });
}));
/**
 * POST /api/v1/aiops/anomalies/alerts/:alertId/resolve
 * Resolve an alert
 */
router.post("/anomalies/alerts/:alertId/resolve", asyncHandler(async (req, res) => {
    const { alertId } = req.params;
    if (!alertId) {
        return res.status(400).json({
            success: false,
            error: "Alert identifier is required",
        });
    }
    const resolvedByParsed = resolveAlertSchema.parse(req.body);
    const resolvedByValue = resolvedByParsed.resolvedBy;
    const resolved = await anomalyAlertService.resolveAlert(alertId, resolvedByValue);
    if (!resolved) {
        return res.status(404).json({
            success: false,
            error: "Alert not found",
        });
    }
    logger.info("Anomaly alert resolved", { alertId, resolvedBy: resolvedByValue });
    return res.status(200).json({
        success: true,
        message: "Alert resolved successfully",
        alertId,
    });
}));
/**
 * GET /api/v1/aiops/anomalies/alerts/stats
 * Get alert statistics
 */
router.get("/anomalies/alerts/stats", asyncHandler(async (req, res) => {
    const { timeRange } = statsQuerySchema.parse(req.query);
    const stats = await anomalyAlertService.getAlertStats(timeRange);
    logger.info("Anomaly alert stats retrieved", { timeRange, stats });
    return res.status(200).json({
        success: true,
        stats,
        timeRange,
    });
}));
export { router as anomalyRoutes };
//# sourceMappingURL=anomaly.js.map