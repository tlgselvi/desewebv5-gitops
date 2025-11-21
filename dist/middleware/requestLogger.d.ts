import { Request, Response, NextFunction } from 'express';
import type { RequestWithUser } from "./auth.js";
export interface RequestWithLogger extends RequestWithUser {
    requestId?: string;
    startTime?: number;
}
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=requestLogger.d.ts.map