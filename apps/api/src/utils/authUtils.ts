import { v4 as uuidv4 } from 'uuid'
import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { createHash } from 'crypto'
import { getUsersCollection, getSessionsCollection } from '../config/database.js'
import type { UserDocument } from '../types/mongodb.js'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'local_dev_only_change_me_32_chars_minimum'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'local_dev_only_change_me_32_chars_minimum'
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '30d'

export function generateAccessToken(userId: string, email: string, displayName: string, role: string, emailVerified: boolean): string {
  return jwt.sign(
    { userId, email, displayName, role, emailVerified },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  )
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh', jti: uuidv4() },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  )
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function storeRefreshToken(userId: string, token: string) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  
  await getSessionsCollection().insertOne({
    _id: uuidv4(),
    userId,
    tokenHash: hashToken(token),
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
    revokedAt: null as string | null,
  })
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  })
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password)
}

export async function createAdminUser(email: string, password: string, displayName: string) {
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  })

  const now = new Date().toISOString()
  const adminUser = {
    _id: `user_${uuidv4()}`,
    email,
    displayName,
    passwordHash,
    role: 'admin' as const,
    status: 'active' as const,
    emailVerified: true,
    mfaEnabled: false,
    createdAt: now,
    lastLoginAt: null as string | null,
  }
  
  await getUsersCollection().insertOne(adminUser)
  return adminUser
}