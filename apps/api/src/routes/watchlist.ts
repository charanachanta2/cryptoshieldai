import { Router, Response } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getCollection, COLLECTIONS } from '../config/database.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'

const router = Router()

const watchlistItemSchema = z.object({
  assetType: z.enum(['wallet', 'token', 'contract']),
  value: z.string().min(1),
  chain: z.string().min(1),
  label: z.string().max(100).optional(),
  alertPolicy: z.object({
    riskChange: z.boolean().default(true),
    newReports: z.boolean().default(true),
    minimumSeverity: z.enum(['info', 'low', 'medium', 'high', 'critical']).default('medium'),
  }).optional(),
})

const updateWatchlistSchema = z.object({
  label: z.string().max(100).optional(),
  alertPolicy: z.object({
    riskChange: z.boolean().optional(),
    newReports: z.boolean().optional(),
    minimumSeverity: z.enum(['info', 'low', 'medium', 'high', 'critical']).optional(),
  }).optional(),
})

// GET /watchlist
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const items = await getCollection(COLLECTIONS.watchlists)
      .find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .toArray()
    
    res.json({
      data: items.map(item => ({
        id: item._id,
        userId: item.userId,
        assetType: item.assetType,
        value: item.value,
        chain: item.chain,
        label: item.label,
        alertPolicy: item.alertPolicy,
        lastCheckedAt: item.lastCheckedAt,
        lastRiskLevel: item.lastRiskLevel,
        createdAt: item.createdAt,
      })),
      meta: {
        page: 1,
        limit: items.length,
        total: items.length,
        hasNext: false,
      },
    })
  } catch (error) {
    next(error)
  }
})

// POST /watchlist
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = watchlistItemSchema.parse(req.body)
    
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(data.value)) {
      throw ApiError.validation('Invalid address format', [{
        field: 'value',
        issue: 'invalid_address',
        message: 'Address must be a valid Ethereum address (0x + 40 hex chars)',
      }])
    }
    
    const watchId = `watch_${uuidv4()}`
    const now = new Date().toISOString()
    
    const watchDoc = {
      _id: watchId,
      userId: req.user!.id,
      assetType: data.assetType,
      value: data.value.toLowerCase(),
      chain: data.chain,
      label: data.label || '',
      alertPolicy: data.alertPolicy || {
        riskChange: true,
        newReports: true,
        minimumSeverity: 'medium',
      },
      lastCheckedAt: null,
      lastRiskLevel: null,
      createdAt: now,
    }
    
    try {
      await getCollection(COLLECTIONS.watchlists).insertOne(watchDoc)
    } catch (error: any) {
      if (error.code === 11000) {
        throw ApiError.conflict('This asset is already on your watchlist')
      }
      throw error
    }
    
    res.status(201).json({
      id: watchId,
      userId: req.user!.id,
      assetType: data.assetType,
      value: data.value.toLowerCase(),
      chain: data.chain,
      label: data.label || '',
      alertPolicy: watchDoc.alertPolicy,
      lastCheckedAt: null,
      lastRiskLevel: null,
      createdAt: now,
    })
  } catch (error) {
    next(error)
  }
})

// GET /watchlist/:watchId
router.get('/:watchId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const item = await getCollection(COLLECTIONS.watchlists).findOne({
      _id: req.params.watchId,
      userId: req.user!.id,
    })
    
    if (!item) {
      throw ApiError.notFound('Watchlist item not found')
    }
    
    res.json({
      id: item._id,
      userId: item.userId,
      assetType: item.assetType,
      value: item.value,
      chain: item.chain,
      label: item.label,
      alertPolicy: item.alertPolicy,
      lastCheckedAt: item.lastCheckedAt,
      lastRiskLevel: item.lastRiskLevel,
      createdAt: item.createdAt,
    })
  } catch (error) {
    next(error)
  }
})

// PATCH /watchlist/:watchId
router.patch('/:watchId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = updateWatchlistSchema.parse(req.body)
    
    const result = await getCollection(COLLECTIONS.watchlists).findOneAndUpdate(
      { _id: req.params.watchId, userId: req.user!.id },
      { $set: data },
      { returnDocument: 'after' }
    )
    
    if (!result) {
      throw ApiError.notFound('Watchlist item not found')
    }
    
    res.json({
      id: result._id,
      userId: result.userId,
      assetType: result.assetType,
      value: result.value,
      chain: result.chain,
      label: result.label,
      alertPolicy: result.alertPolicy,
      lastCheckedAt: result.lastCheckedAt,
      lastRiskLevel: result.lastRiskLevel,
      createdAt: result.createdAt,
    })
  } catch (error) {
    next(error)
  }
})

// DELETE /watchlist/:watchId
router.delete('/:watchId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await getCollection(COLLECTIONS.watchlists).deleteOne({
      _id: req.params.watchId,
      userId: req.user!.id,
    })
    
    if (result.deletedCount === 0) {
      throw ApiError.notFound('Watchlist item not found')
    }
    
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

// GET /watchlist/:watchId/alerts
router.get('/:watchId/alerts', async (req: AuthenticatedRequest, res, next) => {
  try {
    const alerts = await getCollection(COLLECTIONS.alerts)
      .find({ watchId: req.params.watchId, userId: req.user!.id })
      .sort({ createdAt: -1 })
      .toArray()
    
    res.json({
      data: alerts.map(a => ({
        id: a._id,
        userId: a.userId,
        watchId: a.watchId,
        type: a.type,
        severity: a.severity,
        title: a.title,
        detail: a.detail,
        readAt: a.readAt,
        createdAt: a.createdAt,
      })),
      meta: {
        page: 1,
        limit: alerts.length,
        total: alerts.length,
        hasNext: false,
      },
    })
  } catch (error) {
    next(error)
  }
})

export default router