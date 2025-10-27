import { Request, Response, NextFunction } from 'express';
export interface RequestWithUser extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
    requestId?: string;
    startTime?: number;
}
export declare const requestLogger: (req: RequestWithUser, res: Response, next: NextFunction) => void;
//# sourceMappingURL=requestLogger.d.ts.map