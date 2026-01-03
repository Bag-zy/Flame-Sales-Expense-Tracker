'use client'

import { useEffect, useState } from 'react'

interface ApiOperation {
  tag: string
  displayTag: string
  path: string
  method: string
  summary?: string
  operationId?: string
}

interface ApiTagGroup {
  name: string
  displayName: string
  operations: ApiOperation[]
}

export function ApiDocsSidebar() {
  const [groups, setGroups] = useState<ApiTagGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openTag, setOpenTag] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSpec() {
      try {
        setLoading(true)
        const res = await fetch('/api/openapi')
        if (!res.ok) {
          throw new Error(`Failed to load OpenAPI spec: ${res.status}`)
        }
        const spec = await res.json()
        if (cancelled) return

        const builtGroups = buildGroupsFromSpec(spec)
        setGroups(builtGroups)
        if (builtGroups.length > 0) {
          setOpenTag(builtGroups[0].name)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load API specification')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSpec()

    return () => {
      cancelled = true
    }
  }, [])

  const handleOperationClick = (op: ApiOperation) => {
    scrollToOperation(op)
  }

  return (
    <aside className="w-full rounded-lg border bg-card p-3 text-sm">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        API Resources
      </div>
      {loading && (
        <p className="text-xs text-muted-foreground">Loading API index...</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      {!loading && !error && groups.length === 0 && (
        <p className="text-xs text-muted-foreground">No operations found.</p>
      )}
      {!loading && !error && groups.length > 0 && (
        <div className="space-y-3">
          {groups.map((group) => {
            const isOpen = openTag === group.name
            return (
              <div key={group.name} className="border-b border-border pb-2 last:border-b-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => setOpenTag(isOpen ? null : group.name)}
                  className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <span>{group.displayName}</span>
                  <span className="ml-2 text-[11px] text-muted-foreground/80">
                    {group.operations.length} op{group.operations.length === 1 ? '' : 's'}
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-1 space-y-1 border-l border-border pl-3">
                    {group.operations.map((op) => (
                      <button
                        key={`${op.method}-${op.path}-${op.operationId ?? ''}`}
                        type="button"
                        onClick={() => handleOperationClick(op)}
                        className="w-full rounded-md px-1 py-1 text-left hover:bg-accent/60"
                      >
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span
                            className={`inline-flex min-w-[42px] justify-center rounded-full px-2 py-[1px] text-[10px] font-semibold uppercase text-white ${
                              op.method === 'get'
                                ? 'bg-emerald-900'
                                : op.method === 'post'
                                  ? 'bg-blue-900'
                                  : op.method === 'put'
                                    ? 'bg-amber-900'
                                    : op.method === 'delete'
                                      ? 'bg-red-900'
                                      : 'bg-purple-900'
                            }`}
                          >
                            {op.method}
                          </span>
                          <span className="truncate text-foreground">{op.path}</span>
                        </div>
                        {op.summary && (
                          <div className="mt-[2px] text-[11px] text-muted-foreground line-clamp-2">
                            {op.summary}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}

function buildGroupsFromSpec(spec: any): ApiTagGroup[] {
  if (!spec || !spec.paths) return []

  const paths: Record<string, any> = spec.paths || {}
  const tagsOrder: string[] = Array.isArray(spec.tags)
    ? spec.tags.map((t: any) => String(t.name))
    : []

  const tagMap: Record<string, ApiOperation[]> = {}

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue
    const methods = ['get', 'post', 'put', 'delete', 'patch'] as const

    for (const method of methods) {
      const op = (pathItem as any)[method]
      if (!op) continue

      const opTags: string[] = Array.isArray(op.tags) && op.tags.length > 0 ? op.tags : ['_untagged']
      for (const rawTag of opTags) {
        const tag = String(rawTag)
        if (!tagMap[tag]) tagMap[tag] = []

        tagMap[tag].push({
          tag,
          displayTag: tag === '_untagged' ? 'Untagged' : tag,
          path: pathKey,
          method,
          summary: typeof op.summary === 'string' ? op.summary : undefined,
          operationId: typeof op.operationId === 'string' ? op.operationId : undefined,
        })
      }
    }
  }

  // Determine tag display order similar to the HTML sidebar
  const orderedTagNames: string[] = []

  // 1. Tags in spec.tags, if present in tagMap
  for (const name of tagsOrder) {
    if (tagMap[name]) {
      orderedTagNames.push(name)
    }
  }

  // 2. Any remaining tags (except _untagged)
  for (const name of Object.keys(tagMap)) {
    if (name === '_untagged') continue
    if (!orderedTagNames.includes(name)) {
      orderedTagNames.push(name)
    }
  }

  // 3. _untagged at the end as "Untagged" if present
  if (tagMap['_untagged']) {
    orderedTagNames.push('_untagged')
  }

  return orderedTagNames.map((tagName) => {
    const ops = tagMap[tagName] || []
    const displayName = tagName === '_untagged' ? 'Untagged' : tagName

    // Optionally sort operations by path then method
    ops.sort((a, b) => {
      if (a.path === b.path) {
        return a.method.localeCompare(b.method)
      }
      return a.path.localeCompare(b.path)
    })

    return {
      name: tagName,
      displayName,
      operations: ops,
    }
  })
}

function scrollToOperation(op: ApiOperation) {
  const { tag, operationId, path, method } = op

  const tryScroll = () => {
    let target: HTMLElement | null = null

    const candidates: string[] = []
    if (operationId) {
      const tagSlug = String(tag || '').replace(/\s+/g, '-')
      const tagSlugLower = tagSlug.toLowerCase()
      candidates.push(`operations-${tag}-${operationId}`)
      candidates.push(`operations-${tagSlug}-${operationId}`)
      candidates.push(`operations-${tagSlugLower}-${operationId}`)
    }

    for (const id of candidates) {
      const el = document.getElementById(id)
      if (el) {
        target = el as HTMLElement
        break
      }
    }

    if (!target) {
      const blocks = document.querySelectorAll<HTMLElement>('#swagger-ui-root .opblock')
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i]
        const m = b.querySelector('.opblock-summary-method')
        const p = b.querySelector('.opblock-summary-path')
        if (!m || !p) continue
        const methodText = m.textContent?.trim().toLowerCase()
        const pathText = p.textContent?.trim()
        if (methodText === String(method).toLowerCase() && pathText === path) {
          target = b
          break
        }
      }
    }

    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Delay slightly to give Swagger UI time to render if needed
  setTimeout(tryScroll, 150)
}
