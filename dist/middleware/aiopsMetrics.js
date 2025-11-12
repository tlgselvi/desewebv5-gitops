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
export function recordFeedback(metric, anomaly) {
    aiops_feedback_total.inc({ metric, anomaly: anomaly.toString() });
}
/**
 * Record remediation event
 */
export function recordRemediationEvent(severity, status) {
    aiops_remediation_events_total.inc({ severity, status });
}
/**
 * Record drift detection
 */
export function recordDriftDetection(metric) {
    aiops_drift_detections_total.inc({ metric });
}
/**
 * Get AIOps metrics
 */
export const aiopsMetrics = async (_req, res) => {
    try {
        res.set('Content-Type', client.register.contentType);
        const metrics = await client.register.metrics();
        res.end(metrics);
    }
    catch {
        res.status(500).end('Error generating metrics');
    }
};
export { client };
//# sourceMappingURL=aiopsMetrics.js.map