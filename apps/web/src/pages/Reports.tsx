import { useState, useEffect } from 'react'
import { useReportStore } from '../stores/reportStore'
import { useScanStore } from '../stores/scanStore'
import { useToast } from '../contexts/ToastContext'
import { FileText, Download, Trash2, Loader2, Clock, CheckCircle, XCircle, Plus } from 'lucide-react'
import { formatRelativeTime } from '@cryptoshield/shared'
import { Report as ReportType, ScanListItem } from '@cryptoshield/shared'

export function Reports() {
  const { reports, fetchReports, generateReport, downloadReport, deleteReport } = useReportStore()
  const { scans, fetchScans } = useScanStore()
  const { showToast } = useToast()
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedScans, setSelectedScans] = useState<string[]>([])
  
  useEffect(() => {
    fetchReports()
    fetchScans()
  }, [fetchReports, fetchScans])
  
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedScans.length === 0) return
    try {
      const { id } = await generateReport(selectedScans)
      showToast({ type: 'success', title: 'Report generation started' })
      setShowGenerateModal(false)
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
          showToast({ type: 'success', title: 'Report ready', message: 'Click to download' })
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
  
  const handleDownload = async (reportId: string) => {
    try {
      await downloadReport(reportId)
    } catch {
      showToast({ type: 'error', title: 'Failed to download report' })
    }
  }
  
  const handleDelete = async (reportId: string) => {
    if (!confirm('Delete this report?')) return
    try {
      await deleteReport(reportId)
      showToast({ type: 'success', title: 'Report deleted' })
    } catch {
      // Error handled in store
    }
  }
  
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investigation & Reports</h1>
          <p className="text-gray-500 mt-1">Generate and download PDF reports for your security scans</p>
        </div>
        <button onClick={() => setShowGenerateModal(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Generate Report
        </button>
      </div>
      
      {/* Generate Report Modal */}
      {showGenerateModal && (
        <GenerateReportModal
          isOpen={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          scans={scans}
          selectedScans={selectedScans}
          setSelectedScans={setSelectedScans}
          onSubmit={handleGenerate}
        />
      )}
      
      {/* Reports List */}
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Your Reports ({reports.length})</h2>
        </div>
        
        {reports.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No reports yet</h3>
            <p className="text-gray-500 mt-1">Generate a report from your scan history</p>
            <button onClick={() => setShowGenerateModal(true)} className="btn-primary mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Generate First Report
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                onDownload={handleDownload}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ReportRow({ report, onDownload, onDelete }: { report: ReportType; onDownload: (id: string) => void; onDelete: (id: string) => void }) {
  const statusConfig = {
    completed: { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'Ready' },
    generating: { icon: Loader2, color: 'text-blue-600 bg-blue-100', label: 'Generating' },
    queued: { icon: Clock, color: 'text-yellow-600 bg-yellow-100', label: 'Queued' },
    failed: { icon: XCircle, color: 'text-red-600 bg-red-100', label: 'Failed' },
  }
  
  const config = statusConfig[report.status]
  const Icon = config.icon
  
  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">Report {report.id.slice(-8)}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
              <Icon className="w-3 h-3 mr-1" />
              {config.label}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {report.scanIds.length} scan{report.scanIds.length !== 1 ? 's' : ''} • {formatRelativeTime(report.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report.status === 'completed' && (
            <button onClick={() => onDownload(report.id)} className="btn-secondary text-sm">
              <Download className="w-4 h-4 mr-1" />
              Download
            </button>
          )}
          {report.status === 'generating' || report.status === 'queued' ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          ) : report.status === 'failed' ? (
            <span className="text-sm text-red-600">Generation failed</span>
          ) : null}
          <button onClick={() => onDelete(report.id)} className="p-2 text-gray-500 hover:text-red-600" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function GenerateReportModal({ isOpen, onClose, scans, selectedScans, setSelectedScans, onSubmit }: {
  isOpen: boolean
  onClose: () => void
  scans: ScanListItem[]
  selectedScans: string[]
  setSelectedScans: (scans: string[]) => void
  onSubmit: (e: React.FormEvent) => void
}) {
  if (!isOpen) return null
  
  const completedScans = scans.filter(s => s.status === 'completed')
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Generate PDF Report</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <p className="text-gray-600">Select scans to include in the report</p>
          
          {completedScans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No completed scans available. Complete a scan first.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {completedScans.map((scan) => (
                <label key={scan.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScans.includes(scan.id)}
                    onChange={(e) => setSelectedScans(
                      e.target.checked
                        ? [...selectedScans, scan.id]
                        : selectedScans.filter(id => id !== scan.id)
                    )}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{scan.type} scan</p>
                    <p className="text-sm text-gray-500 font-mono">{scan.summary || 'Transaction'}</p>
                  </div>
                  <span className="text-sm text-gray-500">{formatRelativeTime(scan.createdAt)}</span>
                </label>
              ))}
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={selectedScans.length === 0} className="btn-primary flex-1">
              Generate PDF Report
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
