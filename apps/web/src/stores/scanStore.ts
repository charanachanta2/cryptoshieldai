import { create } from 'zustand'
import { Scan, ScanListItem, PaginatedResponse } from '@cryptoshield/shared'
import { api } from '../lib/api'

interface ScanState {
  scans: ScanListItem[]
  currentScan: Scan | null
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
  }
  
  fetchScans: (params?: Record<string, string>) => Promise<void>
  fetchScan: (scanId: string) => Promise<void>
  createWalletScan: (input: { address: string; chain: string; refresh?: boolean }) => Promise<{ id: string; pollUrl: string; eventsUrl: string }>
  createTokenScan: (input: { address: string; chain: string; refresh?: boolean }) => Promise<{ id: string; pollUrl: string; eventsUrl: string }>
  createContractScan: (input: { address: string; chain: string; includeSource?: boolean }) => Promise<{ id: string; pollUrl: string; eventsUrl: string }>
  createTransactionScan: (input: Record<string, unknown>) => Promise<Scan>
  deleteScan: (scanId: string) => Promise<void>
  clearCurrentScan: () => void
  clearError: () => void
}

export const useScanStore = create<ScanState>((set, get) => ({
  scans: [],
  currentScan: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasNext: false,
  },
  
  clearError: () => set({ error: null }),
  
  fetchScans: async (params = {}) => {
    set({ isLoading: true, error: null })
    try {
      const queryParams = new URLSearchParams({
        page: get().pagination.page.toString(),
        limit: get().pagination.limit.toString(),
        ...params,
      })
      
      const response = await api.get<PaginatedResponse<ScanListItem>>(`/scans?${queryParams}`)
      set({
        scans: response.data.data,
        pagination: response.data.meta,
        isLoading: false,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch scans'
      set({ error: message, isLoading: false })
    }
  },
  
  fetchScan: async (scanId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<Scan>(`/scans/${scanId}`)
      set({ currentScan: response.data, isLoading: false })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch scan'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  createWalletScan: async (input) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/scans/wallet', input)
      return response.data
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create wallet scan'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  createTokenScan: async (input) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/scans/token', input)
      return response.data
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create token scan'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  createContractScan: async (input) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/scans/contract', input)
      return response.data
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create contract scan'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  createTransactionScan: async (input) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/scans/transaction', input)
      return response.data
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create transaction scan'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  deleteScan: async (scanId: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/scans/${scanId}`)
      set((state) => ({
        scans: state.scans.filter((s) => s.id !== scanId),
        isLoading: false,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete scan'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  clearCurrentScan: () => set({ currentScan: null }),
}))
