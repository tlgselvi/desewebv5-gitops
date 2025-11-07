import winston from 'winston';
export declare const logger: winston.Logger;
export declare const createModuleLogger: (module: string) => winston.Logger;
export declare const seoLogger: winston.Logger;
export declare const contentLogger: winston.Logger;
export declare const analyticsLogger: winston.Logger;
export declare const monitoringLogger: winston.Logger;
export declare const securityLogger: winston.Logger;
type LogMetadata = Record<string, unknown>;
export declare const logPerformance: (operation: string, startTime: number, metadata?: LogMetadata) => void;
export declare const logError: (error: Error, context?: LogMetadata) => void;
export declare const logAudit: (action: string, userId?: string, metadata?: LogMetadata) => void;
export {};
//# sourceMappingURL=logger.d.ts.map