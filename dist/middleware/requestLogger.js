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
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
        const duration = Date.now() - (req.startTime || 0);
        logger.info('Outgoing Response', {
            requestId: req.requestId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            contentLength: res.get('Content-Length'),
        });
        // Call original end method
        originalEnd.call(this, chunk, encoding);
    };
    next();
};
//# sourceMappingURL=requestLogger.js.map