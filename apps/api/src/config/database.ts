import { MongoClient, Db, Collection, IndexDescription, ObjectId, WithId, Document, Filter, UpdateFilter, FindOptions, FindOneAndUpdateOptions } from 'mongodb'
import { logger } from '../utils/logger.js'
import type {
  UserDocument,
  SessionDocument,
  ScanDocument,
  ThreatEntityDocument,
  ThreatReportDocument,
  WatchlistDocument,
  AlertDocument,
  ReportDocument,
  RuleDocument,
  AuditLogDocument,
  JobDocument,
  IdempotencyKeyDocument,
  RateLimitDocument,
} from '../types/mongodb.js'

// Allow string _id in documents (our app uses string IDs like 'audit_...', 'job_...', etc.)
interface StringIdDocument extends Document {
  _id: string;
}

let db: Db | null = null
let client: MongoClient | null = null

const COLLECTIONS = {
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
} as const

const INDEXES: Record<string, IndexDescription[]> = {
  users: [
    { key: { email: 1 }, unique: true },
    { key: { role: 1 } },
  ],
  sessions: [
    { key: { userId: 1 } },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    { key: { tokenHash: 1 }, unique: true },
  ],
  scans: [
    { key: { userId: 1, createdAt: -1 } },
    { key: { type: 1, chain: 1 } },
    { key: { status: 1 } },
    { key: { 'input.address': 1, chain: 1, userId: 1 } },
  ],
  scanEvidence: [
    { key: { scanId: 1 } },
    { key: { source: 1, code: 1 } },
  ],
  threatEntities: [
    { key: { value: 1, chain: 1, type: 1 }, unique: true },
    { key: { type: 1, chain: 1, label: 1 } },
    { key: { status: 1 } },
    { key: { lastSeen: -1 } },
  ],
  threatReports: [
    { key: { entityId: 1 } },
    { key: { reporterId: 1 } },
    { key: { status: 1 } },
  ],
  watchlists: [
    { key: { userId: 1, assetType: 1, value: 1, chain: 1 }, unique: true },
    { key: { userId: 1 } },
  ],
  alerts: [
    { key: { userId: 1, readAt: 1 } },
    { key: { watchId: 1 } },
    { key: { createdAt: -1 } },
  ],
  reports: [
    { key: { userId: 1, createdAt: -1 } },
    { key: { status: 1 } },
  ],
  rules: [
    { key: { code: 1, version: 1 }, unique: true },
    { key: { enabled: 1 } },
  ],
  auditLogs: [
    { key: { actorId: 1, createdAt: -1 } },
    { key: { action: 1 } },
    { key: { targetType: 1, targetId: 1 } },
  ],
  modelVersions: [
    { key: { name: 1, version: 1 }, unique: true },
  ],
  rateLimits: [
    { key: { key: 1 }, unique: true },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ],
  idempotencyKeys: [
    { key: { key: 1 }, unique: true },
    { key: { createdAt: 1 }, expireAfterSeconds: 86400 },
  ],
  jobs: [
    { key: { type: 1, status: 1, runAt: 1 } },
    { key: { createdAt: 1 }, expireAfterSeconds: 604800 },
  ],
}

export async function connectDB(): Promise<Db> {
  if (db) return db
  
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cryptoshield'
  
  client = new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  
  await client.connect()
  db = client.db('cryptoshield')
  
  // Create indexes
  for (const [collectionName, indexes] of Object.entries(INDEXES)) {
    const collection = db.collection(collectionName)
    for (const index of indexes) {
      try {
        await collection.createIndex(index.key, index)
      } catch (error) {
        logger.warn(`Failed to create index on ${collectionName}:`, error)
      }
    }
  }
  
  // Seed threat intelligence from local datasets
  await seedThreatIntelligence(db)
  
  return db
}

export function getDB(): Db {
  if (!db) throw new Error('Database not connected. Call connectDB() first.')
  return db
}

// Type-safe collection getters with string ID support
export function getUsersCollection(): Collection<UserDocument> {
  return getDB().collection<UserDocument>(COLLECTIONS.users) as Collection<UserDocument>
}

export function getSessionsCollection(): Collection<SessionDocument> {
  return getDB().collection<SessionDocument>(COLLECTIONS.sessions) as Collection<SessionDocument>
}

