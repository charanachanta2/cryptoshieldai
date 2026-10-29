import { useState, useEffect } from 'react'
import { useWatchlistStore } from '../stores/watchlistStore'
import { useToast } from '../contexts/ToastContext'
import { Plus, Bell, Trash2, Eye, Shield, Coins, FileText } from 'lucide-react'
import { formatRelativeTime, formatAddress } from '@cryptoshield/shared'
import { WatchlistItem, Alert, RISK_LEVELS, EvidenceSeverity } from '@cryptoshield/shared'

const typeIcons = {
  wallet: Shield,
  token: Coins,
  contract: FileText,
}

export function Watchlist() {
  const { items, alerts, fetchWatchlist, fetchAlerts, addWatchlistItem, deleteWatchlistItem, markAlertRead } = useWatchlistStore()
  const { showToast } = useToast()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newItem, setNewItem] = useState({
    assetType: 'wallet' as 'wallet' | 'token' | 'contract',
    value: '',
    chain: 'ethereum',
    label: '',
    alertPolicy: {
      riskChange: true,
      newReports: true,
      minimumSeverity: 'medium' as EvidenceSeverity,
    },
  })
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null)
  
  useEffect(() => {
    fetchWatchlist()
    fetchAlerts()
  }, [fetchWatchlist, fetchAlerts])
  
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addWatchlistItem(newItem)
      showToast({ type: 'success', title: 'Added to watchlist' })
      setShowAddModal(false)
      setNewItem({
        assetType: 'wallet',
        value: '',
        chain: 'ethereum',
        label: '',
        alertPolicy: { riskChange: true, newReports: true, minimumSeverity: 'medium' },
      })
    } catch {
      // Error handled in store
    }
  }
  
  const handleDelete = async (id: string) => {
    if (!confirm('Remove this item from your watchlist?')) return
    try {
      await deleteWatchlistItem(id)
      showToast({ type: 'success', title: 'Removed from watchlist' })
    } catch {
      // Error handled in store
    }
  }
  
  const unreadAlerts = alerts.filter(a => !a.readAt).length
  
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Watchlist & Alerts</h1>
          <p className="text-gray-500 mt-1">Monitor wallets, tokens, and contracts for risk changes and new threats</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add to Watchlist
        </button>
      </div>
      
      {/* Alerts Summary */}
      {unreadAlerts > 0 && (
        <div className="card border-red-200 bg-red-50">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-medium text-gray-900">{unreadAlerts} unread alert{unreadAlerts !== 1 ? 's' : ''}</h3>
                <p className="text-sm text-gray-700">Check the alerts tab for details</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Watchlist Items */}
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Your Watchlist ({items.length} items)</h2>
        </div>
        
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No watched assets yet</h3>
            <p className="text-gray-500 mt-1">Add wallets, tokens, or contracts to monitor for changes</p>
            <button onClick={() => setShowAddModal(true)} className="btn-primary mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add First Item
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <WatchlistItemRow key={item.id} item={item} onDelete={handleDelete} onView={() => setSelectedItem(item)} />
            ))}
          </div>
        )}
      </div>
      
      {/* Recent Alerts */}
      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Alerts ({alerts.length})</h2>
        </div>
        
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No alerts yet. Alerts appear when watched assets change risk level or new threats are detected.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {alerts.slice(0, 10).map((alert) => (
              <AlertRow key={alert.id} alert={alert} onRead={markAlertRead} />
            ))}
          </div>
        )}
      </div>
      
      {/* Add Item Modal */}
      {showAddModal && (
        <WatchlistModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddItem}
          item={newItem}
          setItem={setNewItem}
        />
      )}
      
      {/* Item Detail Modal */}
      {selectedItem && (
        <WatchlistItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  )
}

