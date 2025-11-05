import { logger } from "@/utils/logger.js";
import { redis } from "@/services/storage/redisClient.js";
import { randomUUID } from "crypto";
import type { AnomalyScore } from "@/services/aiops/anomalyDetector.js";

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
    const severityEmoji = {
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
    severity?: string,
  ): Promise<AnomalyAlert[]> {
    try {
      const messages = await redis.xrevrange(
        this.STREAM_KEY,
        "+",
        "-",
        "COUNT",
        limit * 2, // Get more to filter by severity
      );

      const alerts: AnomalyAlert[] = messages
        .map((message) => {
          try {
            const fields: Record<string, string> = {};
            for (let i = 0; i < message[1].length; i += 2) {
              fields[message[1][i]] = message[1][i + 1];
            }

            const payload = JSON.parse(fields.payload || "{}");
            return {
              id: fields.alertId || payload.id || "",
              metric: fields.metric || payload.metric || "",
              anomalyScore: payload.anomalyScore || {
                metric: fields.metric || "",
                score: parseFloat(fields.score || "0"),
                percentile: (fields.percentile as "p95" | "p99") || "p95",
                isAnomaly: fields.isAnomaly === "true",
                deviation: 0,
                timestamp: parseInt(fields.timestamp || "0"),
                severity:
                  (fields.severity as AnomalyAlert["severity"]) || "low",
              },
              severity: (fields.severity as AnomalyAlert["severity"]) || "low",
              message: fields.message || payload.message || "",
              timestamp: parseInt(fields.timestamp || "0"),
              isResolved: fields.isResolved === "true",
              resolvedAt: payload.resolvedAt,
              resolvedBy: payload.resolvedBy,
            };
          } catch (error) {
            logger.warn("Failed to parse alert from stream", {
              messageId: message[0],
              error: error instanceof Error ? error.message : String(error),
            });
            return null;
          }
        })
        .filter((alert): alert is AnomalyAlert => {
          if (!alert) return false;
          if (severity && alert.severity !== severity) return false;
          return true;
        })
        .slice(0, limit);

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
    severity?: string,
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
      // Get the alert
      const messages = await redis.xrevrange(
        this.STREAM_KEY,
        "+",
        "-",
        "COUNT",
        1000,
      );

      for (const message of messages) {
        const fields: Record<string, string> = {};
        for (let i = 0; i < message[1].length; i += 2) {
          fields[message[1][i]] = message[1][i + 1];
        }

        if (fields.alertId === alertId) {
          // Update the alert in stream (add resolved entry)
          const payload = JSON.parse(fields.payload || "{}");
          payload.isResolved = true;
          payload.resolvedAt = Date.now();
          if (resolvedBy) payload.resolvedBy = resolvedBy;

          await redis.xadd(
            this.STREAM_KEY,
            "*",
            "alertId",
            alertId,
            "metric",
            fields.metric || "",
            "severity",
            fields.severity || "",
            "score",
            fields.score || "0",
            "message",
            fields.message || "",
            "timestamp",
            fields.timestamp || Date.now().toString(),
            "payload",
            JSON.stringify(payload),
            "isResolved",
            "true",
            "resolvedAt",
            Date.now().toString(),
            "resolvedBy",
            resolvedBy || "",
          );

          logger.info("Alert resolved", { alertId, resolvedBy });
          return true;
        }
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

    const value = parseInt(match[1]);
    const unit = match[2];

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
