import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { ThreatEntity, PaginatedResponse, SEVERITY_COLORS, EvidenceSeverity } from '@cryptoshield/shared'
import { Search, AlertTriangle, Shield, Globe } from 'lucide-react'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { formatRelativeTime } from '@cryptoshield/shared'
import { useToast } from '../contexts/ToastContext'

interface ThreatIntelFilters {
  type?: string
  chain?: string
  q?: string
  page: number
  limit: number
}

export function ScamIntelligence() {
  const { showToast } = useToast()
  const [filters, setFilters] = useState<ThreatIntelFilters>({
    type: '',
    chain: '',
    q: '',
    page: 1,
    limit: 20,
  })
  const [selectedEntity, setSelectedEntity] = useState<ThreatEntity | null>(null)
  
  const { data, isLoading } = useQuery<PaginatedResponse<ThreatEntity>>({
    queryKey: ['threat-intel', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })
      const response = await api.get<PaginatedResponse<ThreatEntity>>(`/threat-intel/entities?${params}`)
      return response.data
    },
    placeholderData: (previousData) => previousData,
  })
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters((prev) => ({ ...prev, page: 1 }))
  }
  
  const handleSubmitReport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    try {
      await api.post('/threat-intel/reports', Object.fromEntries(formData))
      showToast({ type: 'success', title: 'Report submitted', message: 'Thank you for helping keep the community safe' })
      e.currentTarget.reset()
    } catch {
      showToast({ type: 'error', title: 'Failed to submit report' })
    }
  }
  
  const typeOptions = ['wallet', 'token', 'contract', 'domain']
  const chainOptions = ['ethereum', 'sepolia', 'polygon', 'arbitrum', 'optimism']
  
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scam Intelligence Center</h1>
        <p className="text-gray-500 mt-1">
          Search and explore known scam wallets, tokens, contracts, and domains. Submit community reports.
        </p>
      </div>
      
      {/* Search & Filters */}
      <div className="card">
        <div className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search addresses, names, labels..."
                  value={filters.q}
                  onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                  className="input pl-10"
                />
              </div>
              <select
                value={filters.type}
                onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value, page: 1 }))}
                className="input"
              >
                <option value="">All Types</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                ))}
              </select>
              <select
                value={filters.chain}
                onChange={(e) => setFilters((prev) => ({ ...prev, chain: e.target.value, page: 1 }))}
                className="input"
              >
                <option value="">All Chains</option>
                {chainOptions.map((chain) => (
                  <option key={chain} value={chain}>{chain.charAt(0).toUpperCase() + chain.slice(1)}</option>
                ))}
              </select>
            </div>
          </form>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard title="Total Entities" value={data?.meta.total || 0} icon={Shield} color="bg-blue-100 text-blue-600" />
        <StatCard title="Wallets" value={data?.data.filter(e => e.type === 'wallet').length || 0} icon={AlertTriangle} color="bg-red-100 text-red-600" />
        <StatCard title="Tokens" value={data?.data.filter(e => e.type === 'token').length || 0} icon={AlertTriangle} color="bg-yellow-100 text-yellow-600" />
        <StatCard title="Contracts" value={data?.data.filter(e => e.type === 'contract').length || 0} icon={Globe} color="bg-purple-100 text-purple-600" />
      </div>
      
      {/* Results */}
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Threat Database ({data?.meta.total || 0} entries)</h2>
        </div>
        
        {isLoading ? (
          <div className="p-8">
            <LoadingSpinner size="lg" text="Loading threat intelligence..." />
          </div>
        ) : data?.data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No threat entities found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {data?.data.map((entity) => (
                <ThreatEntityRow key={entity.id} entity={entity} onClick={() => setSelectedEntity(entity)} />
              ))}
            </div>
            
            {/* Pagination */}
            {data && data.meta.hasNext && (
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                  className="btn-secondary w-full"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Submit Report Modal */}
      <div className="card">
        <div className="p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Submit Community Report</h2>
          <p className="text-gray-500 mb-4">Help improve the threat database by reporting suspicious addresses.</p>
          <form onSubmit={handleSubmitReport} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Entity Type</label>
                <select name="entityType" required className="input">
                  <option value="">Select type</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Chain</label>
                <select name="chain" required className="input">
                  <option value="">Select chain</option>
                  {chainOptions.map((chain) => (
                    <option key={chain} value={chain}>{chain.charAt(0).toUpperCase() + chain.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Address / Value <span className="text-red-500">*</span></label>
              <input name="value" type="text" required placeholder="0x..." className="input font-mono" />
            </div>
            <div>
              <label className="label">Category</label>
              <select name="category" required className="input">
                <option value="">Select category</option>
                <option value="phishing">Phishing</option>
                <option value="rug_pull">Rug Pull</option>
                <option value="honeypot">Honeypot</option>
                <option value="fake_token">Fake Token</option>
                <option value="malicious_contract">Malicious Contract</option>
                <option value="address_poisoning">Address Poisoning</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea name="description" rows={3} required placeholder="Describe the threat and provide evidence..." className="input" />
            </div>
            <div>
              <label className="label">Evidence URLs (one per line)</label>
              <textarea name="evidenceUrls" rows={2} placeholder="https://example.com/evidence" className="input" />
            </div>
            <button type="submit" className="btn-primary">Submit Report</button>
          </form>
        </div>
      </div>
      
      {/* Detail Modal */}
      {selectedEntity && (
        <ThreatEntityModal entity={selectedEntity} onClose={() => setSelectedEntity(null)} />
      )}
    </div>
  )
}

function ThreatEntityRow({ entity, onClick }: { entity: ThreatEntity; onClick: () => void }) {
  const typeIcons = {
    wallet: AlertTriangle,
    token: AlertTriangle,
    contract: Globe,
    domain: Globe,
  }
  const Icon = typeIcons[entity.type]
  const severityColor = SEVERITY_COLORS[entity.label as EvidenceSeverity] || SEVERITY_COLORS.info
  
  return (
    <div className="p-4 hover:bg-gray-50 cursor-pointer transition-colors" onClick={onClick}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-900 truncate">{entity.value}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColor}`}>{entity.label}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{entity.type}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{entity.chain}</span>
          </div>
          <p className="text-sm text-gray-500 truncate">Confidence: {(entity.confidence * 100).toFixed(0)}% | Status: {entity.status} | {entity.sources.length} source(s)</p>
        </div>
      </div>
    </div>
  )
}

function ThreatEntityModal({ entity, onClose }: { entity: ThreatEntity; onClose: () => void }) {
  const typeIcons = {
    wallet: AlertTriangle,
    token: AlertTriangle,
    contract: Globe,
    domain: Globe,
  }
  const Icon = typeIcons[entity.type]
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Icon className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{entity.type.charAt(0).toUpperCase() + entity.type.slice(1)} Details</h2>
              <p className="font-mono text-sm text-gray-500">{entity.value}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <DetailItem label="Label" value={entity.label} />
            <DetailItem label="Confidence" value={`${(entity.confidence * 100).toFixed(0)}%`} />
            <DetailItem label="Status" value={entity.status} />
            <DetailItem label="Chain" value={entity.chain} />
            <DetailItem label="First Seen" value={formatRelativeTime(entity.firstSeen)} />
            <DetailItem label="Last Seen" value={formatRelativeTime(entity.lastSeen)} />
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Sources</h3>
            <div className="space-y-2">
              {entity.sources.map((source, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{source.name}</p>
                  <p className="text-sm text-gray-500">{source.url}</p>
                  <p className="text-xs text-gray-400">Observed: {formatRelativeTime(source.observedAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
