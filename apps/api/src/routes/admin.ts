import { Router, Response } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { 
  getUsersCollection,
  getRulesCollection,
  getThreatReportsCollection,
  getThreatEntitiesCollection,
  getAuditLogsCollection,
  getScansCollection,
  getCollection,
  COLLECTIONS,
} from '../config/database.js'
import { authMiddleware, AuthenticatedRequest, requireRole } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'
import argon2 from 'argon2'
import type { RuleDocument, ThreatReportDocument, AuditLogDocument, UserDocument } from '../types/mongodb.js'

const router = Router()

// All admin routes require admin role
router.use(requireRole('admin'))

// GET /admin/users
router.get('/users', async (req: AuthenticatedRequest, res, next) => {
  try {
    const role = req.query.role as string
    const status = req.query.status as string
    const q = req.query.q as string
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const skip = (page - 1) * limit
    
    const filter: any = {}
    if (role) filter.role = role
    if (status) filter.status = status
    if (q) {
      filter.$or = [
        { email: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
      ]
    }
    
    const usersCollection = getUsersCollection()
    const [data, total] = await Promise.all([
      usersCollection.find<UserDocument>(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .project({ passwordHash: 0 })
        .toArray() as Promise<UserDocument[]>,
      usersCollection.countDocuments(filter),
    ])
    
    res.json({
      data: data.map((u: UserDocument) => ({
        id: u._id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        status: u.status,
        emailVerified: u.emailVerified,
        mfaEnabled: u.mfaEnabled,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
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

// PATCH /admin/users/:userId
router.patch('/users/:userId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({
      role: z.enum(['user', 'analyst', 'admin']).optional(),
      status: z.enum(['active', 'suspended', 'pending']).optional(),
      reason: z.string().min(1),
    })
    
    const data = schema.parse(req.body)
    
    
    if (!data.reason) {
      throw ApiError.validation('Reason is required for admin actions', [{
        field: 'reason',
        issue: 'required',
        message: 'A reason must be provided for administrative changes',
      }])
    }

    
    // Prevent self-demotion
    if (req.params.userId === req.user!.id && data.role && data.role !== 'admin') {
      throw ApiError.forbidden('Cannot remove your own admin role')
    }
    
    const update: any = {}
    if (data.role) update.role = data.role
    if (data.status) update.status = data.status
    
    const result = await getUsersCollection().findOneAndUpdate(
      { _id: req.params.userId },
      { $set: update },
      { returnDocument: 'after', projection: { passwordHash: 0 } }
    )
    
    if (!result) {
      throw ApiError.notFound('User not found')
    }
    
    // Audit log
    await getAuditLogsCollection().insertOne({
      _id: `audit_${uuidv4()}`,
      actorId: req.user!.id,
      action: 'user.update',
      targetType: 'user',
      targetId: req.params.userId,
      before: { role: result.role, status: result.status },
      after: { role: data.role || result.role, status: data.status || result.status },
      reason: data.reason,
      createdAt: new Date().toISOString(),
    })
    
    res.json({
      id: result._id,
      email: result.email,
      displayName: result.displayName,
      role: result.role,
      status: result.status,
      emailVerified: result.emailVerified,
      mfaEnabled: result.mfaEnabled,
      createdAt: result.createdAt,
      lastLoginAt: result.lastLoginAt,
    })
  } catch (error) {
    next(error)
  }
})

// GET /admin/usage
router.get('/usage', async (req: AuthenticatedRequest, res, next) => {
  try {
    const from = req.query.from as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const to = req.query.to as string || new Date().toISOString()
    
    const scansCollection = getScansCollection()
    const usersCollection = getUsersCollection()
    
    const [scanVolume, activeUsers, errorRate, modelUsage, providerUsage] = await Promise.all([
      scansCollection.countDocuments({
        createdAt: { $gte: from, $lte: to },
      }),
      usersCollection.countDocuments({
        lastLoginAt: { $gte: from },
        status: 'active',
      }),
      // Error rate would require logging infrastructure
      Promise.resolve(0),
      // Model usage
      scansCollection.aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: from, $lte: to }, 'versions.model': { $exists: true } } },
        { $group: { _id: '$versions.model', count: { $sum: 1 } } },
      ]).toArray(),
      // Provider usage (placeholder)
      Promise.resolve({}),
    ])
    
    res.json({
      scanVolume,
      activeUsers,
      errorRate,
      modelUsage: Object.fromEntries(modelUsage.map((m) => [m._id, m.count])),
      providerUsage,
      dateRange: { from, to },
    })
  } catch (error) {
    next(error)
  }
})

// GET /admin/rules
router.get('/rules', async (req: AuthenticatedRequest, res, next) => {
  try {
    const rules = await getRulesCollection()
      .find({})
      .sort({ code: 1, version: -1 })
      .toArray()
    
    res.json({
      data: rules.map((r: RuleDocument) => ({
        id: r._id,
        code: r.code,
        name: r.name,
        description: r.description,
        severity: r.severity,
        enabled: r.enabled,
        definition: r.definition,
        version: r.version,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    })
  } catch (error) {
    next(error)
  }
})

// POST /admin/rules
router.post('/rules', async (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({
      code: z.string().min(1).max(50),
      name: z.string().min(1).max(100),
      description: z.string().min(1).max(500),
      severity: z.enum(['info', 'low', 'medium', 'high', 'critical']),
      enabled: z.boolean().default(false),
      definition: z.record(z.unknown()),
    })
    
    const data = schema.parse(req.body)
    
    const ruleId = `rule_${uuidv4()}`
    const now = new Date().toISOString()
    
    const ruleDoc = {
      _id: ruleId,
      code: data.code,
      name: data.name,
      description: data.description,
      severity: data.severity,
      enabled: data.enabled,
      definition: data.definition,
      version: 1,
      createdAt: now,
      updatedAt: now,
    }
    
    await getRulesCollection().insertOne(ruleDoc)
    
    // Audit log
    await getAuditLogsCollection().insertOne({
      _id: `audit_${uuidv4()}`,
      actorId: req.user!.id,
      action: 'rule.create',
      targetType: 'rule',
      targetId: ruleId,
      after: ruleDoc,
      createdAt: now,
    })
    
    res.status(201).json({
      id: ruleId,
      code: data.code,
      version: 1,
      severity: data.severity,
      enabled: data.enabled,
      createdAt: now,
    })
  } catch (error) {
    next(error)
  }
})

// PATCH /admin/rules/:ruleId
router.patch('/rules/:ruleId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({
      enabled: z.boolean().optional(),
      severity: z.enum(['info', 'low', 'medium', 'high', 'critical']).optional(),
      definition: z.record(z.unknown()).optional(),
      reason: z.string().min(1),
    })
    
    const data = schema.parse(req.body)
    
    const existing = await getRulesCollection().findOne({ _id: req.params.ruleId })
    if (!existing) {
      throw ApiError.notFound('Rule not found')
    }
    
    const update: any = { updatedAt: new Date().toISOString() }
    if (data.enabled !== undefined) update.enabled = data.enabled
    if (data.severity) update.severity = data.severity
    if (data.definition) update.definition = data.definition
    
    const result = await getRulesCollection().findOneAndUpdate(
      { _id: req.params.ruleId },
      { $set: update },
      { returnDocument: 'after' }
    )
    
    // Audit log
    await getAuditLogsCollection().insertOne({
      _id: `audit_${uuidv4()}`,
      actorId: req.user!.id,
      action: 'rule.update',
      targetType: 'rule',
      targetId: req.params.ruleId,
      before: { enabled: existing.enabled, severity: existing.severity },
      after: { enabled: data.enabled, severity: data.severity },
      reason: data.reason,
      createdAt: new Date().toISOString(),
    })
    
    res.json({
      id: result!._id,
      code: result!.code,
      version: result!.version,
      severity: result!.severity,
      enabled: result!.enabled,
      updatedAt: result!.updatedAt,
    })
  } catch (error) {
    next(error)
  }
})

