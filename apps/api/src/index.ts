import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { connectDB } from './config/database.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authMiddleware } from './middleware/auth.js'
import { rateLimiter } from './middleware/rateLimiter.js'
import { requestIdMiddleware } from './middleware/requestId.js'
import authRoutes from './routes/auth.js'
import scanRoutes from './routes/scans.js'
import threatIntelRoutes from './routes/threatIntel.js'
import watchlistRoutes from './routes/watchlist.js'
import reportRoutes from './routes/reports.js'
import adminRoutes from './routes/admin.js'
import assistantRoutes from './routes/assistant.js'
import adminTestRoutes from './routes/adminTest.js'
import { logger } from './utils/logger.js'

const app = express()
const PORT = parseInt(process.env.PORT || '4001', 10)

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1)

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Disable for development
}))
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }))
app.use(requestIdMiddleware)
app.use(rateLimiter)

// Health endpoints (no auth)
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'cryptoshield-api',
    version: '0.1.0',
    uptimeSeconds: Math.floor(process.uptime()),
  })
})

app.get('/api/v1/ready', async (req, res) => {
  try {
    // Check MongoDB
    const db = await connectDB()
    await db.command({ ping: 1 })
    
    // Check ML service
    let mlStatus: 'ok' | 'unavailable' = 'unavailable'
    try {
      const mlResponse = await fetch(`${process.env.ML_SERVICE_URL}/health`, { 
        signal: AbortSignal.timeout(2000) 
      })
      mlStatus = mlResponse.ok ? 'ok' : 'unavailable'
    } catch {
      mlStatus = 'unavailable'
    }
    
    if (mlStatus === 'unavailable') {
      return res.status(503).json({
        status: 'not_ready',
        checks: {
          mongodb: 'ok',
          mlService: 'unavailable',
        },
        error: {
          code: 'MODEL_NOT_READY',
          message: 'The ML service is unavailable.',
          requestId: req.id,
          retryable: true,
        },
      })
    }
    
    res.json({
      status: 'ready',
      checks: {
        mongodb: 'ok',
        mlService: 'ok',
      },
      modelVersion: process.env.MODEL_VERSION,
    })
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      checks: {
        mongodb: 'error',
        mlService: 'unavailable',
      },
      error: {
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'Database connection failed.',
        requestId: req.id,
        retryable: true,
      },
    })
  }
})

// API routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/scans', authMiddleware, scanRoutes)
app.use('/api/v1/threat-intel', authMiddleware, threatIntelRoutes)
app.use('/api/v1/watchlist', authMiddleware, watchlistRoutes)
app.use('/api/v1/reports', authMiddleware, reportRoutes)
app.use('/api/v1/admin', authMiddleware, adminRoutes)
app.use('/api/v1/assistant', authMiddleware, assistantRoutes)
// Admin test routes - only available in development
if (process.env.NODE_ENV === 'development') {
  app.use('/api/v1/admin-test', adminTestRoutes)
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId: req.id,
      retryable: false,
    },
  })
})

// Error handler
app.use(errorHandler)

// Start server
async function start() {
  try {
    await connectDB()
    logger.info('Connected to MongoDB')
    
    app.listen(PORT, '127.0.0.1', () => {
      logger.info(`API server running on http://127.0.0.1:${PORT}/api/v1`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()

export default app