/**
 * Authentication Types
 * 
 * Type definitions for authentication and authorization.
 */

// =============================================================================
// USER TYPES
// =============================================================================

/**
 * Available user roles in the system
 */
export type UserRole = 
  | 'super_admin'
  | 'admin' 
  | 'manager'
  | 'user'
  | 'accountant'
  | 'sales'
  | 'warehouse_manager'
  | 'hr'
  | 'technician';

/**
 * User object returned from authentication
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  organizationId?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  iat: number;
  exp: number;
  iss?: string;
}

// =============================================================================
// AUTH RESPONSE TYPES
// =============================================================================

/**
 * Login request payload
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Login response from server
 */
export interface LoginResponse {
  success: boolean;
  token?: string;
  access_token?: string;
  user?: User;
  message?: string;
  error?: string;
  googleOAuthUrl?: string;
}

/**
 * OAuth callback response
 */
export interface OAuthCallbackResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

/**
 * Token refresh response
 */
export interface RefreshTokenResponse {
  success: boolean;
  token: string;
  expiresIn: number;
}

// =============================================================================
// SESSION TYPES
// =============================================================================

/**
 * Session state in the store
 */
export interface SessionState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Auth store actions
 */
export interface AuthActions {
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

// =============================================================================
// PERMISSION TYPES
// =============================================================================

/**
 * Resource types that can have permissions
 */
export type Resource = 
  | 'dashboard'
  | 'finance'
  | 'crm'
  | 'hr'
  | 'inventory'
  | 'iot'
  | 'settings'
  | 'admin'
  | 'super_admin';

/**
 * Permission actions
 */
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'manage';

/**
 * Permission definition
 */
export interface Permission {
  resource: Resource;
  action: PermissionAction;
}

/**
 * Role-based permission mapping
 */
export const RolePermissions: Record<UserRole, Permission[]> = {
  super_admin: [
    { resource: 'dashboard', action: 'manage' },
    { resource: 'finance', action: 'manage' },
    { resource: 'crm', action: 'manage' },
    { resource: 'hr', action: 'manage' },
    { resource: 'inventory', action: 'manage' },
    { resource: 'iot', action: 'manage' },
    { resource: 'settings', action: 'manage' },
    { resource: 'admin', action: 'manage' },
    { resource: 'super_admin', action: 'manage' },
  ],
  admin: [
    { resource: 'dashboard', action: 'manage' },
    { resource: 'finance', action: 'manage' },
    { resource: 'crm', action: 'manage' },
    { resource: 'hr', action: 'manage' },
    { resource: 'inventory', action: 'manage' },
    { resource: 'iot', action: 'manage' },
    { resource: 'settings', action: 'manage' },
    { resource: 'admin', action: 'view' },
  ],
  manager: [
    { resource: 'dashboard', action: 'view' },
    { resource: 'finance', action: 'view' },
    { resource: 'crm', action: 'manage' },
    { resource: 'hr', action: 'view' },
    { resource: 'inventory', action: 'view' },
    { resource: 'iot', action: 'view' },
    { resource: 'settings', action: 'view' },
  ],
  user: [
    { resource: 'dashboard', action: 'view' },
  ],
  accountant: [
    { resource: 'dashboard', action: 'view' },
    { resource: 'finance', action: 'manage' },
  ],
  sales: [
    { resource: 'dashboard', action: 'view' },
    { resource: 'crm', action: 'manage' },
  ],
  warehouse_manager: [
    { resource: 'dashboard', action: 'view' },
    { resource: 'inventory', action: 'manage' },
  ],
  hr: [
    { resource: 'dashboard', action: 'view' },
    { resource: 'hr', action: 'manage' },
  ],
  technician: [
    { resource: 'dashboard', action: 'view' },
    { resource: 'iot', action: 'manage' },
  ],
};

/**
 * Check if a role has permission for a resource action
 */
export function hasPermission(
  role: UserRole, 
  resource: Resource, 
  action: PermissionAction
): boolean {
  const permissions = RolePermissions[role] || [];
  return permissions.some(p => 
    p.resource === resource && 
    (p.action === action || p.action === 'manage')
  );
}

