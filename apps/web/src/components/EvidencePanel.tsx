import { Evidence, SEVERITY_COLORS } from '@cryptoshield/shared'
import { ChevronDown, ChevronUp, ExternalLink, Shield, FileText, Database, Zap, Users } from 'lucide-react'
import { useState } from 'react'

interface EvidencePanelProps {
  evidence: Evidence[]
  title?: string
  collapsible?: boolean
  defaultExpanded?: boolean
}

const sourceIcons = {
  model: Zap,
  rule: Shield,
  threat_intel: Database,
  provider: FileText,
  user_report: Users,
}

const sourceLabels = {
  model: 'ML Model',
  rule: 'Deterministic Rule',
  threat_intel: 'Threat Intelligence',
  provider: 'Blockchain Provider',
  user_report: 'Community Report',
}

export function EvidencePanel({ evidence, title = 'Evidence', collapsible = true, defaultExpanded = true }: EvidencePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  
  if (evidence.length === 0) {
    return (
      <div className="card">
        <div className="p-6 text-center text-gray-500">
          <p>No evidence available for this scan.</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title} ({evidence.length})</h3>
        {collapsible && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        )}
      </div>
      
      {expanded && (
        <div className="p-4 space-y-3">
          {evidence.map((ev) => (
            <EvidenceItem key={ev.id} evidence={ev} />
          ))}
        </div>
      )}
    </div>
  )
}

function EvidenceItem({ evidence }: { evidence: Evidence }) {
  const [expanded, setExpanded] = useState(false)
  const SourceIcon = sourceIcons[evidence.source]
  const severityColor = SEVERITY_COLORS[evidence.severity]
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${severityColor}`}>
          <SourceIcon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{evidence.title}</h4>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColor}`}>
              {evidence.severity.charAt(0).toUpperCase() + evidence.severity.slice(1)}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
              {sourceLabels[evidence.source]}
            </span>
          </div>
          
          <p className="mt-1 text-sm text-gray-600">{evidence.detail}</p>
          
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
            <span>Confidence: {(evidence.confidence * 100).toFixed(0)}%</span>
            {evidence.code && <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{evidence.code}</span>}
          </div>
        </div>
        
        <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
          {evidence.references && evidence.references.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">References:</p>
              {evidence.references.map((ref, index) => (
                <a
                  key={index}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary-600 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {ref.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
