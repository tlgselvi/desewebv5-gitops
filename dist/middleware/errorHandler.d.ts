import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}
export declare class CustomError extends Error implements AppError {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode?: number, isOperational?: boolean);
}
export declare const createError: (message: string, statusCode?: number) => AppError;
interface RequestWithUser extends Request {
    user?: {
        id?: string;
    };
}
export declare const errorHandler: (error: unknown, req: RequestWithUser, res: Response, _next: NextFunction) => void;
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=errorHandler.d.ts.map