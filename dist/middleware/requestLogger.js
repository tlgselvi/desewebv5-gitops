import { logger } from '@/utils/logger.js';
export const requestLogger = (req, res, next) => {
    // Generate unique request ID
    req.requestId = Math.random().toString(36).substring(2, 15);
    req.startTime = Date.now();
    // Log request
    logger.info('Incoming Request', {
        requestId: req.requestId,
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
        const duration = Date.now() - (req.startTime || Date.now());
        logger.info('Outgoing Response', {
            requestId: req.requestId,
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