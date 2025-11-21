import { logger } from '../utils/logger.js';
/**
 * Audit logging middleware
 * Logs user actions for security and compliance
 */
export const auditMiddleware = (req, res, next) => {
    const reqWithUser = req;
    res.once('finish', () => {
        const userId = reqWithUser.user?.id || 'anonymous';
        const userEmail = reqWithUser.user?.email || 'anonymous';
        const userRole = reqWithUser.user?.role || 'unknown';
        logger.info('Audit Event', {
            action: `${req.method} ${req.path}`,
            userId,
            userEmail,
            userRole,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            statusCode: res.statusCode,
            timestamp: new Date().toISOString(),
        });
    });
    next();
};
//# sourceMappingURL=audit.js.map