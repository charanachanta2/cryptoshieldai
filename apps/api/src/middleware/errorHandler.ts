import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { logger } from '../utils/logger.js'

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

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error('Request error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: req.id,
  })
  
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request contains invalid fields.',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          issue: e.code,
          message: e.message,
        })),
        requestId: req.id,
        retryable: false,
      },
    })
  }
  
  // MongoDB duplicate key errors
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'A record with this value already exists.',
        requestId: req.id,
        retryable: false,
      },
    })
  }
  
  // Custom API errors
  if ('code' in err && 'retryable' in err) {
    const apiError = err as ApiError & { statusCode?: number }
    return res.status(apiError.statusCode || 500).json({
      error: {
        code: apiError.code,
        message: apiError.message,
        details: apiError.details,
        requestId: req.id,
        retryable: apiError.retryable,
      },
    })
  }
  
  // Default error
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId: req.id,
      retryable: false,
    },
  })
}

export class ApiError extends Error {
  code: string
  statusCode: number
  retryable: boolean
  details?: Array<{ field: string; issue: string; message: string }>
  
  constructor(code: string, message: string, statusCode: number, retryable: boolean, details?: ApiError['details']) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
    this.retryable = retryable
    this.details = details
  }
  
  static validation(message: string, details: ApiError['details']) {
    return new ApiError('VALIDATION_ERROR', message, 400, false, details)
  }
  
  static unauthorized(message = 'Unauthorized') {
    return new ApiError('UNAUTHENTICATED', message, 401, false)
  }
  
  static forbidden(message = 'Forbidden') {
    return new ApiError('FORBIDDEN', message, 403, false)
  }
  
  static notFound(message = 'Not found') {
    return new ApiError('NOT_FOUND', message, 404, false)
  }
  
  static conflict(message = 'Conflict') {
    return new ApiError('CONFLICT', message, 409, false)
  }
  
  static rateLimited(message = 'Rate limited', retryAfter = 30) {
    const error = new ApiError('RATE_LIMITED', message, 429, true)
    ;(error as any).retryAfter = retryAfter
    return error
  }
  
  static dependencyUnavailable(message = 'Service unavailable') {
    return new ApiError('DEPENDENCY_UNAVAILABLE', message, 503, true)
  }
  
  static modelNotReady(message = 'Model not ready') {
    return new ApiError('MODEL_NOT_READY', message, 503, true)
  }
  
  static internal(message = 'Internal server error') {
    return new ApiError('INTERNAL_ERROR', message, 500, false)
  }
}