export function getScansCollection(): Collection<ScanDocument> {
  return getDB().collection<ScanDocument>(COLLECTIONS.scans) as Collection<ScanDocument>
}

export function getScanEvidenceCollection(): Collection<import('../types/mongodb.js').EvidenceDocument> {
  return getDB().collection<import('../types/mongodb.js').EvidenceDocument>(COLLECTIONS.scanEvidence) as Collection<import('../types/mongodb.js').EvidenceDocument>
}

export function getThreatEntitiesCollection(): Collection<ThreatEntityDocument> {
  return getDB().collection<ThreatEntityDocument>(COLLECTIONS.threatEntities) as Collection<ThreatEntityDocument>
}

export function getThreatReportsCollection(): Collection<ThreatReportDocument> {
  return getDB().collection<ThreatReportDocument>(COLLECTIONS.threatReports) as Collection<ThreatReportDocument>
}

export function getWatchlistsCollection(): Collection<WatchlistDocument> {
  return getDB().collection<WatchlistDocument>(COLLECTIONS.watchlists) as Collection<WatchlistDocument>
}

export function getAlertsCollection(): Collection<AlertDocument> {
  return getDB().collection<AlertDocument>(COLLECTIONS.alerts) as Collection<AlertDocument>
}

export function getReportsCollection(): Collection<import('../types/mongodb.js').ReportDocument> {
  return getDB().collection<import('../types/mongodb.js').ReportDocument>(COLLECTIONS.reports) as Collection<import('../types/mongodb.js').ReportDocument>
}

export function getRulesCollection(): Collection<RuleDocument> {
  return getDB().collection<RuleDocument>(COLLECTIONS.rules) as Collection<RuleDocument>
}

export function getAuditLogsCollection(): Collection<AuditLogDocument> {
  return getDB().collection<AuditLogDocument>(COLLECTIONS.auditLogs) as Collection<AuditLogDocument>
}

export function getJobsCollection(): Collection<JobDocument> {
  return getDB().collection<JobDocument>(COLLECTIONS.jobs) as Collection<JobDocument>
}

export function getRateLimitsCollection(): Collection<RateLimitDocument> {
  return getDB().collection<RateLimitDocument>(COLLECTIONS.rateLimits) as Collection<RateLimitDocument>
}

export function getIdempotencyKeysCollection(): Collection<IdempotencyKeyDocument> {
  return getDB().collection<IdempotencyKeyDocument>(COLLECTIONS.idempotencyKeys) as Collection<IdempotencyKeyDocument>
}

// Generic getCollection for backward compatibility
export function getCollection<T extends { _id: string } & Record<string, unknown> = { _id: string } & Record<string, unknown>>(name: string): Collection<T> {
  return getDB().collection<T>(name) as Collection<T>
}

export async function seedThreatIntelligence(db: Db) {
  const collection = db.collection<ThreatEntityDocument>(COLLECTIONS.threatEntities)
  const count = await collection.countDocuments()
  
  if (count > 0) {
    logger.info(`Threat intelligence already seeded (${count} entities)`)
    return
  }
  
  // Seed with known malicious addresses from datasets
  // In production, this would load from Forta/Poison-Hunter datasets
  const seedEntities: Omit<ThreatEntityDocument, '_id' | 'createdAt'>[] = [
    {
      type: 'wallet',
      value: '0x000000000000000000000000000000000000dead',
      chain: 'ethereum',
      label: 'phishing',
      confidence: 0.9,
      status: 'verified',
      sources: [{
        name: 'Forta',
        url: 'https://forta.org',
        observedAt: new Date().toISOString(),
      }],
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    },
    {
      type: 'contract',
      value: '0x0000000000000000000000000000000000000000',
      chain: 'ethereum',
      label: 'malicious',
      confidence: 0.8,
      status: 'verified',
      sources: [{
        name: 'Forta',
        url: 'https://forta.org',
        observedAt: new Date().toISOString(),
      }],
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    },
  ]
  
  try {
    await collection.insertMany(seedEntities as ThreatEntityDocument[])
    logger.info(`Seeded ${seedEntities.length} threat intelligence entities`)
  } catch (error) {
    logger.warn('Failed to seed threat intelligence:', error)
  }
}

export async function closeDB() {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}

export { COLLECTIONS }