import { Request, Response, NextFunction } from "express";
/**
 * Extended Request interface with user information
 * Uses Omit to override Express's built-in user property (from Passport.js)
 */
export interface RequestWithUser extends Omit<Request, 'user'> {
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
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => void;
/**
 * RBAC Authorization Middleware
 * Checks if user has required role(s) or permission(s)
 */
export declare const authorize: (requiredRolesOrPermissions: string[]) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Optional Authentication Middleware
 * Tries to authenticate but doesn't fail if token is missing
 * Useful for endpoints that work with or without authentication
 */
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map