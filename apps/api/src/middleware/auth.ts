import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { getUsersCollection } from '../config/database.js'
import { logger } from '../utils/logger.js'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'local_dev_only_change_me_32_chars_minimum'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    displayName: string
    role: 'user' | 'analyst' | 'admin'
    emailVerified: boolean
    mfaEnabled: boolean
  }
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Missing or invalid authorization header',
        requestId: req.id,
        retryable: false,
      },
    })
  }
  
  const token = authHeader.slice(7)
  
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as { userId: string }
    
    // Verify user still exists and is active
    const usersCollection = getUsersCollection()
    const user = await usersCollection.findOne({ _id: decoded.userId })
    
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'User not found or inactive',
          requestId: req.id,
          retryable: false,
        },
      })
    }
    
    req.user = {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
    }
    
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Access token expired',
          requestId: req.id,
          retryable: false,
        },
      })
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Invalid access token',
          requestId: req.id,
          retryable: false,
        },
      })
    }
    
    logger.error('Auth middleware error:', error)
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication error',
        requestId: req.id,
        retryable: false,
      },
    })
  }
}

export function requireRole(...roles: ('user' | 'analyst' | 'admin')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
          requestId: req.id,
          retryable: false,
        },
      })
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          requestId: req.id,
          retryable: false,
        },
      })
    }
    
    next()
  }
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()
  }
  
  const token = authHeader.slice(7)
  
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as { 
      userId: string
      email: string
      displayName: string
      role: 'user' | 'analyst' | 'admin'
      emailVerified: boolean
      mfaEnabled: boolean
    }
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      displayName: decoded.displayName,
      role: decoded.role,
      emailVerified: decoded.emailVerified,
      mfaEnabled: decoded.mfaEnabled,
    }
  } catch {
    // Ignore invalid tokens for optional auth
  }
  
  next()
}