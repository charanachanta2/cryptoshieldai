import { useState, useEffect } from 'react'
import { useScanStore } from '../stores/scanStore'
import { ScanCard } from '../components/ScanCard'
import { Search, Filter, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { useReportStore } from '../stores/reportStore'
import { useToast } from '../contexts/ToastContext'
import { api } from '../lib/api'
import { RiskLevel, RISK_LEVELS } from '@cryptoshield/shared'

export function History() {
  const { scans, fetchScans } = useScanStore()
  const { generateReport } = useReportStore()
  const { showToast } = useToast()
  const [filters, setFilters] = useState({
    type: '',
    chain: '',
    riskLevel: '',
    status: '',
    sort: 'createdAt',
    order: 'desc' as 'asc' | 'desc',
    page: 1,
    limit: 20,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedScans, setSelectedScans] = useState<string[]>([])
  
  useEffect(() => {
    const stringFilters: Record<string, string> = {
      ...filters,
      page: filters.page.toString(),
      limit: filters.limit.toString(),
    }
    fetchScans(stringFilters)
  }, [filters, fetchScans])
  
  const handleGenerateReport = async () => {
    if (selectedScans.length === 0) return
    try {
      const { id } = await generateReport(selectedScans)
      showToast({ type: 'success', title: 'Report generation started' })
      setSelectedScans([])
      // Poll for completion
      pollReport(id)
    } catch {
      showToast({ type: 'error', title: 'Failed to generate report' })
    }
  }
  
  const pollReport = async (reportId: string) => {
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      try {
        const report = await useReportStore.getState().fetchReport(reportId)
        if (report.status === 'completed') {
          showToast({ type: 'success', title: 'Report ready', message: 'Downloading...' })
          const downloadResponse = await api.get(`/reports/${reportId}/download`, { responseType: 'blob' })
          const url = window.URL.createObjectURL(new Blob([downloadResponse.data]))
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', `cryptoshield-report-${reportId}.pdf`)
          document.body.appendChild(link)
          link.click()
          link.remove()
          window.URL.revokeObjectURL(url)
          break
        }
        if (report.status === 'failed') {
          showToast({ type: 'error', title: 'Report generation failed' })
          break
        }
      } catch {
        break
      }
    }
  }
  
  const riskLevels: RiskLevel[] = ['safe', 'medium', 'high', 'unknown']
  
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scan History</h1>
          <p className="text-gray-500 mt-1">View and manage all your security scans</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedScans.length > 0 && (
            <button onClick={handleGenerateReport} className="btn-primary">
              <Download className="w-4 h-4 mr-2" />
              Generate Report ({selectedScans.length})
            </button>
          )}
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div className="card p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="label">Search</label>
              <input
                type="text"
                placeholder="Address, hash..."
                className="input"
                // TODO: Add search functionality
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
                className="input"
              >
                <option value="">All Types</option>
                <option value="wallet">Wallet</option>
                <option value="token">Token</option>
                <option value="contract">Contract</option>
                <option value="transaction">Transaction</option>
              </select>
            </div>
            <div>
              <label className="label">Chain</label>
              <select
                value={filters.chain}
                onChange={(e) => setFilters({ ...filters, chain: e.target.value, page: 1 })}
                className="input"
              >
                <option value="">All Chains</option>
                <option value="ethereum">Ethereum</option>
                <option value="sepolia">Sepolia</option>
                <option value="polygon">Polygon</option>
                <option value="arbitrum">Arbitrum</option>
                <option value="optimism">Optimism</option>
              </select>
            </div>
            <div>
              <label className="label">Risk Level</label>
              <select
                value={filters.riskLevel}
                onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value, page: 1 })}
                className="input"
              >
                <option value="">All Levels</option>
                {riskLevels.map((level) => (
                  <option key={level} value={level}>{RISK_LEVELS[level].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                className="input"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="partial">Partial</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="label">Sort</label>
              <select
                value={filters.sort}
                onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                className="input"
              >
                <option value="createdAt">Date</option>
                <option value="riskLevel">Risk Level</option>
                <option value="type">Type</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilters({ ...filters, order: filters.order === 'asc' ? 'desc' : 'asc' })}
              className="btn-secondary text-sm"
            >
              {filters.order === 'asc' ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              {filters.order === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          </div>
        </div>
      )}
      
      {/* Scans List */}
      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Scans ({scans.length} shown, {scans.length} total)</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            Page {filters.page}
            {scans.length === 20 && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="btn-secondary text-sm"
              >
                Load More
              </button>
            )}
          </div>
        </div>
        
        {scans.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No scans found</h3>
            <p className="text-gray-500 mt-1">Start scanning wallets, tokens, contracts, or transactions</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {scans.map((scan) => (
                <ScanCard
                  key={scan.id}
                  scan={scan}
                  showActions={true}
                />
              ))}
            </div>
            
            {scans.length === 20 && (
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                  className="btn-secondary w-full"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
