import { Router, Response } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { 
  getScansCollection,
  getScanEvidenceCollection,
  getThreatEntitiesCollection,
  getJobsCollection,
  getIdempotencyKeysCollection
} from '../config/database.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'
import { logger } from '../utils/logger.js'
import { ethers } from 'ethers'

const router = Router()

// Validation schemas
const walletScanSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chain: z.enum(['ethereum', 'sepolia', 'polygon', 'arbitrum', 'optimism']),
  refresh: z.boolean().optional(),
})

const tokenScanSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chain: z.enum(['ethereum', 'sepolia', 'polygon', 'arbitrum', 'optimism']),
  refresh: z.boolean().optional(),
})

const contractScanSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chain: z.enum(['ethereum', 'sepolia', 'polygon', 'arbitrum', 'optimism']),
  includeSource: z.boolean().optional(),
})

const transactionScanSchema = z.object({
  chain: z.enum(['ethereum', 'sepolia', 'polygon', 'arbitrum', 'optimism']),
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  value: z.string().regex(/^\d+(\.\d+)?$/),
  token: z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    amount: z.string().regex(/^\d+(\.\d+)?$/),
    decimals: z.number().int().positive(),
  }).optional(),
  data: z.string().optional(),
  gasPrice: z.string().optional(),
  nonce: z.number().int().nonnegative().optional(),
}).strict()

// POST /scans/wallet
router.post('/wallet', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = walletScanSchema.parse(req.body)
    const idempotencyKey = req.headers['idempotency-key'] as string
    
    if (idempotencyKey) {
      const existing = await checkIdempotency(idempotencyKey, req.user!.id)
      if (existing) return res.json(existing)
    }
    
    const scanId = `scan_${uuidv4()}`
    const now = new Date().toISOString()
    
    const scanDoc = {
      _id: scanId,
      userId: req.user!.id,
      type: 'wallet' as const,
      chain: data.chain,
      status: 'queued' as const,
      input: {
        address: data.address.toLowerCase(),
        chain: data.chain,
        refresh: data.refresh,
      },
      evidence: [],
      dataCoverage: {
        transactionHistory: false,
        threatIntelligence: false,
        model: false,
        tokenMetadata: false,
        contractMetadata: false,
        calldataDecoded: false,
      },
      versions: {
        api: '0.1.0',
        model: process.env.MODEL_VERSION || '0.1.0-exploratory',
        rules: '2026-10-27.1',
        threatIntel: '2026-10-27',
      },
      createdAt: now,
    }
    
    await getScansCollection().insertOne(scanDoc)
    await queueScanJob(scanId, 'wallet', data)
    
    if (idempotencyKey) {
      await storeIdempotencyKey(idempotencyKey, req.user!.id, {
        id: scanId,
        status: 'queued',
        pollUrl: `/api/v1/scans/${scanId}`,
        eventsUrl: `/api/v1/scans/${scanId}/events`,
      })
    }
    
    res.status(202).json({
      id: scanId,
      status: 'queued',
      pollUrl: `/api/v1/scans/${scanId}`,
      eventsUrl: `/api/v1/scans/${scanId}/events`,
    })
  } catch (error) {
    next(error)
  }
})

