import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@cryptoshield/shared'
import { api } from '../lib/api'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  initializeAuth: () => Promise<void>
  refreshAccessToken: () => Promise<void>
  updateUser: (user: Partial<User>) => void
  clearError: () => void
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  resendVerification: (email: string) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      
      clearError: () => set({ error: null }),
      
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/login', { email, password })
          const { accessToken, refreshToken, user } = response.data
          
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })
          
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Login failed'
          set({ error: message, isLoading: false, isAuthenticated: false })
          throw error
        }
      },
      
      register: async (email: string, password: string, displayName: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/register', { email, password, displayName })
          const { user } = response.data
          
          set({
            user,
            isLoading: false,
          })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Registration failed'
          set({ error: message, isLoading: false })
          throw error
        }
      },
      
      logout: async () => {
        const { refreshToken } = get()
        try {
          if (refreshToken) {
            await api.post('/auth/logout', { refreshToken })
          }
        } finally {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          })
          delete api.defaults.headers.common['Authorization']
        }
      },
      
      initializeAuth: async () => {
        const { refreshToken } = get()
        if (!refreshToken) {
          set({ isLoading: false })
          return
        }
        
        try {
          const response = await api.post('/auth/refresh', { refreshToken })
          const { accessToken, refreshToken: newRefreshToken, user } = response.data
          
          set({
            user,
            accessToken,
            refreshToken: newRefreshToken,
            isAuthenticated: true,
            isLoading: false,
          })
          
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        } catch {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          })
          delete api.defaults.headers.common['Authorization']
        }
      },
      
      refreshAccessToken: async () => {
        const { refreshToken } = get()
        if (!refreshToken) return
        
        try {
          const response = await api.post('/auth/refresh', { refreshToken })
          const { accessToken, refreshToken: newRefreshToken } = response.data
          
          set({
            accessToken,
            refreshToken: newRefreshToken,
          })
          
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        } catch {
          get().logout()
        }
      },
      
      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }))
      },
      
      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null })
        try {
          await api.post('/auth/forgot-password', { email })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to send reset email'
          set({ error: message, isLoading: false })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      
      resetPassword: async (token: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          await api.post('/auth/reset-password', { token, password })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Password reset failed'
          set({ error: message, isLoading: false })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      
      verifyEmail: async (token: string) => {
        set({ isLoading: true, error: null })
        try {
          await api.get('/auth/verify-email', { params: { token } })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Email verification failed'
          set({ error: message, isLoading: false })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      
      resendVerification: async (email: string) => {
        set({ isLoading: true, error: null })
        try {
          await api.post('/auth/resend-verification', { email })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to resend verification email'
          set({ error: message, isLoading: false })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'cryptoshield-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
