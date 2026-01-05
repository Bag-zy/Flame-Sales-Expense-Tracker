import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'
import { generateApiKey } from '@/lib/api-keys'

export const runtime = 'nodejs'

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'))
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function getCrypto(): Crypto {
  const c = (globalThis as any).crypto as Crypto | undefined
  if (!c?.subtle) throw new Error('WebCrypto is not available in this runtime')
  return c
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer
}

async function sha256Bytes(input: Uint8Array): Promise<Uint8Array> {
  const digest = await getCrypto().subtle.digest('SHA-256', toArrayBuffer(input))
  return new Uint8Array(digest)
}

async function deriveAesGcmKey(secret: string): Promise<CryptoKey> {
  const secretBytes = new TextEncoder().encode(secret)
  const keyBytes = await sha256Bytes(secretBytes)
  return getCrypto().subtle.importKey('raw', toArrayBuffer(keyBytes), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

async function encryptWithAesGcm(plaintext: string, secret: string): Promise<string> {
  const key = await deriveAesGcmKey(secret)
  const iv = getCrypto().getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(plaintext)
  const encrypted = await getCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(data),
  )

  const payload = {
    v: 1,
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  }

  const payloadJson = JSON.stringify(payload)
  return bytesToBase64(new TextEncoder().encode(payloadJson))
}

async function decryptWithAesGcm(encrypted: string, secret: string): Promise<string> {
  const key = await deriveAesGcmKey(secret)
  const payloadJson = new TextDecoder().decode(base64ToBytes(encrypted))
  const payload = JSON.parse(payloadJson) as { iv: string; data: string }
  const iv = base64ToBytes(payload.iv)
  const data = base64ToBytes(payload.data)

  const decrypted = await getCrypto().subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(data),
  )
  return new TextDecoder().decode(new Uint8Array(decrypted))
}

async function getOrCreateAssistantMcpApiKey(opts: {
  userId: number
  organizationId: number | null
}): Promise<string> {
  const encryptionSecret = process.env.ASSISTANT_MCP_KEY_ENCRYPTION_SECRET
  if (!encryptionSecret) {
    throw new Error('ASSISTANT_MCP_KEY_ENCRYPTION_SECRET environment variable is not set')
  }

  const existing = await db.query(
    `
    SELECT encrypted_key
      FROM assistant_mcp_keys
     WHERE user_id = $1
       AND revoked_at IS NULL
     LIMIT 1
    `,
    [opts.userId],
  )

  const encryptedExisting = existing.rows[0]?.encrypted_key
  if (typeof encryptedExisting === 'string' && encryptedExisting.trim()) {
    return await decryptWithAesGcm(encryptedExisting, encryptionSecret)
  }

  const { fullKey, prefix, hash } = generateApiKey('read_write')

  const created = await db.query(
    `
    INSERT INTO api_keys (user_id, organization_id, name, key_prefix, key_hash, scope, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, NULL)
    RETURNING id
    `,
    [opts.userId, opts.organizationId, 'Assistant MCP', prefix, hash, 'read_write'],
  )

  const apiKeyId = created.rows[0]?.id
  const encrypted = await encryptWithAesGcm(fullKey, encryptionSecret)

  await db.query(
    `
    INSERT INTO assistant_mcp_keys (user_id, api_key_id, encrypted_key, created_at, updated_at, revoked_at)
    VALUES ($1, $2, $3, NOW(), NOW(), NULL)
    ON CONFLICT (user_id)
    DO UPDATE SET api_key_id = EXCLUDED.api_key_id,
                  encrypted_key = EXCLUDED.encrypted_key,
                  updated_at = NOW(),
                  revoked_at = NULL
    `,
    [opts.userId, apiKeyId ?? null, encrypted],
  )

  return fullKey
}

type JsonRpcSuccess = { jsonrpc: '2.0'; id: string | number; result: any }
type JsonRpcError = { jsonrpc: '2.0'; id?: string | number | null; error: any }

async function callMcpTool(opts: {
  baseUrl: string
  toolName: string
  toolArgs: Record<string, unknown>
  authHeader?: string | null
}): Promise<{ result: any; sessionId?: string | null }> {
  const mcpUrl = new URL('/mcp', opts.baseUrl)

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }

  if (opts.authHeader) {
    headers.authorization = opts.authHeader
  }

  const initRes = await fetch(mcpUrl.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        clientInfo: { name: 'flame-app-copilotkit', version: '1.0.0' },
        capabilities: {},
      },
    }),
  })

  const initJson = (await initRes.json().catch(() => null)) as JsonRpcSuccess | JsonRpcError | null
  if (!initRes.ok || !initJson || 'error' in initJson) {
    const msg = (initJson as any)?.error?.message || 'Failed to initialize MCP session'
    throw new Error(msg)
  }

  const sessionId = initRes.headers.get('mcp-session-id')

  const callHeaders: Record<string, string> = { ...headers }
  if (sessionId) callHeaders['mcp-session-id'] = sessionId

  const toolRes = await fetch(mcpUrl.toString(), {
    method: 'POST',
    headers: callHeaders,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: opts.toolName,
        arguments: opts.toolArgs,
      },
    }),
  })

  const toolJson = (await toolRes.json().catch(() => null)) as JsonRpcSuccess | JsonRpcError | null
  if (!toolRes.ok || !toolJson || 'error' in toolJson) {
    const msg = (toolJson as any)?.error?.message || 'MCP tool call failed'
    throw new Error(msg)
  }

  return { result: (toolJson as JsonRpcSuccess).result, sessionId }
}

function extractUiResourceFromToolResult(toolResult: any): any | null {
  const content = toolResult?.content
  if (!Array.isArray(content)) return null

  for (const item of content) {
    if (!item || typeof item !== 'object') continue
    if ((item as any).resource) return (item as any).resource
    if ((item as any).type === 'resource' && (item as any).uri) return item
    if ((item as any).type === 'ui' && (item as any).resource) return (item as any).resource
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user?.id) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      toolName?: unknown
      toolArgs?: unknown
    }

    const toolName = typeof body.toolName === 'string' ? body.toolName : ''
    if (!toolName.trim()) {
      return NextResponse.json({ status: 'error', message: 'toolName is required' }, { status: 400 })
    }

    const toolArgs =
      body.toolArgs && typeof body.toolArgs === 'object' && !Array.isArray(body.toolArgs)
        ? (body.toolArgs as Record<string, unknown>)
        : {}

    const mcpWorkerBaseUrl = process.env.MCP_WORKER_BASE_URL
    if (!mcpWorkerBaseUrl) {
      return NextResponse.json(
        { status: 'error', message: 'MCP_WORKER_BASE_URL environment variable is not set' },
        { status: 500 },
      )
    }

    const fullKey = await getOrCreateAssistantMcpApiKey({
      userId: user.id,
      organizationId: user.organizationId ?? null,
    })

    const { result } = await callMcpTool({
      baseUrl: mcpWorkerBaseUrl,
      toolName,
      toolArgs,
      authHeader: `Bearer ${fullKey}`,
    })

    const uiResource = extractUiResourceFromToolResult(result)

    return NextResponse.json({
      status: 'success',
      toolResult: result,
      uiResource,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred'
    return NextResponse.json({ status: 'error', message }, { status: 500 })
  }
}