// POST /scans/token
router.post('/token', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = tokenScanSchema.parse(req.body)
    const idempotencyKey = req.headers['idempotency-key'] as string
    
    if (idempotencyKey) {
      const existing = await checkIdempotency(idempotencyKey, req.user!.id)
      if (existing) return res.json(existing)
    }
    
    const scanId = `scan_${uuidv4()}`
    const now = new Date().toISOString()
    
    const scanDoc = {
      _id: scanId,
      userId: req.user!.id,
      type: 'token' as const,
      chain: data.chain,
      status: 'queued' as const,
      input: {
        address: data.address.toLowerCase(),
        chain: data.chain,
        refresh: data.refresh,
      },
      evidence: [],
      dataCoverage: {
        transactionHistory: false,
        threatIntelligence: false,
        model: false,
        tokenMetadata: false,
        contractMetadata: false,
        calldataDecoded: false,
      },
      versions: {
        api: '0.1.0',
        model: process.env.MODEL_VERSION || '0.1.0-exploratory',
        rules: '2026-10-27.1',
        threatIntel: '2026-10-27',
      },
      createdAt: now,
    }
    
    await getScansCollection().insertOne(scanDoc)
    await queueScanJob(scanId, 'token', data)
    
    if (idempotencyKey) {
      await storeIdempotencyKey(idempotencyKey, req.user!.id, {
        id: scanId,
        status: 'queued',
        pollUrl: `/api/v1/scans/${scanId}`,
        eventsUrl: `/api/v1/scans/${scanId}/events`,
      })
    }
    
    res.status(202).json({
      id: scanId,
      status: 'queued',
      pollUrl: `/api/v1/scans/${scanId}`,
      eventsUrl: `/api/v1/scans/${scanId}/events`,
    })
  } catch (error) {
    next(error)
  }
})

// POST /scans/contract
router.post('/contract', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = contractScanSchema.parse(req.body)
    const idempotencyKey = req.headers['idempotency-key'] as string
    
    if (idempotencyKey) {
      const existing = await checkIdempotency(idempotencyKey, req.user!.id)
      if (existing) return res.json(existing)
    }
    
    const scanId = `scan_${uuidv4()}`
    const now = new Date().toISOString()
    
    const scanDoc = {
      _id: scanId,
      userId: req.user!.id,
      type: 'contract' as const,
      chain: data.chain,
      status: 'queued' as const,
      input: {
        address: data.address.toLowerCase(),
        chain: data.chain,
        includeSource: data.includeSource,
      },
      evidence: [],
      dataCoverage: {
        transactionHistory: false,
        threatIntelligence: false,
        model: false,
        tokenMetadata: false,
        contractMetadata: false,
        calldataDecoded: false,
      },
      versions: {
        api: '0.1.0',
        model: process.env.MODEL_VERSION || '0.1.0-exploratory',
        rules: '2026-10-27.1',
        threatIntel: '2026-10-27',
      },
      createdAt: now,
    }
    
    await getScansCollection().insertOne(scanDoc)
    await queueScanJob(scanId, 'contract', data)
    
    if (idempotencyKey) {
      await storeIdempotencyKey(idempotencyKey, req.user!.id, {
        id: scanId,
        status: 'queued',
        pollUrl: `/api/v1/scans/${scanId}`,
        eventsUrl: `/api/v1/scans/${scanId}/events`,
      })
    }
    
    res.status(202).json({
      id: scanId,
      status: 'queued',
      pollUrl: `/api/v1/scans/${scanId}`,
      eventsUrl: `/api/v1/scans/${scanId}/events`,
    })
  } catch (error) {
    next(error)
  }
})

