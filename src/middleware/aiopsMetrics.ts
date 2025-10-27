import { Request, Response } from 'express';
import client from 'prom-client';

// AIOps feedback metrics
const aiops_feedback_total = new client.Counter({
  name: 'aiops_feedback_total',
  help: 'Total AIOps feedback entries stored',
  labelNames: ['metric', 'anomaly'],
});

const aiops_remediation_events_total = new client.Counter({
  name: 'aiops_remediation_events_total',
  help: 'Total AIOps remediation events',
  labelNames: ['severity', 'status'],
});

const aiops_drift_detections_total = new client.Counter({
  name: 'aiops_drift_detections_total',
  help: 'Total drift detection events',
  labelNames: ['metric'],
});

// Register metrics
client.register.registerMetric(aiops_feedback_total);
client.register.registerMetric(aiops_remediation_events_total);
client.register.registerMetric(aiops_drift_detections_total);

/**
 * Record feedback metric
 */
export function recordFeedback(metric: string, anomaly: boolean): void {
  aiops_feedback_total.inc({ metric, anomaly: anomaly.toString() });
}

/**
 * Record remediation event
 */
export function recordRemediationEvent(severity: string, status: string): void {
  aiops_remediation_events_total.inc({ severity, status });
}

/**
 * Record drift detection
 */
export function recordDriftDetection(metric: string): void {
  aiops_drift_detections_total.inc({ metric });
}

/**
 * Get AIOps metrics
 */
export const aiopsMetrics = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.set('Content-Type', client.register.contentType);
    const metrics = await client.register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end('Error generating metrics');
  }
};

export { client };

