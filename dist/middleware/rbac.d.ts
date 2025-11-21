import type { Response, NextFunction } from "express";
import type { RequestWithUser } from "@/middleware/auth.js";
/**
 * RBAC Role-Based Access Control Middleware
 * Checks if user has one of the allowed roles
 *
 * @param allowedRoles - Array of role names that are allowed to access the route
 * @returns Express middleware function
 */
export declare const requireRole: (allowedRoles: string[]) => (req: RequestWithUser, res: Response, next: NextFunction) => void;
//# sourceMappingURL=rbac.d.ts.map