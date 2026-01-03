import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user?.id) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limitRaw = searchParams.get('limit')
    const limit = limitRaw ? Math.max(1, Math.min(200, parseInt(limitRaw, 10) || 50)) : 50

    const result = await db.query(
      `
      SELECT id,
             user_id,
             organization_id,
             title,
             context,
             created_at,
             updated_at,
             last_message_at
        FROM assistant_chat_sessions
       WHERE user_id = $1
       ORDER BY COALESCE(last_message_at, updated_at, created_at) DESC
       LIMIT $2
      `,
      [user.id, limit],
    )

    return NextResponse.json({ status: 'success', sessions: result.rows })
  } catch (error) {
    console.error('Assistant chat sessions GET error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch assistant chat sessions' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user?.id) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      title?: string
      context?: unknown
    }

    const title = typeof body.title === 'string' ? body.title.trim() : null
    const context = body.context ?? null

    const result = await db.query(
      `
      INSERT INTO assistant_chat_sessions (user_id, organization_id, title, context)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [user.id, user.organizationId ?? null, title || null, context],
    )

    return NextResponse.json({ status: 'success', session: result.rows[0] })
  } catch (error) {
    console.error('Assistant chat sessions POST error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to create assistant chat session' },
      { status: 500 },
    )
  }
}
