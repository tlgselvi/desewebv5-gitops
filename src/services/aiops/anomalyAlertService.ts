import { logger } from "@/utils/logger.js";
import { redis } from "@/services/storage/redisClient.js";
import { randomUUID } from "crypto";
import type {
  AnomalyScore,
  AnomalySeverity,
} from "@/services/aiops/anomalyDetector.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isSeverity = (value: unknown): value is AnomalySeverity =>
  value === "low" || value === "medium" || value === "high" || value === "critical";

const parseNumber = (value: string | undefined, fallback: number = 0): number => {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseInteger = (value: string | undefined, fallback: number = 0): number => {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value: string | undefined): boolean => value === "true";

const getNumberFromRecord = (
  record: Record<string, unknown>,
  key: string,
): number | undefined => {
  const value = record[key];
  return typeof value === "number" ? value : undefined;
};

const getStringFromRecord = (
  record: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
};

const getBooleanFromRecord = (
  record: Record<string, unknown>,
  key: string,
): boolean | undefined => {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
};

const getRecordFromRecord = (
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined => {
  const value = record[key];
  return isRecord(value) ? value : undefined;
};

interface AnomalyAlert {
  id: string;
  metric: string;
  anomalyScore: AnomalyScore;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: number;
  isResolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

interface AlertHistory {
  alerts: AnomalyAlert[];
  totalCount: number;
  criticalCount: number;
  highCount: number;
  timeRange: {
    start: number;
    end: number;
  };
}

export class AnomalyAlertService {
  private readonly STREAM_KEY = "dese.anomaly-alerts";
  private readonly ALERT_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  private parseSeverity(value: string | undefined): AnomalySeverity {
    return isSeverity(value) ? value : "low";
  }

  private buildFieldsMap(rawFields: string[]): Map<string, string> {
    const fields = new Map<string, string>();
    for (let index = 0; index < rawFields.length; index += 2) {
      const key = rawFields[index];
      const value = rawFields[index + 1] ?? "";
      if (key) {
        fields.set(key, value);
      }
    }
    return fields;
  }

  private parsePayload(
    rawPayload: string | undefined,
    messageId: string,
  ): Record<string, unknown> {
    if (!rawPayload) {
      return {};
    }

    try {
      const parsed = JSON.parse(rawPayload);
      if (isRecord(parsed)) {
        return parsed;
      }

      logger.warn("Stream payload is not an object", { messageId });
      return {};
    } catch (error) {
      logger.warn("Failed to parse alert payload", {
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {};
    }
  }

  private mapMessageToAlert(
    messageId: string,
    rawFields: string[],
  ): AnomalyAlert | null {
    const fields = this.buildFieldsMap(rawFields);

    const alertId = fields.get("alertId");
    if (!alertId) {
      logger.warn("Stream entry missing alertId", { messageId });
      return null;
    }

    const payload = this.parsePayload(fields.get("payload"), messageId);

    const anomalyScoreRaw = getRecordFromRecord(payload, "anomalyScore");

    const severity = this.parseSeverity(
      anomalyScoreRaw
        ? getStringFromRecord(anomalyScoreRaw, "severity")
        : fields.get("severity"),
    );

    const timestamp = parseInteger(fields.get("timestamp"), Date.now());

    const contextRaw = anomalyScoreRaw
      ? getRecordFromRecord(anomalyScoreRaw, "context")
      : undefined;

    const anomalyScore: AnomalyScore = {
      index: anomalyScoreRaw ? getNumberFromRecord(anomalyScoreRaw, "index") ?? 0 : 0,
      value:
        anomalyScoreRaw
          ? getNumberFromRecord(anomalyScoreRaw, "value") ??
            parseNumber(fields.get("value"), parseNumber(fields.get("score")))
          : parseNumber(fields.get("value"), parseNumber(fields.get("score"))),
      score:
        anomalyScoreRaw
          ? getNumberFromRecord(anomalyScoreRaw, "score") ?? parseNumber(fields.get("score"))
          : parseNumber(fields.get("score")),
      severity,
      deviation:
        anomalyScoreRaw
          ? getNumberFromRecord(anomalyScoreRaw, "deviation") ?? parseNumber(fields.get("deviation"))
          : parseNumber(fields.get("deviation")),
      percentile:
        anomalyScoreRaw
          ? getStringFromRecord(anomalyScoreRaw, "percentile") ?? fields.get("percentile") ?? "zscore"
          : fields.get("percentile") ?? "zscore",
      isAnomaly:
        anomalyScoreRaw
          ? getBooleanFromRecord(anomalyScoreRaw, "isAnomaly") ?? parseBoolean(fields.get("isAnomaly"))
          : parseBoolean(fields.get("isAnomaly")),
      timestamp:
        anomalyScoreRaw
          ? getNumberFromRecord(anomalyScoreRaw, "timestamp") ?? timestamp
          : timestamp,
    };

    const messageValue = anomalyScoreRaw ? getStringFromRecord(anomalyScoreRaw, "message") : undefined;
    if (messageValue !== undefined) {
      anomalyScore.message = messageValue;
    }

    if (contextRaw !== undefined && Object.keys(contextRaw).length > 0) {
      anomalyScore.context = contextRaw;
    }

    const resolvedAtRaw = getNumberFromRecord(payload, "resolvedAt");
    const resolvedByRaw = getStringFromRecord(payload, "resolvedBy");
    const isResolvedRaw = getBooleanFromRecord(payload, "isResolved");

    const metric =
      getStringFromRecord(payload, "metric") ?? fields.get("metric") ?? "";

    const message =
      getStringFromRecord(payload, "message") ?? fields.get("message") ?? "";

    const alert: AnomalyAlert = {
      id: alertId,
      metric,
      anomalyScore,
      severity,
      message,
      timestamp,
      isResolved: isResolvedRaw ?? parseBoolean(fields.get("isResolved")),
    };

    if (resolvedAtRaw !== undefined) {
      alert.resolvedAt = resolvedAtRaw;
    }

    if (resolvedByRaw !== undefined) {
      alert.resolvedBy = resolvedByRaw;
    }

    return alert;
  }

  /**
   * Create and send critical anomaly alert
   */
  async createCriticalAlert(
    metric: string,
    anomalyScore: AnomalyScore,
    additionalContext?: Record<string, unknown>,
  ): Promise<AnomalyAlert> {
    try {
      const alert: AnomalyAlert = {
        id: randomUUID(),
        metric,
        anomalyScore,
        severity: anomalyScore.severity,
        message: this.generateAlertMessage(metric, anomalyScore),
        timestamp: Date.now(),
        isResolved: false,
      };

      // Store in Redis Stream for real-time access
      await redis.xadd(
        this.STREAM_KEY,
        "*",
        "alertId",
        alert.id,
        "metric",
        metric,
        "severity",
        alert.severity,
        "score",
        anomalyScore.score.toString(),
        "percentile",
        anomalyScore.percentile,
        "isAnomaly",
        anomalyScore.isAnomaly.toString(),
        "message",
        alert.message,
        "timestamp",
        alert.timestamp.toString(),
        "payload",
        JSON.stringify({
          ...alert,
          ...additionalContext,
        }),
        "isResolved",
        "false",
      );

      // Set TTL for automatic cleanup
      await redis.expire(this.STREAM_KEY, this.ALERT_TTL);

      // Log critical/high severity alerts
      if (alert.severity === "critical" || alert.severity === "high") {
        logger.warn("Critical anomaly alert created", {
          alertId: alert.id,
          metric,
          severity: alert.severity,
          score: anomalyScore.score,
          percentile: anomalyScore.percentile,
        });
      } else {
        logger.info("Anomaly alert created", {
          alertId: alert.id,
          metric,
          severity: alert.severity,
        });
      }

      return alert;
    } catch (error) {
      logger.error("Failed to create anomaly alert", {
        error: error instanceof Error ? error.message : String(error),
        metric,
      });
      throw error;
    }
  }

  /**
   * Generate human-readable alert message
   */
  private generateAlertMessage(
    metric: string,
    anomalyScore: AnomalyScore,
  ): string {
    const severityEmoji: Record<AnomalySeverity, string> = {
      critical: "🚨",
      high: "⚠️",
      medium: "⚡",
      low: "ℹ️",
    };

    const emoji = severityEmoji[anomalyScore.severity] || "ℹ️";
    const deviation = Math.abs(anomalyScore.deviation).toFixed(2);

    return `${emoji} ${anomalyScore.severity.toUpperCase()} anomaly detected in ${metric} - ${anomalyScore.percentile} percentile deviation: ${deviation} (score: ${anomalyScore.score.toFixed(2)})`;
  }

  /**
   * Get recent alerts from Redis Stream
   */
  async getRecentAlerts(
    limit: number = 50,
    severity?: AnomalySeverity,
  ): Promise<AnomalyAlert[]> {
    try {
      const messages = (await redis.xrevrange(
        this.STREAM_KEY,
        "+",
        "-",
        "COUNT",
        limit * 2,
      )) as Array<[string, string[]]>;

      const alerts: AnomalyAlert[] = [];

      for (const [messageId, rawFields] of messages) {
        const alert = this.mapMessageToAlert(messageId, rawFields);
        if (!alert) {
          continue;
        }
        if (severity && alert.severity !== severity) {
          continue;
        }
        alerts.push(alert);
        if (alerts.length >= limit) {
          break;
        }
      }

      return alerts;
    } catch (error) {
      logger.error("Failed to get recent alerts", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get alert history for a time range
   */
  async getAlertHistory(
    startTime: number,
    endTime: number = Date.now(),
    severity?: AnomalySeverity,
  ): Promise<AlertHistory> {
    try {
      const allAlerts = await this.getRecentAlerts(1000, severity); // Get more for filtering

      const filteredAlerts = allAlerts.filter(
        (alert) => alert.timestamp >= startTime && alert.timestamp <= endTime,
      );

      const criticalCount = filteredAlerts.filter(
        (a) => a.severity === "critical",
      ).length;
      const highCount = filteredAlerts.filter(
        (a) => a.severity === "high",
      ).length;

      return {
        alerts: filteredAlerts,
        totalCount: filteredAlerts.length,
        criticalCount,
        highCount,
        timeRange: {
          start: startTime,
          end: endTime,
        },
      };
    } catch (error) {
      logger.error("Failed to get alert history", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<boolean> {
    try {
      const messages = (await redis.xrevrange(
        this.STREAM_KEY,
        "+",
        "-",
        "COUNT",
        1000,
      )) as Array<[string, string[]]>;

      for (const [messageId, rawFields] of messages) {
        const fields = this.buildFieldsMap(rawFields);
        if (fields.get("alertId") !== alertId) {
          continue;
        }

        const payload = this.parsePayload(fields.get("payload"), messageId);

        const updatedPayload: Record<string, unknown> = {
          ...payload,
          isResolved: true,
          resolvedAt: Date.now(),
        };
        if (resolvedBy) {
          updatedPayload.resolvedBy = resolvedBy;
        }

        await redis.xadd(
          this.STREAM_KEY,
          "*",
          "alertId",
          alertId,
          "metric",
          fields.get("metric") ?? "",
          "severity",
          fields.get("severity") ?? "",
          "score",
          fields.get("score") ?? "0",
          "message",
          fields.get("message") ?? "",
          "timestamp",
          fields.get("timestamp") ?? Date.now().toString(),
          "payload",
          JSON.stringify(updatedPayload),
          "isResolved",
          "true",
          "resolvedAt",
          Date.now().toString(),
          "resolvedBy",
          resolvedBy ?? "",
        );

        logger.info("Alert resolved", { alertId, resolvedBy });
        return true;
      }

      logger.warn("Alert not found for resolution", { alertId });
      return false;
    } catch (error) {
      logger.error("Failed to resolve alert", {
        error: error instanceof Error ? error.message : String(error),
        alertId,
      });
      throw error;
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(timeRange: string = "24h"): Promise<{
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    resolved: number;
    unresolved: number;
  }> {
    try {
      const timeRangeMs = this.parseTimeRange(timeRange);
      const startTime = Date.now() - timeRangeMs;

      const alerts = await this.getRecentAlerts(1000);

      const filteredAlerts = alerts.filter((a) => a.timestamp >= startTime);

      return {
        total: filteredAlerts.length,
        critical: filteredAlerts.filter((a) => a.severity === "critical")
          .length,
        high: filteredAlerts.filter((a) => a.severity === "high").length,
        medium: filteredAlerts.filter((a) => a.severity === "medium").length,
        low: filteredAlerts.filter((a) => a.severity === "low").length,
        resolved: filteredAlerts.filter((a) => a.isResolved).length,
        unresolved: filteredAlerts.filter((a) => !a.isResolved).length,
      };
    } catch (error) {
      logger.error("Failed to get alert stats", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Parse time range string to milliseconds
   */
  private parseTimeRange(timeRange: string): number {
    const match = timeRange.match(/^(\d+)([hms])$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default 24h

    const value = Number.parseInt(match[1] ?? "0", 10);
    const unit = match[2] ?? "h";

    switch (unit) {
      case "h":
        return value * 60 * 60 * 1000;
      case "m":
        return value * 60 * 1000;
      case "s":
        return value * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }
}

export const anomalyAlertService = new AnomalyAlertService();
