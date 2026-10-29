// Core types shared between frontend, backend, and ML service

export interface User {
  id: string
  email: string
  displayName: string
  role: 'user' | 'analyst' | 'admin'
  status: 'active' | 'suspended' | 'pending'
  emailVerified: boolean
  mfaEnabled: boolean
  createdAt: string
  lastLoginAt?: string
}

export interface Session {
  accessToken: string
  expiresIn: number
  refreshToken: string
  user: User
}

export interface ScanInput {
  address?: string
  chain: string
  refresh?: boolean
  includeSource?: boolean
}

export interface TransactionScanInput {
  chain: string
  from: string
  to: string
  value: string
  token?: {
    address: string
    amount: string
    decimals: number
  }
  data: string
  gasPrice?: string
  nonce?: number
}

export type ScanType = 'wallet' | 'token' | 'contract' | 'transaction'
export type ScanStatus = 'queued' | 'running' | 'completed' | 'partial' | 'failed'
export type RiskLevel = 'safe' | 'medium' | 'high' | 'unknown'
export type ConfidenceLevel = 'low' | 'medium' | 'high'
export type RecommendedAction = 'proceed_with_caution' | 'do_not_proceed' | 'do_not_sign' | 'review_evidence' | 'unknown'
export type EvidenceSource = 'model' | 'rule' | 'threat_intel' | 'provider' | 'user_report'
export type EvidenceSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export interface Evidence {
  id: string
  source: EvidenceSource
  code: string
  severity: EvidenceSeverity
  title: string
  detail: string
  confidence: number
  references?: Array<{
    label: string
    url: string
  }>
}

export interface RiskAssessment {
  level: RiskLevel
  score: number
  confidence: ConfidenceLevel
  summary: string
  recommendedAction: RecommendedAction
}

export interface DataCoverage {
  transactionHistory: boolean
  threatIntelligence: boolean
  model: boolean
  tokenMetadata: boolean
  contractMetadata: boolean
  calldataDecoded: boolean
}

export interface Versions {
  api: string
  model: string
  featureSchema?: string
  rules: string
  threatIntel: string
}

export interface Scan {
  id: string
  type: ScanType
  chain: string
  status: ScanStatus
  input: ScanInput | TransactionScanInput
  risk?: RiskAssessment
  evidence: Evidence[]
  dataCoverage: DataCoverage
  versions: Versions
  createdAt: string
  completedAt?: string
  userId: string
}

export interface ScanListItem {
  id: string
  type: ScanType
  chain: string
  status: ScanStatus
  riskLevel: RiskLevel
  summary: string
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    hasNext: boolean
  }
}

export interface ApiError {
  code: string
  message: string
  details?: Array<{
    field: string
    issue: string
    message: string
  }>
  requestId: string
  retryable: boolean
}

export interface HealthResponse {
  status: 'ok' | 'not_ready'
  service: string
  version: string
  uptimeSeconds: number
  checks?: {
    mongodb: 'ok' | 'error'
    mlService: 'ok' | 'unavailable'
  }
  modelVersion?: string
  error?: ApiError
}

export interface WatchlistItem {
  id: string
  userId: string
  assetType: 'wallet' | 'token' | 'contract'
  value: string
  chain: string
  label: string
  alertPolicy: {
    riskChange: boolean
    newReports: boolean
    minimumSeverity: EvidenceSeverity
  }
  lastCheckedAt?: string
  lastRiskLevel?: RiskLevel
  createdAt: string
}

export interface Alert {
  id: string
  userId: string
  watchId: string
  type: 'risk_change' | 'new_report' | 'threat_match'
  severity: EvidenceSeverity
  title: string
  detail: string
  readAt?: string
  createdAt: string
}

export interface Report {
  id: string
  userId: string
  scanIds: string[]
  format: 'pdf'
  status: 'queued' | 'generating' | 'completed' | 'failed'
  downloadUrl?: string
  createdAt: string
  completedAt?: string
}

export interface ThreatEntity {
  id: string
  type: 'wallet' | 'token' | 'contract' | 'domain'
  value: string
  chain: string
  label: string
  confidence: number
  status: 'verified' | 'pending' | 'rejected' | 'disputed'
  sources: Array<{
    name: string
    url: string
    observedAt: string
  }>
  firstSeen: string
  lastSeen: string
}

export interface ThreatReport {
  id: string
  entityType: 'wallet' | 'token' | 'contract' | 'domain'
  value: string
  chain: string
  category: string
  description: string
  evidenceUrls: string[]
  status: 'pending_review' | 'verified' | 'rejected'
  reporterId: string
  createdAt: string
  reviewedAt?: string
  reviewerId?: string
}

export interface AssistantQuery {
  scanId: string
  question: string
  language: string
}

export interface AssistantResponse {
  answer: string
  citations: Array<{
    evidenceId: string
    source: EvidenceSource
  }>
  refused: boolean
  limitations: string[]
}

export interface Rule {
  id: string
  code: string
  name: string
  description: string
  severity: EvidenceSeverity
  enabled: boolean
  definition: Record<string, unknown>
  version: number
  createdAt: string
  updatedAt: string
}

export interface AuditLog {
  id: string
  actorId: string
  action: string
  targetType: string
  targetId: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  createdAt: string
}

export interface UsageMetrics {
  scanVolume: number
  activeUsers: number
  errorRate: number
  modelUsage: Record<string, number>
  providerUsage: Record<string, number>
  dateRange: {
    from: string
    to: string
  }
}

export const SUPPORTED_CHAINS = ['ethereum', 'sepolia', 'polygon', 'arbitrum', 'optimism'] as const
export type SupportedChain = typeof SUPPORTED_CHAINS[number]

export const RISK_LEVELS: Record<RiskLevel, { label: string; color: string }> = {
  safe: { label: 'Safe', color: 'text-green-600 bg-green-100' },
  medium: { label: 'Medium Risk', color: 'text-yellow-600 bg-yellow-100' },
  high: { label: 'High Risk', color: 'text-red-600 bg-red-100' },
  unknown: { label: 'Unknown', color: 'text-gray-600 bg-gray-100' },
}

export const SEVERITY_COLORS: Record<EvidenceSeverity, string> = {
  info: 'text-blue-600 bg-blue-100',
  low: 'text-green-600 bg-green-100',
  medium: 'text-yellow-600 bg-yellow-100',
  high: 'text-orange-600 bg-orange-100',
  critical: 'text-red-600 bg-red-100',
}

export function formatAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2) return address
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString()
}

export function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatTimestamp(timestamp)
}