// POST /scans/transaction (USP - Pre-signing analysis)
router.post('/transaction', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = transactionScanSchema.parse(req.body)
    const idempotencyKey = req.headers['idempotency-key'] as string
    
    // Validate no post-execution fields
    const forbiddenFields = ['gasUsed', 'status', 'logs', 'receipt', 'blockNumber', 'transactionIndex']
    for (const field of forbiddenFields) {
      if (field in req.body) {
        throw ApiError.validation(`Post-execution field not allowed: ${field}`, [{
          field,
          issue: 'forbidden_field',
          message: 'This endpoint only accepts pre-signing inputs',
        }])
      }
    }
    
    if (idempotencyKey) {
      const existing = await checkIdempotency(idempotencyKey, req.user!.id)
      if (existing) return res.json(existing)
    }
    
    const scanId = `scan_${uuidv4()}`
    const now = new Date().toISOString()
    
    const analysisResult = await runTransactionAnalysis(data)
    
    const scanDoc = {
      _id: scanId,
      userId: req.user!.id,
      type: 'transaction' as const,
      chain: data.chain,
      status: 'completed' as const,
      input: data,
      risk: analysisResult.risk,
      evidence: analysisResult.evidence,
      dataCoverage: analysisResult.dataCoverage,
      versions: {
        api: '0.1.0',
        model: analysisResult.modelVersion
          ? (analysisResult.dataCoverage.model
              ? analysisResult.modelVersion
              : `${analysisResult.modelVersion} (exploratory - incomplete features)`)
          : 'pre-signing-0.1.0 (ML not run)',
        ...(analysisResult.modelFeatureVersion
          ? { featureSchema: analysisResult.modelFeatureVersion }
          : {}),
        rules: '2026-10-27.1',
        threatIntel: '2026-10-27',
      },
      createdAt: now,
      completedAt: new Date().toISOString(),
    }
    
    await getScansCollection().insertOne(scanDoc)
    
    if (analysisResult.evidence.length > 0) {
      await getScanEvidenceCollection().insertMany(
        analysisResult.evidence.map((ev: any) => ({
          scanId,
          ...ev,
        }))
      )
    }
    
    if (idempotencyKey) {
      await storeIdempotencyKey(idempotencyKey, req.user!.id, scanDoc)
    }
    
    res.json(scanDoc)
  } catch (error) {
    next(error)
  }
})

// GET /scans
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const skip = (page - 1) * limit
    
    const filter: any = { userId: req.user!.id }
    
    if (req.query.type) filter.type = req.query.type
    if (req.query.chain) filter.chain = req.query.chain
    if (req.query.riskLevel) filter['risk.level'] = req.query.riskLevel
    if (req.query.status) filter.status = req.query.status
    if (req.query.from || req.query.to) {
      filter.createdAt = {}
      if (req.query.from) filter.createdAt.$gte = req.query.from
      if (req.query.to) filter.createdAt.$lte = req.query.to
    }
    
    const sortField = req.query.sort as string || 'createdAt'
    const sortOrder = req.query.order === 'asc' ? 1 : -1
    const sort: any = { [sortField]: sortOrder }
    
    const [data, total] = await Promise.all([
      getScansCollection().find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .project({
          _id: 1,
          type: 1,
          chain: 1,
          status: 1,
          riskLevel: '$risk.level',
          summary: '$risk.summary',
          createdAt: 1,
        })
        .toArray(),
      getScansCollection().countDocuments(filter),
    ])
    
    res.json({
      data: data.map(s => ({
        id: s._id,
        type: s.type,
        chain: s.chain,
        status: s.status,
        riskLevel: s.riskLevel,
        summary: s.summary,
        createdAt: s.createdAt,
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

// GET /scans/:scanId
router.get('/:scanId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const scan = await getScansCollection().findOne({
      _id: req.params.scanId,
      userId: req.user!.id,
    })
    
    if (!scan) {
      throw ApiError.notFound('Scan not found')
    }
    
    res.json(scan)
  } catch (error) {
    next(error)
  }
})

// GET /scans/:scanId/events (SSE)
router.get('/:scanId/events', async (req: AuthenticatedRequest, res, next) => {
  try {
    const scan = await getScansCollection().findOne({
      _id: req.params.scanId,
      userId: req.user!.id,
    })
    
    if (!scan) {
      throw ApiError.notFound('Scan not found')
    }
    
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()
    
    res.write(`event: status\n`)
    res.write(`data: ${JSON.stringify({ status: scan.status, progress: scan.status === 'completed' ? 1.0 : 0.5 })}\n\n`)
    
    if (scan.status === 'completed' || scan.status === 'failed') {
      res.write(`event: status\n`)
      res.write(`data: ${JSON.stringify({ status: scan.status, progress: 1.0 })}\n\n`)
      return res.end()
    }
    
    const interval = setInterval(async () => {
      const updated = await getScansCollection().findOne({ _id: req.params.scanId })
      if (updated) {
        res.write(`event: status\n`)
        res.write(`data: ${JSON.stringify({ 
          status: updated.status, 
          progress: updated.status === 'completed' ? 1.0 : 0.5 
        })}\n\n`)
        
        if (updated.status === 'completed' || updated.status === 'failed') {
          clearInterval(interval)
          res.end()
        }
      }
    }, 1000)
    
    req.on('close', () => clearInterval(interval))
  } catch (error) {
    next(error)
  }
})

// DELETE /scans/:scanId
router.delete('/:scanId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await getScansCollection().deleteOne({
      _id: req.params.scanId,
      userId: req.user!.id,
    })
    
    if (result.deletedCount === 0) {
      throw ApiError.notFound('Scan not found')
    }
    
    await getScanEvidenceCollection().deleteMany({ scanId: req.params.scanId })
    
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

