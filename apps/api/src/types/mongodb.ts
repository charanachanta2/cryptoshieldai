import { ObjectId, WithId } from 'mongodb';

// Base document with string ID (our format)
export interface BaseDocument {
  _id: string;
  createdAt: string;
}

// User document
export interface UserDocument extends BaseDocument {
  email: string;
  displayName: string;
  passwordHash: string;
  role: 'user' | 'analyst' | 'admin';
  status: 'active' | 'suspended' | 'pending';
  emailVerified: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  verificationToken?: string;
  verificationExpiresAt?: string;
  resetToken?: string;
  resetExpiresAt?: string;
}

// Session document
export interface SessionDocument extends BaseDocument {
  userId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
}

// Scan document
export interface ScanDocument extends BaseDocument {
  userId: string;
  type: 'wallet' | 'token' | 'contract' | 'transaction';
  chain: string;
  status: 'queued' | 'running' | 'completed' | 'partial' | 'failed';
  input: Record<string, unknown>;
  risk?: RiskAssessmentDocument;
  evidence: EvidenceDocument[];
  dataCoverage: DataCoverageDocument;
  versions: VersionsDocument;
  completedAt?: string;
}

// Risk assessment sub-document
export interface RiskAssessmentDocument {
  level: 'safe' | 'medium' | 'high' | 'unknown';
  score: number;
  confidence: 'low' | 'medium' | 'high';
  summary: string;
  recommendedAction: 'proceed_with_caution' | 'do_not_proceed' | 'do_not_sign' | 'review_evidence' | 'unknown';
}

// Evidence sub-document
export interface EvidenceDocument {
  id: string;
  source: 'model' | 'rule' | 'threat_intel' | 'provider' | 'user_report';
  code: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  detail: string;
  confidence: number;
  references?: Array<{ label: string; url: string }>;
}

// Data coverage sub-document
export interface DataCoverageDocument {
  transactionHistory: boolean;
  threatIntelligence: boolean;
  model: boolean;
  tokenMetadata: boolean;
  contractMetadata: boolean;
  calldataDecoded: boolean;
}

// Versions sub-document
export interface VersionsDocument {
  api: string;
  model: string;
  featureSchema?: string;
  rules: string;
  threatIntel: string;
}

// Threat entity document
export interface ThreatEntityDocument extends BaseDocument {
  type: 'wallet' | 'token' | 'contract' | 'domain';
  value: string;
  chain: string;
  label: string;
  confidence: number;
  status: 'verified' | 'pending' | 'rejected' | 'disputed';
  sources: Array<{
    name: string;
    url: string;
    observedAt: string;
  }>;
  firstSeen: string;
  lastSeen: string;
}

// Threat report document
export interface ThreatReportDocument extends BaseDocument {
  entityType: 'wallet' | 'token' | 'contract' | 'domain';
  value: string;
  chain: string;
  category: string;
  description: string;
  evidenceUrls: string[];
  status: 'pending_review' | 'verified' | 'rejected';
  reporterId: string;
  reviewedAt?: string;
  reviewerId?: string;
  reviewerNotes?: string;
  reviewerConfidence?: number;
}

// Watchlist document
export interface WatchlistDocument extends BaseDocument {
  userId: string;
  assetType: 'wallet' | 'token' | 'contract';
  value: string;
  chain: string;
  label: string;
  alertPolicy: {
    riskChange: boolean;
    newReports: boolean;
    minimumSeverity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  };
  lastCheckedAt: string | null;
  lastRiskLevel: 'safe' | 'medium' | 'high' | 'unknown' | null;
}

// Alert document
export interface AlertDocument extends BaseDocument {
  userId: string;
  watchId: string;
  type: 'risk_change' | 'new_report' | 'threat_match';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  detail: string;
  readAt: string | null;
}

// Report document
export interface ReportDocument extends BaseDocument {
  userId: string;
  scanIds: string[];
  format: 'pdf';
  status: 'queued' | 'generating' | 'completed' | 'failed';
  includeEvidence: boolean;
  downloadUrl?: string;
  completedAt?: string;
}

// Rule document
export interface RuleDocument extends BaseDocument {
  code: string;
  name: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  definition: Record<string, unknown>;
  version: number;
  updatedAt: string;
}

// Audit log document
export interface AuditLogDocument extends BaseDocument {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
}

// Job document
export interface JobDocument extends BaseDocument {
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  scanId?: string;
  reportId?: string;
  payload: Record<string, unknown>;
  runAt: string;
}

// Idempotency key document
export interface IdempotencyKeyDocument {
  _id: string;
  key: string;
  userId: string;
  response: unknown;
  createdAt: string;
  expiresAt: string;
}

// Rate limit document
export interface RateLimitDocument {
  _id: string;
  key: string;
  count: number;
  windowStart: string;
  expiresAt: string;
}

// Type-safe collection names
export const COLLECTIONS = {
  users: 'users',
  sessions: 'sessions',
  scans: 'scans',
  scanEvidence: 'scan_evidence',
  threatEntities: 'threat_entities',
  threatReports: 'threat_reports',
  watchlists: 'watchlists',
  alerts: 'alerts',
  reports: 'reports',
  rules: 'rules',
  auditLogs: 'audit_logs',
  modelVersions: 'model_versions',
  rateLimits: 'rate_limits',
  idempotencyKeys: 'idempotency_keys',
  jobs: 'jobs',
} as const;

// Helper to convert string ID to ObjectId for queries
export function toObjectId(id: string): ObjectId {
  return new ObjectId(id);
}

// Type-safe findOneAndUpdate return type
export type FindOneResult<T> = WithId<T> | null;

// Ensure string IDs are used in our API layer
export function generateId(): string {
  return new ObjectId().toString();
}