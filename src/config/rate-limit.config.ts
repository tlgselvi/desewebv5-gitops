import { RateLimitRule } from '@/middleware/rate-limit/advanced-rate-limit.js';

// Default rate limit configuration
export const defaultRateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: 'Too many requests, please try again later.',
};

// IP-based rate limiting
export const ipBasedRateLimit: RateLimitRule = {
  keyPrefix: 'ip',
  points: 1000,
  duration: 60,
  errorMessage: 'Too many requests from this IP address',
};

// User-based rate limiting
export const userBasedRateLimit: RateLimitRule = {
  keyPrefix: 'user',
  points: 500,
  duration: 60,
  errorMessage: 'Too many requests from this user',
};

// Organization-based rate limiting
export const organizationBasedRateLimit: RateLimitRule = {
  keyPrefix: 'org',
  points: 2000,
  duration: 60,
  errorMessage: 'Organization rate limit exceeded',
};

// Get organization rate limit based on tier
export function getOrganizationRateLimit(tier: string): RateLimitRule {
  const tierLimits: Record<string, number> = {
    free: 100,
    starter: 500,
    pro: 2000,
    enterprise: 10000,
  };
  
  return {
    keyPrefix: `org:${tier}`,
    points: tierLimits[tier] || 100,
    duration: 60,
    errorMessage: `${tier} tier rate limit exceeded`,
  };
}

export const endpointRateLimitRules: RateLimitRule[] = [
  // Global IP limit: 1000 req/min
  {
    keyPrefix: 'global',
    points: 1000,
    duration: 60,
    errorMessage: 'Too many requests from this IP',
  },
  // Auth endpoints: 5 req/min (brute force protection)
  {
    keyPrefix: 'endpoint:auth',
    points: 5,
    duration: 60,
    blockDuration: 300, // Block for 5 minutes
    errorMessage: 'Too many login attempts, please try again in 5 minutes',
  },
];

export function createOrganizationTierRules(): RateLimitRule[] {
  return [
    // Free Tier: 100 req/min
    {
      keyPrefix: 'org:free',
      points: 100,
      duration: 60,
      errorMessage: 'Free tier rate limit exceeded',
    },
    // Starter Tier: 500 req/min
    {
      keyPrefix: 'org:starter',
      points: 500,
      duration: 60,
      errorMessage: 'Starter tier rate limit exceeded',
    },
    // Pro Tier: 2000 req/min
    {
      keyPrefix: 'org:pro',
      points: 2000,
      duration: 60,
      errorMessage: 'Pro tier rate limit exceeded',
    },
    // Enterprise Tier: 10000 req/min
    {
      keyPrefix: 'org:enterprise',
      points: 10000,
      duration: 60,
      errorMessage: 'Enterprise tier rate limit exceeded',
    },
  ];
}
