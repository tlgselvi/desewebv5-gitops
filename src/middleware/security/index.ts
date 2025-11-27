/**
 * Security Middleware Exports
 * 
 * Centralized exports for all security-related middleware
 * @module middleware/security
 */

// Input sanitization and CSP
export { sanitizeInput, cspHeaders, requestSizeLimiter } from '../security.js';

// Dynamic blocking and brute-force protection
export { 
  DynamicBlockingService,
  dynamicBlockingMiddleware,
  loginProtectionMiddleware,
  getBlockingService,
  type BlockingConfig,
} from './dynamic-blocking.js';

// Re-export rate limiting
export { 
  AdvancedRateLimiter,
  type RateLimitRule,
} from '../rate-limit/index.js';

