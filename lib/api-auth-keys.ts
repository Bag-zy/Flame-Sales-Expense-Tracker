import { NextRequest } from 'next/server'
import { db } from '@/lib/database'
import { ApiKeyScope, hashApiKey } from '@/lib/api-keys'
import { SessionUser, getSessionUser } from '@/lib/api-auth'

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export interface AuthUser extends SessionUser {
  authType: 'api_key' | 'session'
  apiKeyId?: string
  apiKeyScope?: ApiKeyScope
}

export async function getApiOrSessionUser(request: NextRequest): Promise<AuthUser | null> {
  // API-key-only: look for a key in Authorization or x-api-key header
  const header = request.headers.get('authorization') ?? request.headers.get('x-api-key')
  if (!header) {
    const sessionUser = await getSessionUser(request)
    if (!sessionUser) {
      return null
    }

    return {
      ...sessionUser,
      authType: 'session',
    }
  }

  const lower = header.toLowerCase()
  const token = lower.startsWith('bearer ')
    ? header.slice(7).trim()
    : header.trim()

  // Expect flame_ak_<prefix>_<secret>
  const parts = token.split('_')
  if (parts.length < 4 || parts[0] !== 'flame' || parts[1] !== 'ak') {
    return null
  }

  const prefix = parts[2]
  const secret = parts.slice(3).join('_')

  if (!prefix || !secret) {
    return null
  }

  const { rows } = await db.query(
    `SELECT id, user_id, organization_id, scope, key_hash
       FROM api_keys
      WHERE key_prefix = $1
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1`,
    [prefix]
  )

  if (!rows.length) {
    return null
  }

  const apiKey = rows[0] as {
    id: string
    user_id: number
    organization_id: number | null
    scope: ApiKeyScope
    key_hash: string
  }

  const expectedHash = hashApiKey(prefix, secret)
  if (apiKey.key_hash !== expectedHash) {
    return null
  }

  const method = request.method.toUpperCase()
  const isReadMethod = READ_METHODS.has(method)
  if (apiKey.scope === 'read' && !isReadMethod) {
    return null
  }

  const userResult = await db.query(
    'SELECT id, user_role, organization_id, email FROM users WHERE id = $1',
    [apiKey.user_id]
  )

  if (!userResult.rows.length) {
    return null
  }

  const dbUser = userResult.rows[0] as {
    id: number
    user_role: string | null
    organization_id: number | null
    email: string | null
  }

  // Best-effort last_used_at update; do not await
  void db.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [apiKey.id])

  const baseUser: SessionUser = {
    id: dbUser.id,
    role: dbUser.user_role ?? null,
    organizationId: dbUser.organization_id ?? null,
    email: dbUser.email ?? null,
  }

  return {
    ...baseUser,
    authType: 'api_key',
    apiKeyId: String(apiKey.id),
    apiKeyScope: apiKey.scope,
  }
}
