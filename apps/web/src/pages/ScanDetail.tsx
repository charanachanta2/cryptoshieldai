import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Scan } from '@cryptoshield/shared'
import { useScanStore } from '../stores/scanStore'
import { useReportStore } from '../stores/reportStore'
import { useToast } from '../contexts/ToastContext'
import { RiskBadge } from '../components/RiskBadge'
import { EvidencePanel } from '../components/EvidencePanel'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { RotateCcw, ArrowLeft, AlertCircle, FileText, Clock } from 'lucide-react'
import { formatTimestamp, RISK_LEVELS } from '@cryptoshield/shared'

export function ScanDetail() {
  const { scanId } = useParams<{ scanId: string }>()
  const { currentScan, fetchScan, clearCurrentScan } = useScanStore()
  const { generateReport } = useReportStore()
  const { showToast } = useToast()
  
  const { data: scan, isLoading, refetch } = useQuery({
    queryKey: ['scan', scanId],
    queryFn: async () => {
      const response = await api.get<Scan>(`/scans/${scanId}`)
      return response.data
    },
    enabled: !!scanId,
    staleTime: 1000 * 60,
  })
  
  useEffect(() => {
    if (scanId) {
      fetchScan(scanId)
    }
    return () => clearCurrentScan()
  }, [scanId, fetchScan, clearCurrentScan])
  
  const displayScan = scan || currentScan
  
  const handleGenerateReport = async () => {
    if (!displayScan) return
    try {
      const { id } = await generateReport([displayScan.id])
      showToast({ type: 'success', title: 'Report generation started' })
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
          link.setAttribute('download', `cryptoshield-report-${report.id}.pdf`)
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
  
  if (isLoading && !displayScan) {
    return (
      <div className="max-w-4xl mx-auto">
        <LoadingSpinner size="lg" text="Loading scan details..." overlay />
      </div>
    )
  }
  
  if (!displayScan) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Scan not found</h2>
        <p className="text-gray-500 mt-2">The requested scan could not be found.</p>
      </div>
    )
  }
  
  const riskConfig = RISK_LEVELS[displayScan.risk?.level || 'unknown']
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scan Details</h1>
            <p className="text-gray-500">{displayScan.type.charAt(0).toUpperCase() + displayScan.type.slice(1)} scan on {displayScan.chain}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleGenerateReport} className="btn-secondary">
            <FileText className="w-4 h-4 mr-2" />
            PDF Report
          </button>
          <button onClick={() => refetch()} className="btn-secondary">
            <RotateCcw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Risk Assessment */}
      <div className="card">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-6">
              <RiskBadge
                level={displayScan.risk?.level || 'unknown'}
                score={displayScan.risk?.score}
                confidence={displayScan.risk?.confidence}
                recommendedAction={displayScan.risk?.recommendedAction}
                size="lg"
              />
              <div>
                <p className="text-lg font-medium text-gray-900">{displayScan.risk?.summary || 'No summary available'}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {displayScan.risk?.recommendedAction ? displayScan.risk.recommendedAction.replace('_', ' ') : 'No recommendation'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${riskConfig.color}`}>
                {riskConfig.label}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                {displayScan.status.charAt(0).toUpperCase() + displayScan.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scan Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InfoCard title="Scan ID" value={displayScan.id} icon={FileText} />
        <InfoCard title="Created" value={formatTimestamp(displayScan.createdAt)} icon={Clock} />
        <InfoCard title="Completed" value={displayScan.completedAt ? formatTimestamp(displayScan.completedAt) : 'Pending'} icon={Clock} />
      </div>
      
      {/* Input */}
      <div className="card">
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Scan Input</h3>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <pre>{JSON.stringify(displayScan.input, null, 2)}</pre>
          </div>
        </div>
      </div>
      
      {/* Evidence */}
      <EvidencePanel evidence={displayScan.evidence} />
      
      {/* Data Coverage */}
      <div className="card">
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Data Coverage</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(displayScan.dataCoverage).map(([key, value]) => (
              <div key={key} className="text-center p-4 rounded-lg bg-gray-50">
                <div className={`text-3xl font-bold ${value ? 'text-green-600' : 'text-red-600'}`}>
                  {value ? '✓' : '✗'}
                </div>
                <p className="text-sm text-gray-600 mt-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Versions */}
      <div className="card">
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Versions & Metadata</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <VersionItem label="API" value={displayScan.versions.api} />
            <VersionItem label="Model" value={displayScan.versions.model} />
            <VersionItem label="Rules" value={displayScan.versions.rules} />
            <VersionItem label="Threat Intel" value={displayScan.versions.threatIntel} />
          </div>
        </div>
      </div>
      
      {/* Disclaimer */}
      <div className="card border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-medium">Important Disclaimer</p>
            <p className="mt-1">
              CryptoShield AI provides risk estimates based on available data and models. Results are not guarantees of safety.
              The current models are exploratory and trained on failed transactions only. Always verify transaction details
              independently and consult multiple sources before making decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ title, value, icon: Icon }: { title: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="font-medium text-gray-900 truncate">{value}</p>
        </div>
      </div>
    </div>
  )
}

function VersionItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900 font-mono text-xs">{value}</p>
    </div>
  )
}