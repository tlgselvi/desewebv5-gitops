export * from './saas.js';
export * from './finance.js';
export * from './crm.js';
export * from './inventory.js';
export * from './iot.js';
export * from './legacy-seo.js';
export * from './hr.js';
export * from './service.js';

// Re-export commonly used tables with aliases for backward compatibility
export { contacts as leads } from './crm.js';
export { stockLevels as stocks } from './inventory.js';