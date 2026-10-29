import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { User, PaginatedResponse, Rule } from '@cryptoshield/shared'
import { Users, Shield, Search, Filter, Loader2, MoreHorizontal, Edit } from 'lucide-react'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { formatRelativeTime } from '@cryptoshield/shared'

export function Admin() {
  const [activeTab, setActiveTab] = useState<'users' | 'rules' | 'reports' | 'audit' | 'usage'>('users')
  const [searchQuery] = useState('')
  
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery) params.append('q', searchQuery)
      const response = await api.get<PaginatedResponse<User>>(`/admin/users?${params}`)
      return response.data
    },
    enabled: activeTab === 'users',
  })
  
  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ['admin-rules'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Rule>>('/admin/rules')
      return response.data
    },
    enabled: activeTab === 'rules',
  })
  
  const tabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'rules', label: 'Rules', icon: Shield },
    { id: 'reports', label: 'Reports', icon: Search },
    { id: 'audit', label: 'Audit Logs', icon: Filter },
    { id: 'usage', label: 'Usage Metrics', icon: Loader2 },
  ]
  
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Security Center</h1>
        <p className="text-gray-500 mt-1">Manage users, detection rules, community reports, and system monitoring</p>
      </div>
      
      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-100">
          <nav className="flex gap-4 p-4" aria-label="Admin tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-4">
          {activeTab === 'users' && <UsersTab data={usersData} isLoading={usersLoading} />}
          {activeTab === 'rules' && <RulesTab data={rulesData} isLoading={rulesLoading} />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'audit' && <AuditTab />}
          {activeTab === 'usage' && <UsageTab />}
        </div>
      </div>
    </div>
  )
}

function UsersTab({ data, isLoading }: { data?: PaginatedResponse<User>; isLoading: boolean }) {
  if (isLoading) return <LoadingSpinner text="Loading users..." />
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">User Management ({data?.meta.total || 0})</h2>
      </div>
      
      {data?.data.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No users found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                <th className="pb-2">User</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Email Verified</th>
                <th className="pb-2">MFA</th>
                <th className="pb-2">Created</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-3">
                    <div>
                      <p className="font-medium text-gray-900">{user.displayName}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="py-3">
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      className="px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                    >
                      <option value="user">User</option>
                      <option value="analyst">Analyst</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' :
                      user.status === 'suspended' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      user.emailVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.emailVerified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      user.mfaEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.mfaEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-gray-500">{formatRelativeTime(user.createdAt)}</td>
                  <td className="py-3 text-right">
                    <button className="p-2 text-gray-500 hover:text-gray-700" title="More">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

async function updateUserRole(userId: string, role: string) {
  try {
    await api.patch(`/admin/users/${userId}`, { role, reason: `Role changed to ${role}` })
  } catch (error) {
    console.error('Failed to update user role:', error)
  }
}

function RulesTab({ data, isLoading }: { data?: PaginatedResponse<Rule>; isLoading: boolean }) {
  if (isLoading) return <LoadingSpinner text="Loading rules..." />
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Detection Rules ({data?.meta.total || 0})</h2>
        <button className="btn-primary text-sm">Create Rule</button>
      </div>
      
      {data?.data.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No rules configured</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {data?.data.map((rule) => (
            <div key={rule.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{rule.name}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{rule.code}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      rule.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      rule.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      rule.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {rule.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
                </div>
                <button className="p-2 text-gray-500 hover:text-gray-700" title="Edit">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReportsTab() {
  return (
    <div className="p-8 text-center text-gray-500">
      <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <p>Community report review queue - coming soon</p>
    </div>
  )
}

function AuditTab() {
  return (
    <div className="p-8 text-center text-gray-500">
      <Filter className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <p>Audit log viewer - coming soon</p>
    </div>
  )
}

function UsageTab() {
  return (
    <div className="p-8 text-center text-gray-500">
      <Loader2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <p>Usage metrics dashboard - coming soon</p>
    </div>
  )
}
