import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface AppState {
  user: {
    id: string
    email: string
    name: string
    role: string
    organizationId?: string
  } | null
  isAuthenticated: boolean
  sidebarOpen: boolean
  
  // Actions
  login: (user: AppState['user']) => void
  logout: () => void
  toggleSidebar: () => void
}

export const useStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,
        sidebarOpen: true,

        login: (user) => set({ user, isAuthenticated: true }),
        logout: () => set({ user: null, isAuthenticated: false }),
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      }),
      {
        name: 'dese-storage',
        partialize: (state) => ({ 
          user: state.user, 
          isAuthenticated: state.isAuthenticated,
          sidebarOpen: state.sidebarOpen 
        }),
      }
    )
  )
)
