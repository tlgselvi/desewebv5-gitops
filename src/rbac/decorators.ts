import type { Action, Resource } from '@/rbac/types.js';
import { authorize } from '@/rbac/authorize.js';
import { authenticate } from '@/middleware/auth.js';

export function withAuth(resource: Resource, action: Action) {
  return [authenticate, authorize({ resource, action })];
}