// ML Integration Types
interface MLTransactionFeatures {
  length_to: number
  value: number
  effective_gas_price: number
  is_same_address: boolean
  gas_price_ratio: number
  token_transfer_amount: number
  gas_used: number
  gas_efficiency: number
  total_gas_cost: number
  cumulative_gas_used: number
  length_log: number
}

interface MLPredictRequest {
  model: 'transaction_risk'
  model_version: string
  chain: string
  features: MLTransactionFeatures
}

interface MLPredictResponse {
  model: string
  model_version: string
  feature_version: string
  score: number
  risk_level: 'safe' | 'medium' | 'high' | 'unknown'
  threshold: number
  calibrated: boolean
  evidence: Array<{
    code: string
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
    detail: string
  }>
  limitations: string[]
  request_id: string
}

interface MLCallResult {
  prediction: MLPredictResponse | null
  modelVersion: string | null
  error: string | null
  featuresComplete: boolean
  limitations: string[]
}

/**
 * Map transaction scan input to ML model features.
 *
 * Only features that can genuinely be derived from the incoming request are
 * populated with real values.  Post-execution features are explicitly set to 0
 * as documented by the ML service schema (these are only known after execution
 * and are intentionally zero for pre-signing analysis).  gas_price_ratio cannot
 * be derived without a network-wide baseline (e.g. median gas price) and is
 * therefore set to 0.0 with a documented limitation.
 *
 * Returns the feature object plus a list of pre-signing limitations that should
 * be reported alongside any ML prediction.
 */
function mapTransactionFeatures(data: any): {
  features: MLTransactionFeatures
  featuresComplete: boolean
  limitations: string[]
} {
  const limitations: string[] = []

  // --- Genuinely derivable pre-signing features ---
  const length_to = data.to ? data.to.length : 0
  const value = parseFloat(data.value) / 1e18 // Convert wei to ETH
  const effective_gas_price = data.gasPrice ? parseFloat(data.gasPrice) : 0
  const is_same_address =
    data.from?.toLowerCase() === data.to?.toLowerCase()
  const token_transfer_amount = data.token
    ? parseFloat(data.token.amount) /
      Math.pow(10, data.token.decimals)
    : 0

  // --- gas_price_ratio: NOT derivable pre-signing ---
  // A genuine gas price ratio requires a network-wide baseline (e.g. median
  // gas price at the time).  No such baseline is available from the request.
  limitations.push(
    'gas_price_ratio is not available pre-signing (no network baseline) and is set to 0.'
  )

  // --- Post-execution features: set to 0 per ML schema documentation ---
  // The model's TransactionFeatures schema explicitly states these are
  // POST-EXECUTION fields to be set to 0 for pre-signing analysis.
  limitations.push(
    'Post-execution features (gas_used, gas_efficiency, total_gas_cost, cumulative_gas_used, length_log) are not available pre-signing and are set to 0.'
  )
  limitations.push(
    'This model was trained on post-execution data; pre-signing predictions are exploratory.'
  )
  limitations.push(
    'The ML score should not be used as the sole basis for signing decisions.'
  )

  const features: MLTransactionFeatures = {
    length_to,
    value,
    effective_gas_price,
    is_same_address,
    gas_price_ratio: 0.0,
    token_transfer_amount,
    gas_used: 0,
    gas_efficiency: 0,
    total_gas_cost: 0,
    cumulative_gas_used: 0,
    length_log: 0,
  }

  // featuresComplete is false because we cannot derive all 11 features
  // genuinely from pre-signing data (gas_price_ratio + 5 post-execution).
  return {
    features,
    featuresComplete: false,
    limitations,
  }
}

