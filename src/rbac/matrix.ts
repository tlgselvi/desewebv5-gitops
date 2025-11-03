import type { Permission, RoleName } from '@/rbac/types.js';

export const ROLE_MATRIX: Record<RoleName, Permission[]> = {
  admin: [{ resource: '*', action: '*' }],
  viewer: [
    { resource: 'finbot.accounts', action: 'read' },
    { resource: 'finbot.transactions', action: 'read' },
    { resource: 'finbot.budgets', action: 'read' },
  ],
  finance_analyst: [
    { resource: 'finbot.accounts', action: 'read' },
    { resource: 'finbot.transactions', action: 'read' },
    { resource: 'finbot.budgets', action: 'read' },
  ],
  accountant: [
    { resource: 'finbot.accounts', action: 'read' },
    { resource: 'finbot.transactions', action: 'read' },
    { resource: 'finbot.transactions', action: 'write' },
    { resource: 'finbot.budgets', action: 'read' },
    { resource: 'finbot.budgets', action: 'write' },
  ],
  seo_analyst: [
    { resource: 'seo', action: 'read' },
    { resource: 'seo', action: 'write' },
  ],
};

