import { Router, Response } from 'express'
import { z } from 'zod'
import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { 
  getUsersCollection, 
  getSessionsCollection 
} from '../config/database.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'
import { logger } from '../utils/logger.js'
import { emailService } from '../services/emailService.js'
import { 
  generateAccessToken, 
  generateRefreshToken, 
  hashToken, 
  storeRefreshToken,
  hashPassword,
  verifyPassword,
  createAdminUser,
  hashToken as hashTokenUtil,
} from '../utils/authUtils.js'

const router = Router()

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'local_dev_only_change_me_32_chars_minimum'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'local_dev_only_change_me_32_chars_minimum'
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '30d'

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  displayName: z.string().min(1).max(80),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(12),
})

// POST /auth/register
router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body)
    
    // Check if email exists
    const existing = await getUsersCollection().findOne({ email: data.email.toLowerCase() })
    if (existing) {
      throw ApiError.conflict('An account with this email already exists')
    }
    
    // Hash password
    const passwordHash = await hashPassword(data.password)
    
    // Generate email verification token
    const verificationToken = uuidv4()
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    
    // Create user
    const now = new Date()
    const nowStr = now.toISOString()
    const userDoc = {
      _id: uuidv4(),
      email: data.email.toLowerCase(),
      displayName: data.displayName,
      passwordHash,
      role: 'user' as const,
      status: 'pending' as const,
      emailVerified: false,
      mfaEnabled: false,
      verificationToken,
      verificationExpiresAt,
      createdAt: nowStr,
      lastLoginAt: null as string | null,
    }
    
    await getUsersCollection().insertOne(userDoc)
    
    // Send verification email
    try {
      await emailService.sendVerificationEmail(userDoc.email, userDoc.displayName, verificationToken)
      logger.info(`Verification email sent to: ${userDoc.email}`)
    } catch (emailError) {
      logger.warn('Failed to send verification email:', emailError)
    }
    
    logger.info(`User registered: ${userDoc.email}`)
    
    res.status(201).json({
      user: {
        id: userDoc._id,
        email: userDoc.email,
        displayName: userDoc.displayName,
        role: userDoc.role,
        emailVerified: userDoc.emailVerified,
        createdAt: userDoc.createdAt,
      },
    })
  } catch (error) {
    next(error)
  }
})

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body)
    
    const user = await getUsersCollection().findOne({ email: data.email.toLowerCase() })
    
    if (!user) {
      // Use generic message to prevent email enumeration
      throw ApiError.unauthorized('Invalid email or password')
    }
    
    if (user.status !== 'active') {
      throw ApiError.unauthorized('Account is not active')
    }
    
    if (!user.emailVerified) {
      throw ApiError.unauthorized('Please verify your email address before logging in. Check your inbox for a verification link.')
    }
    
    // Verify password
    const valid = await verifyPassword(user.passwordHash, data.password)
    if (!valid) {
      throw ApiError.unauthorized('Invalid email or password')
    }
    
    // Check MFA
    if (user.mfaEnabled) {
      // In a real implementation, this would trigger MFA challenge
      // For now, we'll return a flag
      return res.json({
        mfaRequired: true,
        challengeId: uuidv4(),
      })
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.email, user.displayName, user.role, user.emailVerified)
    const refreshToken = generateRefreshToken(user._id)
    
    // Store refresh token
    await storeRefreshToken(user._id, refreshToken)
    
    // Update last login
    await getUsersCollection().updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date().toISOString() } }
    )
    
    logger.info(`User logged in: ${user.email}`)
    
    res.json({
      accessToken,
      expiresIn: 900, // 15 minutes
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    })
  } catch (error) {
    next(error)
  }
})

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const data = refreshSchema.parse(req.body)
    
    // Verify refresh token
    let decoded: { userId: string; type: string }
    try {
      decoded = jwt.verify(data.refreshToken, REFRESH_SECRET) as { userId: string; type: string }
    } catch {
      throw ApiError.unauthorized('Invalid refresh token')
    }
    
    const tokenHash = hashToken(data.refreshToken)
    
    // Atomically find and revoke the session in one operation to prevent race conditions
    // Only revoke if the token is currently valid (not revoked and not expired)
    const session = await getSessionsCollection().findOneAndUpdate(
      { 
        userId: decoded.userId,
        tokenHash,
        $or: [
          { revokedAt: { $exists: false } },
          { revokedAt: null }
        ],
        expiresAt: { $gt: new Date().toISOString() }
      },
      { $set: { revokedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    )
    
    if (!session) {
      throw ApiError.unauthorized('Invalid or expired refresh token')
    }
    
    // Get user
    const user = await getUsersCollection().findOne({ _id: decoded.userId })
    
    if (!user || user.status !== 'active') {
      throw ApiError.unauthorized('User not found or inactive')
    }
    
    // Generate new tokens
    const accessToken = generateAccessToken(user._id, user.email, user.displayName, user.role, user.emailVerified)
    const newRefreshToken = generateRefreshToken(user._id)
    
    // Store new refresh token - if this fails, restore the old session to avoid losing valid session
    try {
      await storeRefreshToken(user._id, newRefreshToken)
    } catch (storeError) {
      // Attempt to restore the old session (best effort)
      await getSessionsCollection().updateOne(
        { _id: session._id },
        { $set: { revokedAt: null } }
      ).catch(() => { /* ignore restoration failure */ })
      throw storeError
    }
    
    res.json({
      accessToken,
      expiresIn: 900,
      refreshToken: newRefreshToken,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    })
  } catch (error) {
    next(error)
  }
})

