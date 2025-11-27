"use client";

/**
 * Protected Route Component
 * 
 * Provides authentication and authorization protection for routes.
 * Shows loading state during auth check to prevent content flash.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getUserRole, isAuthenticated } from "@/lib/auth";
import { Loading } from "@/components/ui/loading";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// =============================================================================
// TYPES
// =============================================================================

type AuthState = 'loading' | 'authorized' | 'unauthorized' | 'forbidden';

interface ProtectedRouteProps {
  /** Child components to render when authorized */
  children: ReactNode;
  /** Roles allowed to access this route (empty = any authenticated user) */
  roles?: string[];
  /** Custom loading component */
  fallback?: ReactNode;
  /** Redirect URL for unauthenticated users (default: /login) */
  redirectTo?: string;
  /** Whether to preserve the current URL for redirect after login */
  preserveRedirect?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Protected Route wrapper that handles authentication and authorization
 * 
 * @example
 * // Require authentication only
 * <ProtectedRoute>
 *   <DashboardPage />
 * </ProtectedRoute>
 * 
 * @example
 * // Require specific roles
 * <ProtectedRoute roles={['admin', 'manager']}>
 *   <AdminPage />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({ 
  children, 
  roles,
  fallback,
  redirectTo = "/login",
  preserveRedirect = true,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const checkAuth = () => {
      // Check if user is authenticated
      if (!isAuthenticated()) {
        setAuthState('unauthorized');
        
        // Build redirect URL
        const redirectUrl = preserveRedirect 
          ? `${redirectTo}?redirect=${encodeURIComponent(pathname)}`
          : redirectTo;
        
        router.push(redirectUrl);
        return;
      }

      // Check role-based access
      if (roles && roles.length > 0) {
        const userRole = getUserRole();
        
        if (!userRole) {
          setAuthState('forbidden');
          setErrorMessage('Rol bilgisi alınamadı.');
          return;
        }

        if (!roles.includes(userRole)) {
          setAuthState('forbidden');
          setErrorMessage(`Bu sayfaya erişim yetkiniz bulunmuyor. Gerekli roller: ${roles.join(', ')}`);
          return;
        }
      }

      // All checks passed
      setAuthState('authorized');
    };

    checkAuth();
  }, [router, roles, redirectTo, pathname, preserveRedirect]);

  // Loading state
  if (authState === 'loading') {
    return fallback || (
      <div className="flex h-screen items-center justify-center">
        <Loading variant="spinner" size="lg" />
      </div>
    );
  }

  // Unauthorized - redirect is happening, show nothing or minimal loading
  if (authState === 'unauthorized') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loading variant="spinner" size="lg" />
        <span className="ml-3 text-muted-foreground">Yönlendiriliyor...</span>
      </div>
    );
  }

  // Forbidden - user is authenticated but doesn't have required role
  if (authState === 'forbidden') {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4 p-4">
        <AlertTriangle className="h-16 w-16 text-warning-500" />
        <h1 className="text-2xl font-bold">Erişim Engellendi</h1>
        <p className="text-muted-foreground text-center max-w-md">
          {errorMessage}
        </p>
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
          >
            Geri Dön
          </Button>
          <Button 
            onClick={() => router.push('/dashboard')}
          >
            Ana Sayfaya Git
          </Button>
        </div>
      </div>
    );
  }

  // Authorized - render children
  return <>{children}</>;
}

// =============================================================================
// HOC VERSION
// =============================================================================

/**
 * Higher-order component version of ProtectedRoute
 * 
 * @example
 * export default withAuth(AdminPage, { roles: ['admin'] });
 */
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };
}
