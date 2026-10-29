import { Request, Response, NextFunction } from 'express'
import { getRateLimitsCollection } from '../config/database.js'
import { logger } from '../utils/logger.js'

interface RateLimitRecord {
  _id: string
  key: string
  count: number
  windowStart: string
  expiresAt: string
}

type RouteKey = keyof typeof WINDOWS

const WINDOWS = {
  'auth:login': { limit: 10, windowMs: 60000 },
  'auth:register': { limit: 5, windowMs: 3600000 },
  'scans:create': { limit: 30, windowMs: 60000 },
  'assistant:query': { limit: 10, windowMs: 60000 },
  'threat-intel:read': { limit: 60, windowMs: 60000 },
  'reports:create': { limit: 5, windowMs: 60000 },
  'admin:default': { limit: 120, windowMs: 60000 },
} as const

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting for health checks
  if (req.path === '/health' || req.path === '/ready') {
    return next()
  }
  
  const userId = (req as any).user?.id || req.ip || 'anonymous'
  const routeKey = getRouteKey(req)
  const key = `${userId}:${routeKey}`
  
  const config = WINDOWS[routeKey as RouteKey] || WINDOWS['admin:default']
  
  checkAndIncrementRateLimit(key, config)
    .then(({ allowed, remaining, resetTime }) => {
      res.setHeader('X-RateLimit-Limit', config.limit)
      res.setHeader('X-RateLimit-Remaining', remaining)
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000))
      
      if (!allowed) {
        res.setHeader('Retry-After', Math.ceil((resetTime - Date.now()) / 1000))
        return res.status(429).json({
          error: {
            code: 'RATE_LIMITED',
            message: `Too many requests. Retry after ${Math.ceil((resetTime - Date.now()) / 1000)} seconds.`,
            requestId: req.id,
            retryable: true,
          },
        })
      }
      
      next()
    })
    .catch((error) => {
      logger.error('Rate limiter error:', error)
      next() // Fail open
    })
}

function getRouteKey(req: Request): keyof typeof WINDOWS {
  const path = req.path
  const method = req.method
  
  // Handle both full path (/api/v1/auth/login) and mounted path (/login)
  if (path.includes('/auth/login') || path === '/login') return 'auth:login'
  if (path.includes('/auth/register') || path === '/register') return 'auth:register'
  if ((path.includes('/scans') || path.startsWith('/scans')) && method === 'POST') return 'scans:create'
  if (path.includes('/assistant') || path.startsWith('/assistant')) return 'assistant:query'
  if ((path.includes('/threat-intel') || path.startsWith('/threat-intel')) && method === 'GET') return 'threat-intel:read'
  if ((path.includes('/reports') || path.startsWith('/reports')) && method === 'POST') return 'reports:create'
  if (path.includes('/admin') || path.startsWith('/admin')) return 'admin:default'
  
  return 'admin:default'
}

async function checkAndIncrementRateLimit(key: string, config: { limit: number; windowMs: number }) {
  const collection = getRateLimitsCollection()
  const now = new Date()
  const nowStr = now.toISOString()
  const expiresAtStr = new Date(now.getTime() + config.windowMs).toISOString()
  
  const result = await getRateLimitsCollection().findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { key, windowStart: nowStr, expiresAt: expiresAtStr },
    },
    { upsert: true, returnDocument: 'after' }
  )
  
  const record = result
  const count = record?.count || 1
  const allowed = count <= config.limit
  const remaining = Math.max(0, config.limit - count)
  const resetTime = (record?.windowStart ? new Date(record.windowStart).getTime() : now.getTime()) + config.windowMs
  
  return { allowed, remaining, resetTime }
}