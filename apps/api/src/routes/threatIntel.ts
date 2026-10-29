import { Router, Response } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { 
  getThreatEntitiesCollection,
  getThreatReportsCollection,
} from '../config/database.js'
import { authMiddleware, AuthenticatedRequest, requireRole } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'
import { logger } from '../utils/logger.js'
import type { ThreatEntityDocument, ThreatReportDocument } from '../types/mongodb.js'

const router = Router()

// Validation schemas
const threatEntityQuerySchema = z.object({
  type: z.enum(['wallet', 'token', 'contract', 'domain']).optional(),
  value: z.string().optional(),
  chain: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const threatReportSchema = z.object({
  entityType: z.enum(['wallet', 'token', 'contract', 'domain']),
  value: z.string().min(1),
  chain: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(10),
  evidenceUrls: z.array(z.string().url()).optional(),
})

// GET /threat-intel/entities
router.get('/entities', async (req: AuthenticatedRequest, res, next) => {
  try {
    const query = threatEntityQuerySchema.parse(req.query)
    const skip = (query.page - 1) * query.limit
    
    const filter: any = {}
    if (query.type) filter.type = query.type
    if (query.chain) filter.chain = query.chain
    if (query.value) filter.value = query.value.toLowerCase()
    if (query.q) {
      filter.$or = [
        { value: { $regex: query.q, $options: 'i' } },
        { label: { $regex: query.q, $options: 'i' } },
      ]
    }
    
    const collection = getThreatEntitiesCollection()
    const [data, total] = await Promise.all([
      collection.find(filter)
        .sort({ lastSeen: -1 })
        .skip(skip)
        .limit(query.limit)
        .toArray(),
      collection.countDocuments(filter),
    ])
    
    res.json({
      data: data.map(e => ({
        id: e._id,
        type: e.type,
        value: e.value,
        chain: e.chain,
        label: e.label,
        confidence: e.confidence,
        status: e.status,
        sources: e.sources,
        firstSeen: e.firstSeen,
        lastSeen: e.lastSeen,
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        hasNext: skip + data.length < total,
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /threat-intel/entities/:entityId
router.get('/entities/:entityId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const entity = await getThreatEntitiesCollection().findOne({
      _id: req.params.entityId,
    })
    
    if (!entity) {
      throw ApiError.notFound('Threat entity not found')
    }
    
    // Also get related reports
    const reports = await getThreatReportsCollection()
      .find({ entityId: entity._id })
      .sort({ createdAt: -1 })
      .toArray()
    
    res.json({
      ...entity,
      id: entity._id,
      reports: reports.map(r => ({
        id: r._id,
        category: r.category,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt,
      })),
    })
  } catch (error) {
    next(error)
  }
})

// GET /threat-intel/alerts
router.get('/alerts', async (req: AuthenticatedRequest, res, next) => {
  try {
    const severity = req.query.severity as string
    const from = req.query.from as string
    const to = req.query.to as string
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const skip = (page - 1) * limit
    
    const filter: any = {}
    if (severity) filter.severity = severity
    if (from || to) {
      filter.createdAt = {}
      if (from) filter.createdAt.$gte = from
      if (to) filter.createdAt.$lte = to
    }
    
    const collection = getThreatEntitiesCollection()
    const [data, total] = await Promise.all([
      collection.find(filter)
        .sort({ lastSeen: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ])
    
    res.json({
      data: data.map((e: ThreatEntityDocument) => ({
        id: e._id,
        type: e.type,
        value: e.value,
        chain: e.chain,
        label: e.label,
        // Use label as severity indicator (e.g., 'phishing', 'malicious', 'sanctioned')
        severity: e.label,
        confidence: e.confidence,
        title: `${e.label.charAt(0).toUpperCase() + e.label.slice(1)} detected: ${e.value}`,
        detail: `Threat intelligence match from ${e.sources.map((s: { name: string }) => s.name).join(', ')}`,
        createdAt: e.lastSeen,
      })),
      meta: {
        page,
        limit,
        total,
        hasNext: skip + data.length < total,
      },
    })
  } catch (error) {
    next(error)
  }
})

// POST /threat-intel/reports
router.post('/reports', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = threatReportSchema.parse(req.body)
    
    const reportId = `rep_${uuidv4()}`
    const now = new Date().toISOString()
    
    const reportDoc: ThreatReportDocument = {
      _id: reportId,
      entityType: data.entityType,
      value: data.value.toLowerCase(),
      chain: data.chain,
      category: data.category,
      description: data.description,
      evidenceUrls: data.evidenceUrls || [],
      status: 'pending_review',
      reporterId: req.user!.id,
      createdAt: now,
    }
    
    await getThreatReportsCollection().insertOne(reportDoc)
    
    // Also create or update threat entity
    const entitiesCollection = getThreatEntitiesCollection()
    const existingEntity = await entitiesCollection.findOne({
      value: data.value.toLowerCase(),
      chain: data.chain,
      type: data.entityType,
    })
    
    if (existingEntity) {
      await entitiesCollection.updateOne(
        { _id: existingEntity._id },
        {
          $set: { lastSeen: now, status: 'pending' },
          $push: {
            sources: {
              name: 'Community Report',
              url: `internal://report/${reportId}`,
              observedAt: now,
            } as const,
          },
        }
      )
    } else {
      await entitiesCollection.insertOne({
        _id: `ent_${uuidv4()}`,
        type: data.entityType,
        value: data.value.toLowerCase(),
        chain: data.chain,
        label: data.category,
        confidence: 0.5,
        status: 'pending',
        sources: [{
          name: 'Community Report',
          url: `internal://report/${reportId}`,
          observedAt: now,
        }],
        firstSeen: now,
        lastSeen: now,
        createdAt: now,
      })
    }
    
    logger.info(`Community report submitted: ${reportId} by ${req.user!.id}`)
    
    res.status(201).json({
      id: reportId,
      status: 'pending_review',
      createdAt: now,
    })
  } catch (error) {
    next(error)
  }
})

export default router