/**
 * Input sanitization middleware
 * Removes potentially dangerous characters from request body, query, and params
 */
export const sanitizeInput = (req, res, next) => {
    // Sanitize query parameters
    if (req.query) {
        for (const key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '');
            }
        }
    }
    // Sanitize body (if it's a string)
    if (req.body && typeof req.body === 'string') {
        req.body = req.body
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
    }
    next();
};
/**
 * Content Security Policy headers middleware
 */
export const cspHeaders = (req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
};
/**
 * Request size limiter middleware factory
 */
export const requestSizeLimiter = (maxSize) => {
    return (req, res, next) => {
        const contentLength = req.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > maxSize) {
            res.status(413).json({
                error: 'Payload Too Large',
                message: `Request body size exceeds maximum allowed size of ${maxSize} bytes`,
            });
            return;
        }
        next();
    };
};
//# sourceMappingURL=security.js.map