// SaaS Module Schemas
export * from './saas/core.js';
export * from './saas/plans.js';
export * from './saas/subscriptions.js';
export * from './saas/usage.js';
export * from './saas/invoices.js';
export * from './saas/payments.js';

// Other Modules
export * from './finance.js';
export * from './crm.js';
export * from './inventory.js';
export * from './iot.js';
export * from './seo.js';
// Note: legacy-seo.js removed - merged into seo.js
export * from './hr.js';
export * from './service.js';
export * from './vector.js'; // Vector DB schemas
export * from './storage.js'; // Storage & Files schemas

// Security Schemas
export * from './security/rate-limit-tracking.js';

// Re-export commonly used tables with aliases for backward compatibility
export { contacts as leads } from './crm.js';
export { stockLevels as stocks } from './inventory.js';