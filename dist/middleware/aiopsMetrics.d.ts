import { Request, Response } from 'express';
import client from 'prom-client';
/**
 * Record feedback metric
 */
export declare function recordFeedback(metric: string, anomaly: boolean): void;
/**
 * Record remediation event
 */
export declare function recordRemediationEvent(severity: string, status: string): void;
/**
 * Record drift detection
 */
export declare function recordDriftDetection(metric: string): void;
/**
 * Get AIOps metrics
 */
export declare const aiopsMetrics: (_req: Request, res: Response) => Promise<void>;
export { client };
//# sourceMappingURL=aiopsMetrics.d.ts.map