import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
declare const register: client.Registry<"text/plain; version=0.0.4; charset=utf-8">;
export declare const prometheusMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const metricsHandler: (_req: Request, res: Response) => Promise<void>;
export declare const recordSeoAnalysis: (projectId: string, analysisType: string) => void;
export declare const recordContentGeneration: (projectId: string, contentType: string) => void;
export declare const recordBacklinkCampaign: (projectId: string, active: boolean) => void;
export declare const recordSeoAlert: (projectId: string, alertType: string, severity: string) => void;
export declare const updateDatabaseConnections: (count: number) => void;
export declare const recordUserAction: (action: string) => void;
export declare const recordTokenRotation: () => void;
export { register };
//# sourceMappingURL=prometheus.d.ts.map