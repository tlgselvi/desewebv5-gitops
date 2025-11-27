import { test as base, expect } from '@playwright/test';

// Extend basic test with custom fixtures if needed
export const test = base.extend({
  // Add custom fixtures here
});

export { expect };

