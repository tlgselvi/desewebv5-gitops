import { logger } from "@/utils/logger.js";
import { CustomError } from "@/middleware/errorHandler.js";
/**
 * RBAC Role-Based Access Control Middleware
 * Checks if user has one of the allowed roles
 *
 * @param allowedRoles - Array of role names that are allowed to access the route
 * @returns Express middleware function
 */
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new CustomError("User not authenticated", 401);
            }
            const { role } = req.user;
            // Check if user has one of the allowed roles
            if (!allowedRoles.includes(role)) {
                logger.warn("Role-based authorization failed", {
                    userId: req.user.id,
                    userRole: role,
                    allowedRoles,
                    path: req.path,
                    method: req.method,
                });
                throw new CustomError(`Insufficient permissions. Required roles: ${allowedRoles.join(", ")}`, 403);
            }
            logger.debug("Role-based authorization successful", {
                userId: req.user.id,
                role,
                allowedRoles,
            });
            next();
        }
        catch (error) {
            if (error instanceof CustomError) {
                next(error);
            }
            else {
                logger.error("Role-based authorization error", {
                    error: error instanceof Error ? error.message : String(error),
                    path: req.path,
                    method: req.method,
                });
                next(new CustomError("Authorization failed", 403));
            }
        }
    };
};
//# sourceMappingURL=rbac.js.map