import { Request, Response, NextFunction } from 'express';
/**
 * Input sanitization middleware
 * Removes potentially dangerous characters from request body, query, and params
 */
export declare const sanitizeInput: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Content Security Policy headers middleware
 */
export declare const cspHeaders: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Request size limiter middleware factory
 */
export declare const requestSizeLimiter: (maxSize: number) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=security.d.ts.map