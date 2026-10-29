import { create } from 'zustand'
import { WatchlistItem, Alert, PaginatedResponse } from '@cryptoshield/shared'
import { api } from '../lib/api'

interface WatchlistState {
  items: WatchlistItem[]
  alerts: Alert[]
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
  }
  
  fetchWatchlist: () => Promise<void>
  fetchAlerts: (watchId?: string) => Promise<void>
  addWatchlistItem: (input: Omit<WatchlistItem, 'id' | 'userId' | 'createdAt' | 'lastCheckedAt' | 'lastRiskLevel'>) => Promise<void>
  updateWatchlistItem: (watchId: string, updates: Partial<WatchlistItem>) => Promise<void>
  deleteWatchlistItem: (watchId: string) => Promise<void>
  markAlertRead: (alertId: string) => Promise<void>
  clearError: () => void
}

export const useWatchlistStore = create<WatchlistState>((set) => ({
  items: [],
  alerts: [],
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasNext: false,
  },
  
  clearError: () => set({ error: null }),
  
  fetchWatchlist: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<PaginatedResponse<WatchlistItem>>('/watchlist')
      set({ items: response.data.data, isLoading: false })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch watchlist'
      set({ error: message, isLoading: false })
    }
  },
  
  fetchAlerts: async (watchId?: string) => {
    set({ isLoading: true, error: null })
    try {
      const url = watchId ? `/watchlist/${watchId}/alerts` : '/alerts'
      const response = await api.get<PaginatedResponse<Alert>>(url)
      set({ alerts: response.data.data, isLoading: false })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch alerts'
      set({ error: message, isLoading: false })
    }
  },
  
  addWatchlistItem: async (input) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/watchlist', input)
      set((state) => ({
        items: [response.data, ...state.items],
        isLoading: false,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add watchlist item'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  updateWatchlistItem: async (watchId: string, updates: Partial<WatchlistItem>) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.patch(`/watchlist/${watchId}`, updates)
      set((state) => ({
        items: state.items.map((item) => (item.id === watchId ? response.data : item)),
        isLoading: false,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update watchlist item'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  deleteWatchlistItem: async (watchId: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/watchlist/${watchId}`)
      set((state) => ({
        items: state.items.filter((item) => item.id !== watchId),
        isLoading: false,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete watchlist item'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  markAlertRead: async (alertId: string) => {
    try {
      await api.post(`/alerts/${alertId}/read`)
      set((state) => ({
        alerts: state.alerts.map((alert) =>
          alert.id === alertId ? { ...alert, readAt: new Date().toISOString() } : alert
        ),
      }))
    } catch (error: unknown) {
      console.error('Failed to mark alert as read:', error)
    }
  },
}))
