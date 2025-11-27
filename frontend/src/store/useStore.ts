/**
 * Global State Store
 * 
 * Zustand store for application-wide state management.
 * Handles user session, UI preferences, and app-level state.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types/auth';

// =============================================================================
// TYPES
// =============================================================================

interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // UI state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  
  // Actions
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

// =============================================================================
// STORE
// =============================================================================

export const useStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        sidebarOpen: true,
        sidebarCollapsed: false,

        // User actions
        login: (user) => set({ 
          user, 
          isAuthenticated: true 
        }, false, 'login'),
        
        logout: () => set({ 
          user: null, 
          isAuthenticated: false 
        }, false, 'logout'),
        
        updateUser: (updates) => set(
          (state) => ({
            user: state.user ? { ...state.user, ...updates } : null,
          }),
          false,
          'updateUser'
        ),

        // UI actions
        toggleSidebar: () => set(
          (state) => ({ sidebarOpen: !state.sidebarOpen }),
          false,
          'toggleSidebar'
        ),
        
        setSidebarOpen: (open) => set(
          { sidebarOpen: open },
          false,
          'setSidebarOpen'
        ),
        
        setSidebarCollapsed: (collapsed) => set(
          { sidebarCollapsed: collapsed },
          false,
          'setSidebarCollapsed'
        ),
      }),
      {
        name: 'dese-storage',
        // Only persist user-related state
        partialize: (state) => ({ 
          user: state.user, 
          isAuthenticated: state.isAuthenticated,
          sidebarOpen: state.sidebarOpen,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    ),
    { name: 'DeseStore' }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

/**
 * Select user from store
 */
export const selectUser = (state: AppState) => state.user;

/**
 * Select authentication status
 */
export const selectIsAuthenticated = (state: AppState) => state.isAuthenticated;

/**
 * Select user role
 */
export const selectUserRole = (state: AppState): UserRole | null => 
  state.user?.role || null;

/**
 * Select organization ID
 */
export const selectOrganizationId = (state: AppState): string | null => 
  state.user?.organizationId || null;

/**
 * Select sidebar state
 */
export const selectSidebarOpen = (state: AppState) => state.sidebarOpen;

/**
 * Select sidebar collapsed state
 */
export const selectSidebarCollapsed = (state: AppState) => state.sidebarCollapsed;

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to get current user
 */
export function useUser() {
  return useStore(selectUser);
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  return useStore(selectIsAuthenticated);
}

/**
 * Hook to get user role
 */
export function useUserRole() {
  return useStore(selectUserRole);
}

/**
 * Hook to get organization ID
 */
export function useOrganizationId() {
  return useStore(selectOrganizationId);
}

export default useStore;
