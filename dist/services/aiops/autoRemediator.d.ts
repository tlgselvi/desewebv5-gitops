export interface RemediationEvent {
    timestamp: number;
    metric: string;
    action: string;
    severity: 'low' | 'medium' | 'high';
    status: 'executed' | 'pending' | 'failed';
}
export declare class AutoRemediator {
    private logPath;
    constructor(logDir?: string);
    recordEvent(event: RemediationEvent): void;
    suggestAction(metric: string, severity: string): string;
    replay(): RemediationEvent[];
    getRemediationHistory(count?: number): RemediationEvent[];
}
//# sourceMappingURL=autoRemediator.d.ts.map