import { create } from 'zustand'
import { Report, PaginatedResponse } from '@cryptoshield/shared'
import { api } from '../lib/api'

interface ReportState {
  reports: Report[]
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
  }
  
  fetchReports: () => Promise<void>
  generateReport: (scanIds: string[], format?: 'pdf') => Promise<{ id: string; pollUrl: string }>
  fetchReport: (reportId: string) => Promise<Report>
  downloadReport: (reportId: string) => Promise<void>
  deleteReport: (reportId: string) => Promise<void>
  clearError: () => void
}

export const useReportStore = create<ReportState>((set) => ({
  reports: [],
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasNext: false,
  },
  
  clearError: () => set({ error: null }),
  
  fetchReports: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<PaginatedResponse<Report>>('/reports')
      set({ reports: response.data.data, isLoading: false })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch reports'
      set({ error: message, isLoading: false })
    }
  },
  
  generateReport: async (scanIds: string[], format = 'pdf') => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/reports', { scanIds, format, includeEvidence: true })
      return response.data
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to generate report'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  fetchReport: async (reportId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<Report>(`/reports/${reportId}`)
      return response.data
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch report'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  downloadReport: async (reportId: string) => {
    try {
      const response = await api.get(`/reports/${reportId}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `cryptoshield-report-${reportId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to download report'
      set({ error: message })
      throw error
    }
  },
  
  deleteReport: async (reportId: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/reports/${reportId}`)
      set((state) => ({
        reports: state.reports.filter((r) => r.id !== reportId),
        isLoading: false,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete report'
      set({ error: message, isLoading: false })
      throw error
    }
  },
}))
