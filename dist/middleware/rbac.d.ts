import type { Request, Response, NextFunction } from "express";
/**
 * RBAC Role-Based Access Control Middleware
 * Checks if user has one of the allowed roles
 *
 * @param allowedRoles - Array of role names that are allowed to access the route
 * @returns Express middleware function
 */
export declare const requireRole: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=rbac.d.ts.map