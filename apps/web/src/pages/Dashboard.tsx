import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { ScanCard } from '../components/ScanCard'
import { SkeletonCard } from '../components/LoadingSpinner'
import { useAuth } from '../contexts/AuthContext'
import { useScanStore } from '../stores/scanStore'
import {
  Search,
  Shield,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  TrendingUp,
  Activity,
  Settings,
} from 'lucide-react'

interface DashboardStats {
  totalScans: number
  safeScans: number
  mediumScans: number
  highScans: number
  recentScans: number
}

interface QuickAction {
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
}

const quickActions: QuickAction[] = [
  {
    name: 'Wallet Scanner',
    description: 'Check wallet reputation, history, and risk level',
    icon: Search,
    href: '/wallet-scanner',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    name: 'Token Scanner',
    description: 'Analyze token contracts for rug pulls and honeypots',
    icon: ShieldCheck,
    href: '/token-scanner',
    color: 'bg-green-100 text-green-600',
  },
  {
    name: 'Contract Scanner',
    description: 'Verify smart contract safety and permissions',
    icon: Shield,
    href: '/contract-scanner',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    name: 'Transaction Analyzer',
    description: 'Pre-signing risk assessment for transactions',
    icon: AlertTriangle,
    href: '/transaction-analyzer',
    color: 'bg-red-100 text-red-600',
  },
]

const riskLevels = [
  { level: 'safe', label: 'Safe', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  { level: 'medium', label: 'Medium Risk', icon: HelpCircle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  { level: 'high', label: 'High Risk', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  { level: 'unknown', label: 'Unknown', icon: HelpCircle, color: 'text-gray-600', bg: 'bg-gray-100' },
]

export function Dashboard() {
  const { user } = useAuth()
  const { scans, fetchScans } = useScanStore()
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get<DashboardStats>('/dashboard/stats')
      return response.data
    },
  })
  
  useEffect(() => {
    fetchScans({ limit: '5' })
  }, [fetchScans])
  
  const recentScans = scans.slice(0, 5)
  
  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.displayName}</h1>
          <p className="text-gray-500 mt-1">Here's an overview of your security scans</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/settings" className="btn-secondary">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Link>
        </div>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Scans"
          value={statsLoading ? '—' : stats?.totalScans || 0}
          icon={Activity}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Safe"
          value={statsLoading ? '—' : stats?.safeScans || 0}
          icon={CheckCircle}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Medium Risk"
          value={statsLoading ? '—' : stats?.mediumScans || 0}
          icon={HelpCircle}
          color="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          title="High Risk"
          value={statsLoading ? '—' : stats?.highScans || 0}
          icon={XCircle}
          color="bg-red-100 text-red-600"
        />
        <StatCard
          title="This Week"
          value={statsLoading ? '—' : stats?.recentScans || 0}
          icon={TrendingUp}
          color="bg-purple-100 text-purple-600"
        />
      </div>
      
      {/* Quick actions */}
      <div className="card">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <p className="text-sm text-gray-500 mt-1">Start a new security scan</p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                to={action.href}
                className="group p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.color} group-hover:scale-105 transition-transform`}>
                  <action.icon className="w-6 h-6" />
                </div>
                <h3 className="mt-3 font-medium text-gray-900">{action.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
      
      {/* Risk distribution & Recent scans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk distribution */}
        <div className="lg:col-span-1 card">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Risk Distribution</h2>
            <p className="text-sm text-gray-500 mt-1">All-time scan results</p>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            {riskLevels.map(({ level, label, icon: Icon, color }) => {
              const count = statsLoading ? 0 : stats?.[`${level}Scans` as keyof DashboardStats] || 0
              const total = statsLoading ? 1 : stats?.totalScans || 1
              const percentage = total > 0 ? ((count as number) / total) * 100 : 0
              
              return (
                <div key={level}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className={`${color} w-4 h-4`} />
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%`, backgroundColor: color.replace('text-', '') }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Recent scans */}
        <div className="lg:col-span-2 card">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent Scans</h2>
              <p className="text-sm text-gray-500 mt-1">Your latest security analyses</p>
            </div>
            <Link to="/history" className="btn-secondary text-sm">
              View all
            </Link>
          </div>
          
          {scans.length === 0 && !useScanStore.getState().isLoading ? (
            <div className="p-8 text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No scans yet</h3>
              <p className="text-gray-500 mt-1">Start by scanning a wallet, token, contract, or transaction</p>
              <div className="mt-4 flex justify-center gap-3">
                <Link to="/wallet-scanner" className="btn-primary">
                  <Search className="w-4 h-4 mr-2" />
                  Scan Wallet
                </Link>
                <Link to="/transaction-analyzer" className="btn-secondary">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Analyze Transaction
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentScans.map((scan) => (
                <ScanCard key={scan.id} scan={scan} showActions={false} />
              ))}
              {useScanStore.getState().isLoading && (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Data freshness notice */}
      <div className="card border-yellow-200 bg-yellow-50">
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Important Disclaimer</h3>
              <p className="text-sm text-gray-700 mt-1">
                CryptoShield AI provides risk estimates based on available data and models. Results are not guarantees of safety.
                The current models are exploratory and trained on failed transactions only. Always verify transaction details
                independently and consult multiple sources before making decisions.
              </p>
              <p className="text-sm text-gray-700 mt-2">
                <strong>Model status:</strong> Exploratory (not production-validated) |{' '}
                <strong>Data:</strong> BCCC DeFi Fraud dataset (all failed transactions)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}
