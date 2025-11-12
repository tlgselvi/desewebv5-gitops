import { Request, Response, NextFunction } from "express";
/**
 * Extended Request interface with user information
 */
export interface RequestWithUser extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        permissions?: string[];
    };
}
/**
 * JWT Authentication Middleware
 * Validates JWT token from Authorization header
 */
export declare const authenticate: (req: RequestWithUser, res: Response, next: NextFunction) => void;
/**
 * RBAC Authorization Middleware
 * Checks if user has required role(s) or permission(s)
 */
export declare const authorize: (requiredRolesOrPermissions: string[]) => (req: RequestWithUser, res: Response, next: NextFunction) => void;
/**
 * Optional Authentication Middleware
 * Tries to authenticate but doesn't fail if token is missing
 * Useful for endpoints that work with or without authentication
 */
export declare const optionalAuth: (req: RequestWithUser, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map