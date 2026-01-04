import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'

export const dynamic = 'force-dynamic'

function extractGroqText(data: any): string | null {
  const choice = data?.choices?.[0]
  const text = choice?.message?.content
  return typeof text === 'string' && text.trim() ? text : null
}

function splitThinkBlocks(input: string): { visible: string; reasoning: string } {
  if (!input) return { visible: '', reasoning: '' }
  const re = /<think>([\s\S]*?)<\/think>/gi
  let reasoning = ''
  let match: RegExpExecArray | null

  while ((match = re.exec(input))) {
    const chunk = (match[1] || '').trim()
    if (chunk) reasoning += (reasoning ? '\n\n' : '') + chunk
  }

  const visible = input.replace(re, '').trimEnd()
  return { visible, reasoning }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user?.id) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { status: 'error', message: 'GROQ_API_KEY environment variable is not set' },
        { status: 500 },
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      session_id?: number | string
    }

    const sessionId =
      typeof body.session_id === 'number'
        ? body.session_id
        : typeof body.session_id === 'string'
          ? parseInt(body.session_id, 10)
          : NaN

    if (!Number.isFinite(sessionId)) {
      return NextResponse.json(
        { status: 'error', message: 'session_id is required' },
        { status: 400 },
      )
    }

    const session = await db.query(
      'SELECT id FROM assistant_chat_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, user.id],
    )

    if (!session.rows.length) {
      return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 })
    }

    const history = await db.query(
      `
      SELECT role, content
        FROM assistant_chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC, id ASC
       LIMIT 50
      `,
      [sessionId],
    )

    const model = process.env.GROQ_MODEL || 'qwen/qwen3-32b'

    const messages = history.rows
      .map((m: any) => {
        const roleRaw = typeof m.role === 'string' ? m.role : 'user'
        const content = typeof m.content === 'string' ? m.content : ''
        if (!content.trim()) return null

        const role =
          roleRaw === 'assistant'
            ? 'assistant'
            : roleRaw === 'system'
              ? 'system'
              : roleRaw === 'tool'
                ? 'tool'
                : 'user'

        return { role, content }
      })
      .filter(Boolean) as Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }>

    const systemPrefix =
      'For every reply: write your reasoning inside <think>...</think> first, then write the final answer for the user. The host will hide the <think> block by default, so keep it useful but not excessively long.'

    const res = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrefix }, ...messages],
          temperature: 0.6,
          top_p: 0.95,
          max_completion_tokens: 4096,
          stream: false,
        }),
      },
    )

    const raw = await res.text().catch(() => '')
    let data: any = null
    try {
      data = raw ? JSON.parse(raw) : null
    } catch {
      data = { raw }
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          status: 'error',
          message: `Groq request failed (${res.status}): ${data?.error?.message || data?.message || res.statusText || 'Request failed'}`,
          details: data,
        },
        { status: 502 },
      )
    }

    const assistantText = extractGroqText(data)
    if (!assistantText) {
      return NextResponse.json(
        { status: 'error', message: 'Groq returned no text' },
        { status: 502 },
      )
    }

    const { visible, reasoning } = splitThinkBlocks(assistantText)

    const inserted = await db.query(
      `
      INSERT INTO assistant_chat_messages (session_id, role, content, metadata)
      VALUES ($1, 'assistant', $2, $3)
      RETURNING *
      `,
      [sessionId, visible, reasoning.trim() ? { reasoning: reasoning.trim() } : null],
    )

    void db.query(
      `
      UPDATE assistant_chat_sessions
         SET last_message_at = NOW(),
             updated_at = NOW()
       WHERE id = $1
      `,
      [sessionId],
    )

    return NextResponse.json({ status: 'success', message: inserted.rows[0] })
  } catch (error) {
    console.error('Assistant chat generate POST error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to generate assistant reply' },
      { status: 500 },
    )
  }
}
