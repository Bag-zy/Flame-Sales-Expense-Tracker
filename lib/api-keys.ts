import { createHash, randomBytes } from 'crypto'

export type ApiKeyScope = 'read' | 'read_write'

export interface GeneratedApiKey {
  fullKey: string
  prefix: string
  hash: string
  scope: ApiKeyScope
}

export function hashApiKey(prefix: string, secret: string): string {
  return createHash('sha256').update(`${prefix}.${secret}`).digest('hex')
}

export function generateApiKey(scope: ApiKeyScope): GeneratedApiKey {
  const raw = randomBytes(32).toString('hex')
  const prefix = raw.slice(0, 8)
  const secret = raw.slice(8)
  const fullKey = `flame_ak_${prefix}_${secret}`
  const hash = hashApiKey(prefix, secret)

  return {
    fullKey,
    prefix,
    hash,
    scope,
  }
}