function WatchlistItemRow({ item, onDelete, onView }: { item: WatchlistItem; onDelete: (id: string) => void; onView: () => void }) {
  const Icon = typeIcons[item.assetType]
  const riskConfig = RISK_LEVELS[item.lastRiskLevel || 'unknown']
  
  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{item.label || formatAddress(item.value)}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{item.assetType}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{item.chain}</span>
            {item.lastRiskLevel && (
              <span className={`badge ${riskConfig.color.replace('text-', '').replace('bg-', 'bg-')}`}>
                {riskConfig.label}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 font-mono truncate">{item.value}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onView} className="p-2 text-gray-500 hover:text-gray-700" title="View details">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(item.id)} className="p-2 text-gray-500 hover:text-red-600" title="Remove">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function AlertRow({ alert, onRead }: { alert: Alert; onRead: (id: string) => void }) {
  const severityColors = {
    info: 'text-blue-600 bg-blue-100',
    low: 'text-green-600 bg-green-100',
    medium: 'text-yellow-600 bg-yellow-100',
    high: 'text-orange-600 bg-orange-100',
    critical: 'text-red-600 bg-red-100',
  }
  
  return (
    <div className={`p-4 ${!alert.readAt ? 'bg-red-50' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${severityColors[alert.severity]}`}>
          <Bell className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{alert.title}</h4>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[alert.severity]}`}>
              {alert.severity}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{alert.detail}</p>
          <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(alert.createdAt)}</p>
        </div>
        {!alert.readAt && (
          <button onClick={() => onRead(alert.id)} className="btn-secondary text-sm">
            Mark read
          </button>
        )}
      </div>
    </div>
  )
}

function WatchlistModal({ isOpen, onClose, onSubmit, item, setItem }: { isOpen: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; item: any; setItem: (item: any) => void }) {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add to Watchlist</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(e) }} className="p-6 space-y-4">
          <div>
            <label className="label">Asset Type</label>
            <select
              value={item.assetType}
              onChange={(e) => setItem({ ...item, assetType: e.target.value })}
              className="input"
            >
              <option value="wallet">Wallet</option>
              <option value="token">Token</option>
              <option value="contract">Contract</option>
            </select>
          </div>
          <div>
            <label className="label">Address <span className="text-red-500">*</span></label>
            <input
              value={item.value}
              onChange={(e) => setItem({ ...item, value: e.target.value })}
              type="text"
              placeholder="0x..."
              className="input font-mono"
              required
            />
          </div>
          <div>
            <label className="label">Chain</label>
            <select
              value={item.chain}
              onChange={(e) => setItem({ ...item, chain: e.target.value })}
              className="input"
            >
              <option value="ethereum">Ethereum</option>
              <option value="sepolia">Sepolia</option>
              <option value="polygon">Polygon</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
            </select>
          </div>
          <div>
            <label className="label">Label (optional)</label>
            <input
              value={item.label}
              onChange={(e) => setItem({ ...item, label: e.target.value })}
              type="text"
              placeholder="My wallet"
              className="input"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={item.alertPolicy.riskChange}
                onChange={(e) => setItem({ ...item, alertPolicy: { ...item.alertPolicy, riskChange: e.target.checked } })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Alert on risk level change</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={item.alertPolicy.newReports}
                onChange={(e) => setItem({ ...item, alertPolicy: { ...item.alertPolicy, newReports: e.target.checked } })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Alert on new threat reports</span>
            </label>
            <div>
              <label className="label">Minimum Severity</label>
              <select
                value={item.alertPolicy.minimumSeverity}
                onChange={(e) => setItem({ ...item, alertPolicy: { ...item.alertPolicy, minimumSeverity: e.target.value } })}
                className="input"
              >
                <option value="info">Info</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Add to Watchlist</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function WatchlistItemModal({ item, onClose }: { item: WatchlistItem; onClose: () => void }) {
  const Icon = typeIcons[item.assetType]
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Icon className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{item.label || formatAddress(item.value)}</h2>
              <p className="font-mono text-sm text-gray-500">{item.value}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <div className="p-6 space-y-4">
          <DetailRow label="Type" value={item.assetType} />
          <DetailRow label="Chain" value={item.chain} />
          <DetailRow label="Last Checked" value={item.lastCheckedAt ? formatRelativeTime(item.lastCheckedAt) : 'Never'} />
          <DetailRow label="Last Risk Level" value={item.lastRiskLevel || 'Unknown'} />
          <DetailRow label="Added" value={formatRelativeTime(item.createdAt)} />
          
          <div className="pt-4 border-t border-gray-100">
            <h3 className="font-medium text-gray-900 mb-2">Alert Policy</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <div>Risk change alerts: {item.alertPolicy.riskChange ? 'Enabled' : 'Disabled'}</div>
              <div>New report alerts: {item.alertPolicy.newReports ? 'Enabled' : 'Disabled'}</div>
              <div>Minimum severity: {item.alertPolicy.minimumSeverity}</div>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}
