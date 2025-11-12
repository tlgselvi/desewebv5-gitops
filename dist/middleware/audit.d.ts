import { Request, Response, NextFunction } from 'express';
export interface RequestWithUser extends Request {
    user?: {
        id: string;
        email: string;
        role?: string;
    };
}
/**
 * Audit logging middleware
 * Logs user actions for security and compliance
 */
export declare const auditMiddleware: (req: RequestWithUser, res: Response, next: NextFunction) => void;
//# sourceMappingURL=audit.d.ts.map