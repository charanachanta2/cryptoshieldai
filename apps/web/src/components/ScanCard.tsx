import { Scan, ScanListItem, EvidenceSeverity, Evidence } from '@cryptoshield/shared'
import { formatRelativeTime, formatAddress, RISK_LEVELS, SEVERITY_COLORS } from '@cryptoshield/shared'
import { ChevronRight, AlertCircle, Info, Clock, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useReportStore } from '../stores/reportStore'
import { useToast } from '../contexts/ToastContext'

interface ScanCardProps {
  scan: ScanListItem | Scan
  onClick?: () => void
  showActions?: boolean
}

export function ScanCard({ scan, onClick, showActions = true }: ScanCardProps) {
  const navigate = useNavigate()
  const { generateReport } = useReportStore()
  const { showToast } = useToast()
  const riskLevel = 'riskLevel' in scan ? scan.riskLevel : scan.risk?.level || 'unknown'
  const riskConfig = RISK_LEVELS[riskLevel]
  
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      navigate(`/scans/${scan.id}`)
    }
  }
  
  const handleGenerateReport = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const { id } = await generateReport([scan.id])
      showToast({ type: 'success', title: 'Report queued', message: 'Your report is being generated' })
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
  
  const getSeverityIcon = (severity: EvidenceSeverity) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'low':
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />
      default:
        return <Info className="w-4 h-4 text-gray-500" />
    }
  }
  
  const evidence = 'evidence' in scan ? scan.evidence : []
  const topEvidence = evidence.slice(0, 3)
  
  return (
    <div
      className="card hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`badge ${riskConfig.color.replace('text-', '').replace('bg-', 'bg-')}`}
              >
                {riskConfig.label}
              </span>
              <span className="text-sm text-gray-500">
                {scan.type.charAt(0).toUpperCase() + scan.type.slice(1)} Scan
              </span>
              <span className="text-sm text-gray-400">{scan.chain}</span>
            </div>
            
            {('input' in scan && scan.input) && (
              <div className="mt-2 font-mono text-sm text-gray-600 break-all">
                {scan.type === 'transaction'
                  ? `From: ${formatAddress((scan.input as any).from)} → To: ${formatAddress((scan.input as any).to)}`
                  : 'address' in scan.input && scan.input.address
                  ? formatAddress(scan.input.address)
                  : 'Unknown'}
              </div>
            )}
            
            {('summary' in scan && scan.summary) && (
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{scan.summary}</p>
            )}
            
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatRelativeTime(scan.createdAt)}
              </span>
              {scan.status !== 'completed' && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                </span>
              )}
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleGenerateReport}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                title="Generate PDF report"
              >
                <Download className="w-4 h-4" />
              </button>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
          )}
        </div>
        
        {/* Evidence preview */}
        {topEvidence.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <span>Top signals:</span>
              {evidence.length > 3 && (
                <span className="text-primary-600">+{evidence.length - 3} more</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {topEvidence.map((ev: Evidence) => (
                <span
                  key={ev.id}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${SEVERITY_COLORS[ev.severity]}`}
                >
                  {getSeverityIcon(ev.severity)}
                  <span className="truncate max-w-[150px]">{ev.title}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
