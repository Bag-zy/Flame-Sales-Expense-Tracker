import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'

export const dynamic = 'force-dynamic'

type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export async function GET(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user?.id) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionIdRaw = searchParams.get('session_id')

    if (!sessionIdRaw) {
      return NextResponse.json(
        { status: 'error', message: 'session_id is required' },
        { status: 400 },
      )
    }

    const sessionId = parseInt(sessionIdRaw, 10)
    if (!Number.isFinite(sessionId)) {
      return NextResponse.json({ status: 'error', message: 'Invalid session_id' }, { status: 400 })
    }

    const limitRaw = searchParams.get('limit')
    const limit = limitRaw ? Math.max(1, Math.min(500, parseInt(limitRaw, 10) || 200)) : 200

    const session = await db.query(
      'SELECT id FROM assistant_chat_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, user.id],
    )

    if (!session.rows.length) {
      return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 })
    }

    const result = await db.query(
      `
      SELECT id,
             session_id,
             role,
             content,
             created_at,
             metadata
        FROM assistant_chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC, id ASC
       LIMIT $2
      `,
      [sessionId, limit],
    )

    return NextResponse.json({ status: 'success', messages: result.rows })
  } catch (error) {
    console.error('Assistant chat messages GET error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch assistant chat messages' },
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
      session_id?: number | string
      role?: MessageRole
      content?: string
      metadata?: unknown
    }

    const sessionIdNum =
      typeof body.session_id === 'number'
        ? body.session_id
        : typeof body.session_id === 'string'
          ? parseInt(body.session_id, 10)
          : NaN

    if (!Number.isFinite(sessionIdNum)) {
      return NextResponse.json(
        { status: 'error', message: 'session_id is required' },
        { status: 400 },
      )
    }

    const role = body.role
    if (!role || !['user', 'assistant', 'system', 'tool'].includes(role)) {
      return NextResponse.json({ status: 'error', message: 'Invalid role' }, { status: 400 })
    }

    const content = typeof body.content === 'string' ? body.content : ''
    if (!content.trim()) {
      return NextResponse.json({ status: 'error', message: 'content is required' }, { status: 400 })
    }

    const session = await db.query(
      'SELECT id FROM assistant_chat_sessions WHERE id = $1 AND user_id = $2',
      [sessionIdNum, user.id],
    )

    if (!session.rows.length) {
      return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 })
    }

    const result = await db.query(
      `
      INSERT INTO assistant_chat_messages (session_id, role, content, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [sessionIdNum, role, content, body.metadata ?? null],
    )

    void db.query(
      `
      UPDATE assistant_chat_sessions
         SET last_message_at = NOW(),
             updated_at = NOW()
       WHERE id = $1
      `,
      [sessionIdNum],
    )

    return NextResponse.json({ status: 'success', message: result.rows[0] })
  } catch (error) {
    console.error('Assistant chat messages POST error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to create assistant chat message' },
      { status: 500 },
    )
  }
}
