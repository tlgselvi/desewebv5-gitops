import { logger } from '../utils/logger.js';
export const requestLogger = (req, res, next) => {
    const reqWithLogger = req;
    // Generate unique request ID
    reqWithLogger.requestId = Math.random().toString(36).substring(2, 15);
    reqWithLogger.startTime = Date.now();
    // Log request
    logger.info('Incoming Request', {
        requestId: reqWithLogger.requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        headers: {
            'content-type': req.get('Content-Type'),
            'authorization': req.get('Authorization') ? '[REDACTED]' : undefined,
        },
    });
    res.once('finish', () => {
        const duration = Date.now() - (reqWithLogger.startTime || Date.now());
        logger.info('Outgoing Response', {
            requestId: reqWithLogger.requestId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            contentLength: res.get('Content-Length'),
        });
    });
    next();
};
//# sourceMappingURL=requestLogger.js.map