async function callMLPrediction(data: any): Promise<MLCallResult> {
  const mlServiceUrl =
    process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000'
  const modelVersion =
    process.env.MODEL_VERSION || '0.1.0-exploratory'

  // Map only genuinely available features from the transaction request
  const { features, featuresComplete, limitations } =
    mapTransactionFeatures(data)

  // Validate that we have minimum required pre-broadcast features
  const hasMinFeatures =
    features.length_to > 0 &&
    features.value >= 0 &&
    features.effective_gas_price >= 0
  if (!hasMinFeatures) {
    return {
      prediction: null,
      modelVersion: null,
      error: 'Insufficient transaction features for ML prediction',
      featuresComplete: false,
      limitations: [
        'Missing required pre-broadcast features (to address, value, gasPrice)',
      ],
    }
  }

  const request: MLPredictRequest = {
    model: 'transaction_risk',
    model_version: modelVersion,
    chain: data.chain,
    features,
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      5000
    ) // 5 second timeout

    const response = await fetch(`${mlServiceUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'Unknown error')
      return {
        prediction: null,
        modelVersion: null,
        error: `ML service error: ${response.status} ${errorText}`,
        featuresComplete,
        limitations,
      }
    }

    const prediction = await response.json() as MLPredictResponse

    // Validate prediction response integrity
    if (
      typeof prediction.score !== 'number' ||
      typeof prediction.risk_level !== 'string' ||
      !Array.isArray(prediction.evidence)
    ) {
      return {
        prediction: null,
        modelVersion: null,
        error: 'ML service returned malformed prediction response',
        featuresComplete,
        limitations,
      }
    }

    // Combine ML service limitations with our known limitations
    const allLimitations = [
      ...limitations,
      ...(prediction.limitations || []),
    ]
    return {
      prediction,
      modelVersion: prediction.model_version,
      error: null,
      featuresComplete,
      limitations: allLimitations,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.name === 'AbortError' ||
        error.name === 'TimeoutError'
      ) {
        return {
          prediction: null,
          modelVersion: null,
          error: 'ML prediction timeout',
          featuresComplete,
          limitations,
        }
      }
      return {
        prediction: null,
        modelVersion: null,
        error: `ML prediction failed: ${error.message}`,
        featuresComplete,
        limitations,
      }
    }
    return {
      prediction: null,
      modelVersion: null,
      error: 'ML prediction failed: unknown error',
      featuresComplete,
      limitations,
    }
  }
}

// Helper functions
async function checkIdempotency(key: string, userId: string) {
  const collection = getIdempotencyKeysCollection()
  const record = await collection.findOne({ key, userId })
  if (record) return record.response
  return null
}

async function storeIdempotencyKey(key: string, userId: string, response: any) {
  const collection = getIdempotencyKeysCollection()
  await collection.insertOne({
    _id: uuidv4(),
    key,
    userId,
    response,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  })
}

async function queueScanJob(scanId: string, type: string, data: any) {
  const jobsCollection = getJobsCollection()
  await jobsCollection.insertOne({
    _id: `job_${uuidv4()}`,
    type: `scan:${type}`,
    scanId,
    payload: data,
    status: 'pending',
    runAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  })
}

async function runTransactionAnalysis(data: any) {
  const evidence: any[] = []
  let riskLevel: 'safe' | 'medium' | 'high' | 'unknown' = 'unknown'
  let score = 0.5
  let confidence: 'low' | 'medium' | 'high' = 'medium'
  let summary = 'Transaction analysis completed'
  let recommendedAction: 'proceed_with_caution' | 'do_not_proceed' | 'do_not_sign' | 'review_evidence' | 'unknown' = 'review_evidence'
  let modelVersion: string | null = null
  let modelCoverage = false
  let mlLimitations: string[] = []
  
  // Call ML prediction service
  const mlResult = await callMLPrediction(data)
  let mlScore = 0.5 // Default neutral score if ML unavailable
  let mlRiskLevel: 'safe' | 'medium' | 'high' | 'unknown' = 'unknown'
  let mlFeatureVersion: string | null = null
  if (mlResult.prediction && !mlResult.error) {
    modelVersion = mlResult.modelVersion
    mlFeatureVersion = mlResult.prediction.feature_version || null
    mlLimitations = mlResult.limitations || []
    mlScore = mlResult.prediction.score
    mlRiskLevel = mlResult.prediction.risk_level

    // ML coverage is only truthfully complete when ALL required model
    // features were genuinely derivable from the request AND a real
    // prediction was received and validated.  For pre-signing analysis,
    // gas_price_ratio and 5 post-execution features cannot be derived, so
    // featuresComplete is always false here.  dataCoverage.model therefore
    // stays false.
    modelCoverage = mlResult.featuresComplete
    if (!modelCoverage) {
      mlLimitations.push(
        'ML coverage is incomplete: not all required model features could be ' +
          'genuinely derived from pre-signing data.'
      )
    }

    // Only blend the ML score into the risk calculation when all required
    // features were genuinely available.  When features are incomplete
    // (always the case for pre-signing analysis with this model), the ML
    // score is NOT fused into the risk score — rule-based and threat-
    // intelligence logic determine the risk entirely.  The ML prediction is
    // still retained as informational evidence.
    if (modelCoverage) {
      // Use ML as a supplementary signal with LOW weight (20% ML, 80% rules)
      // Rule-based and threat intel findings take precedence
      const ruleBasedScore = score // 0.5 default before rule/threat analysis
      score = mlScore * 0.2 + ruleBasedScore * 0.8
    }

    // Add ML evidence to evidence list with LOW confidence (exploratory)
    for (const mlEvidence of mlResult.prediction.evidence) {
      evidence.push({
        id: `ev_${uuidv4()}`,
        source: 'model',
        code: mlEvidence.code,
        severity: mlEvidence.severity,
        title: `ML (exploratory): ${mlEvidence.code.replace(/_/g, ' ')}`,
        detail: mlEvidence.detail,
        confidence: 0.3, // Low confidence due to unavailable pre-signing features
      })
    }

    // Add ML limitations as evidence
    for (const limitation of mlLimitations) {
      evidence.push({
        id: `ev_${uuidv4()}`,
        source: 'model',
        code: 'ML_LIMITATION',
        severity: 'info',
        title: 'ML Model Limitation',
        detail: limitation,
        confidence: 0.5,
      })
    }
  } else if (mlResult.error) {
    // Log ML error but continue with rule-based analysis
    logger.warn('ML prediction unavailable, using rule-based analysis only', {
      error: mlResult.error,
      scanType: 'transaction',
    })
    // Add ML unavailability as evidence
    evidence.push({
      id: `ev_${uuidv4()}`,
      source: 'model',
      code: 'ML_UNAVAILABLE',
      severity: 'info',
      title: 'ML Analysis Unavailable',
      detail: `ML prediction could not be completed: ${mlResult.error}`,
      confidence: 0.5,
    })
  }
  
  // Rule-based analysis: Check for unlimited approval
  if (data.data && typeof data.data === 'string' && data.data.toLowerCase().startsWith('0x095ea7b3')) {
    const amountParam = data.data.slice(10)
    const maxUint256 = 'f'.repeat(64)
    if (amountParam === maxUint256 || amountParam.endsWith(maxUint256)) {
      evidence.push({
        id: `ev_${uuidv4()}`,
        source: 'rule',
        code: 'UNLIMITED_APPROVAL',
        severity: 'high',
        title: 'Unlimited token approval',
        detail: 'The calldata sets the allowance to the maximum uint256 value.',
        confidence: 1.0,
      })
      riskLevel = 'high'
      score = 0.9
      confidence = 'high'
      summary = 'The transaction grants an unlimited token approval'
      recommendedAction = 'do_not_sign'
    }
  }
  
  // Threat intelligence analysis
  const threatEntities = await getThreatEntitiesCollection().find({
    $or: [
      { value: data.from.toLowerCase() },
      { value: data.to.toLowerCase() },
    ],
    chain: data.chain,
    status: 'verified',
  }).toArray()
  
  for (const entity of threatEntities) {
    evidence.push({
      id: `ev_${uuidv4()}`,
      source: 'threat_intel',
      code: `${entity.label.toUpperCase()}_MATCH`,
      severity: entity.label === 'phishing' ? 'critical' : 'high',
      title: `Address matches ${entity.label} report`,
      detail: `The ${entity.value === data.from.toLowerCase() ? 'sender' : 'recipient'} appears in a verified ${entity.label} report.`,
      confidence: entity.confidence,
      references: entity.sources.map(s => ({ label: s.name, url: s.url })),
    })
    
    if (entity.label === 'phishing') {
      riskLevel = 'high'
      score = Math.max(score, 0.95)
      confidence = 'high'
      summary = `The transaction involves a ${entity.label} address`
      recommendedAction = 'do_not_sign'
    }
  }
  
  // Determine final risk level based on combined score and highest severity evidence
  // Rule-based and threat intel findings override ML exploratory score
  const hasHighSeverityRuleOrThreat = evidence.some(e => 
    (e.source === 'rule' || e.source === 'threat_intel') && 
    (e.severity === 'high' || e.severity === 'critical')
  )
  
  if (hasHighSeverityRuleOrThreat) {
    // High severity rule/threat finding already set riskLevel/score above
    // Keep those values
  } else if (riskLevel === 'unknown') {
    // No high-severity findings, determine from combined score
    if (score < 0.35) {
      riskLevel = 'safe'
      confidence = 'medium'
      recommendedAction = 'proceed_with_caution'
      summary = 'Low risk detected by combined analysis'
    } else if (score < 0.65) {
      riskLevel = 'medium'
      confidence = 'medium'
      recommendedAction = 'review_evidence'
      summary = 'Medium risk detected - review evidence'
    } else {
      riskLevel = 'high'
      confidence = 'high'
      recommendedAction = 'do_not_sign'
      summary = 'High risk detected - do not sign'
    }
  }
  
  // If no evidence from rules or threat intel, add default "no threats" evidence
  const hasRuleOrThreatEvidence = evidence.some(e => e.source === 'rule' || e.source === 'threat_intel')
  const hasModelEvidence = evidence.some(e => e.source === 'model' && e.code !== 'ML_UNAVAILABLE' && e.code !== 'ML_LIMITATION')
  
  if (!hasRuleOrThreatEvidence && !hasModelEvidence) {
    evidence.push({
      id: `ev_${uuidv4()}`,
      source: 'rule',
      code: 'NO_THREATS_FOUND',
      severity: 'info',
      title: 'No known threats detected',
      detail: 'No threat intelligence matches or rule violations found for the provided inputs.',
      confidence: 0.5,
    })
    // Only override risk if ML didn't provide a score and no rule/threat evidence
    if (!modelCoverage) {
      riskLevel = 'safe'
      score = 0.2
      confidence = 'low'
      summary = 'No strong risk signals detected'
      recommendedAction = 'proceed_with_caution'
    }
  }
  
  return {
    risk: {
      level: riskLevel,
      score,
      confidence,
      summary,
      recommendedAction,
    },
    evidence,
    dataCoverage: {
      transactionHistory: false,
      threatIntelligence: threatEntities.length > 0,
      model: modelCoverage,
      tokenMetadata: !!data.token,
      contractMetadata: false,
      calldataDecoded: !!data.data,
    },
    modelVersion: modelVersion,
    modelFeatureVersion: mlFeatureVersion,
}
}

export default router