// POST /auth/logout
router.post('/logout', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.slice(7)
      // In a real implementation, we'd add to a blocklist
      // For now, just revoke the refresh token if provided
      const { refreshToken } = req.body
      if (refreshToken) {
        await getSessionsCollection().updateOne(
          { tokenHash: hashToken(refreshToken) },
          { $set: { revokedAt: new Date().toISOString() } }
        )
      }
    }
    
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

// GET /auth/me
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await getUsersCollection().findOne(
      { _id: req.user!.id },
      { projection: { passwordHash: 0 } }
    )
    
    if (!user) {
      throw ApiError.notFound('User not found')
    }
    
    res.json({
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    })
  } catch (error) {
    next(error)
  }
})

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const data = forgotPasswordSchema.parse(req.body)
    
    const user = await getUsersCollection().findOne({ email: data.email.toLowerCase() })
    
    // Always return success to prevent email enumeration
    res.json({ message: 'If the email exists, a reset link has been sent' })
    
    if (!user) return
    
    // In a real implementation, generate reset token and send email
    logger.info(`Password reset requested for: ${user.email}`)
  } catch (error) {
    next(error)
  }
})

// POST /auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const data = resetPasswordSchema.parse(req.body)
    
    const { token } = req.body
    
    if (!token || typeof token !== 'string') {
      throw ApiError.validation('Invalid reset token', [{
        field: 'token',
        issue: 'required',
        message: 'Reset token is required',
      }])
    }
    
    const user = await getUsersCollection().findOne({ resetToken: token })
    
    if (!user) {
      throw ApiError.unauthorized('Invalid or expired reset token')
    }
    
    if (user.resetExpiresAt && new Date(user.resetExpiresAt) < new Date()) {
      throw ApiError.unauthorized('Reset token has expired')
    }
    
    // Hash new password
    const passwordHash = await hashPassword(data.password)
    
    // Update password and clear reset token
    await getUsersCollection().updateOne(
      { _id: user._id },
      { 
        $set: { passwordHash },
        $unset: { resetToken: '', resetExpiresAt: '' }
      }
    )
    
    // Revoke all existing sessions
    await getSessionsCollection().updateMany(
      { userId: user._id, $or: [{ revokedAt: { $exists: false } }, { revokedAt: null }] },
      { $set: { revokedAt: new Date().toISOString() } }
    )
    
    logger.info(`Password reset for user: ${user.email}`)
    
    res.json({ message: 'Password has been reset successfully' })
  } catch (error) {
    next(error)
  }
})

// GET /auth/verify-email
router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query
    
    if (!token || typeof token !== 'string') {
      throw ApiError.validation('Invalid verification token', [{
        field: 'token',
        issue: 'required',
        message: 'Verification token is required',
      }])
    }
    
    const user = await getUsersCollection().findOne({ verificationToken: token })
    
    if (!user) {
      throw ApiError.unauthorized('Invalid or expired verification token')
    }
    
    if (user.verificationExpiresAt && new Date(user.verificationExpiresAt) < new Date()) {
      throw ApiError.unauthorized('Verification token has expired')
    }
    
    // Update user
    await getUsersCollection().updateOne(
      { _id: user._id },
      { 
        $set: { 
          emailVerified: true, 
          status: 'active',
          verificationToken: '',
          verificationExpiresAt: '',
        }
      }
    )
    
    logger.info(`Email verified for user: ${user.email}`)
    
    res.json({ message: 'Email verified successfully' })
  } catch (error) {
    next(error)
  }
})

// POST /auth/resend-verification
router.post('/resend-verification', async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
    })
    
    const data = schema.parse(req.body)
    
    const user = await getUsersCollection().findOne({ email: data.email.toLowerCase() })
    
    // Always return success to prevent email enumeration
    res.json({ message: 'If the email exists and is not verified, a verification email has been sent' })
    
    if (!user) return
    
    if (user.emailVerified) return
    
    // Generate new verification token
    const verificationToken = uuidv4()
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    
    await getUsersCollection().updateOne(
      { _id: user._id },
      { $set: { verificationToken, verificationExpiresAt } }
    )
    
    // Send verification email
    try {
      await emailService.sendVerificationEmail(user.email, user.displayName, verificationToken)
      logger.info(`Verification email resent to: ${user.email}`)
    } catch (emailError) {
      logger.warn('Failed to send verification email:', emailError)
    }
  } catch (error) {
    next(error)
  }
})

export default router