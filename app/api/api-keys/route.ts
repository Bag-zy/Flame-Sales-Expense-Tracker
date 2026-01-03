import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'
import { generateApiKey, ApiKeyScope } from '@/lib/api-keys'

export async function GET(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }

    const { rows } = await db.query(
      `SELECT id, name, scope, key_prefix, created_at, last_used_at, revoked_at, expires_at
         FROM api_keys
        WHERE user_id = $1
         ORDER BY created_at DESC`,
      [user.id]
    )

    return NextResponse.json({ status: 'success', apiKeys: rows })
  } catch (error) {
    console.error('List API keys error:', error)
    return NextResponse.json({ status: 'error', message: 'Failed to list API keys' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }

    const { name, scope, expiresAt } = (await request.json()) as {
      name: string
      scope: ApiKeyScope
      expiresAt?: string
    }

    if (!name || !scope || !['read', 'read_write'].includes(scope)) {
      return NextResponse.json({ status: 'error', message: 'Invalid input' }, { status: 400 })
    }

    const { fullKey, prefix, hash } = generateApiKey(scope)

    const { rows } = await db.query(
      `INSERT INTO api_keys (user_id, organization_id, name, key_prefix, key_hash, scope, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, scope, created_at, expires_at`,
      [
        user.id,
        user.organizationId,
        name,
        prefix,
        hash,
        scope,
        expiresAt || null,
      ]
    )

    return NextResponse.json({ status: 'success', fullKey, metadata: rows[0] })
  } catch (error) {
    console.error('Create API key error:', error)
    return NextResponse.json({ status: 'error', message: 'Failed to create API key' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ status: 'error', message: 'ID is required' }, { status: 400 })
    }

    const { rows } = await db.query(
      'UPDATE api_keys SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user.id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ status: 'error', message: 'API key not found or not owned by user' }, { status: 404 })
    }

    return NextResponse.json({ status: 'success', message: 'API key revoked' })
  } catch (error) {
    console.error('Revoke API key error:', error)
    return NextResponse.json({ status: 'error', message: 'Failed to revoke API key' }, { status: 500 })
  }
}

