import { Router, Response, Request } from 'express'
import { z } from 'zod'
import { 
  getUsersCollection,
} from '../config/database.js'
import { ApiError } from '../middleware/errorHandler.js'
import { 
  generateAccessToken, 
  generateRefreshToken, 
  storeRefreshToken,
  createAdminUser,
} from '../utils/authUtils.js'

const router = Router()

// Admin test login - Development only bypass
// This endpoint should ONLY be available in development mode
router.post('/test-login', async (req: Request, res: Response, next: Function) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      throw ApiError.forbidden('Admin test login only available in development mode')
    }

    const schema = z.object({
      email: z.string().email().optional(),
      password: z.string().optional(),
    })

    const data = schema.parse(req.body)

    // Use environment variables for admin credentials
    const adminEmail = process.env.ADMIN_TEST_EMAIL || 'admin@cryptoshield.local'
    const adminPassword = process.env.ADMIN_TEST_PASSWORD || 'AdminTestPass123!'
    const adminDisplayName = process.env.ADMIN_TEST_DISPLAY_NAME || 'Admin Tester'

    const email = data.email || adminEmail
    const password = data.password || adminPassword

    // Verify credentials
    if (email !== adminEmail || password !== adminPassword) {
      throw ApiError.unauthorized('Invalid admin credentials')
    }

    // Find or create admin user
    let user = await getUsersCollection().findOne({ email: adminEmail })

    if (!user) {
      // Create admin user if doesn't exist
      const adminUser = await createAdminUser(adminEmail, adminPassword, adminDisplayName)
      user = adminUser
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

export default router