// GET /admin/reports (community report review queue)
router.get('/reports', async (req: AuthenticatedRequest, res, next) => {
  try {
    const status = req.query.status as string || 'pending_review'
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const skip = (page - 1) * limit
    
    const filter: any = {}
    if (status) filter.status = status
    
    const collection = getThreatReportsCollection()
    const [data, total] = await Promise.all([
      collection.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ])
    
    res.json({
      data: data.map((r: ThreatReportDocument) => ({
        id: r._id,
        entityType: r.entityType,
        value: r.value,
        chain: r.chain,
        category: r.category,
        description: r.description,
        evidenceUrls: r.evidenceUrls,
        status: r.status,
        reporterId: r.reporterId,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
        reviewerId: r.reviewerId,
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

// POST /admin/reports/:reportId/verify
router.post('/reports/:reportId/verify', async (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({
      decision: z.enum(['verified', 'rejected']),
      confidence: z.number().min(0).max(1).optional(),
      notes: z.string().optional(),
    })
    
    const data = schema.parse(req.body)
    
    const report = await getThreatReportsCollection().findOne({
      _id: req.params.reportId,
    })
    
    if (!report) {
      throw ApiError.notFound('Report not found')
    }
    
    if (report.status !== 'pending_review') {
      throw ApiError.conflict('Report has already been reviewed')
    }
    
    const now = new Date().toISOString()
    const newStatus = data.decision === 'verified' ? 'verified' : 'rejected'
    
    await getThreatReportsCollection().updateOne(
      { _id: req.params.reportId },
      {
        $set: {
          status: newStatus,
          reviewedAt: now,
          reviewerId: req.user!.id,
          reviewerNotes: data.notes,
          reviewerConfidence: data.confidence,
        },
      }
    )
    
    // Update threat entity if verified
    if (data.decision === 'verified') {
      await getThreatEntitiesCollection().updateOne(
        { value: report.value, chain: report.chain, type: report.entityType },
        {
          $set: {
            label: report.category,
            confidence: data.confidence || 0.8,
            status: 'verified',
            lastSeen: now,
          },
          $push: {
            sources: {
              name: 'Admin Verification',
              url: `internal://report/${report._id}`,
              observedAt: now,
            } as const,
          },
        }
      )
    }
    
    // Audit log
    await getAuditLogsCollection().insertOne({
      _id: `audit_${uuidv4()}`,
      actorId: req.user!.id,
      action: 'report.verify',
      targetType: 'threat_report',
      targetId: req.params.reportId,
      after: { decision: data.decision, confidence: data.confidence },
      reason: data.notes,
      createdAt: now,
    })
    
    res.json({
      id: req.params.reportId,
      status: newStatus,
      reviewedAt: now,
      reviewerId: req.user!.id,
    })
  } catch (error) {
    next(error)
  }
})

// GET /admin/audit-logs
router.get('/audit-logs', async (req: AuthenticatedRequest, res, next) => {
  try {
    const actorId = req.query.actorId as string
    const action = req.query.action as string
    const targetType = req.query.targetType as string
    const from = req.query.from as string
    const to = req.query.to as string
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)
    const skip = (page - 1) * limit
    
    const filter: any = {}
    if (actorId) filter.actorId = actorId
    if (action) filter.action = action
    if (targetType) filter.targetType = targetType
    if (from || to) {
      filter.createdAt = {}
      if (from) filter.createdAt.$gte = from
      if (to) filter.createdAt.$lte = to
    }
    
    const collection = getAuditLogsCollection()
    const [data, total] = await Promise.all([
      collection.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ])
    
    res.json({
      data: data.map((a: AuditLogDocument) => ({
        id: a._id,
        actorId: a.actorId,
        action: a.action,
        targetType: a.targetType,
        targetId: a.targetId,
        before: a.before,
        after: a.after,
        reason: a.reason,
        createdAt: a.createdAt,
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

export default router