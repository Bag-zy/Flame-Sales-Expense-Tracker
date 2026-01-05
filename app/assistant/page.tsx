'use client'

import { AuthGuard } from '@/components/auth-guard'
import { CopilotChat } from '@copilotkit/react-ui'
import { useFrontendTool } from '@copilotkit/react-core'
import { UIResourceRenderer } from '@mcp-ui/client'

export default function AssistantPage() {
  useFrontendTool(
    {
      name: 'mcp_tool',
      description:
        'Call any MCP worker tool by name. Use this for non-UI tools too. If the result includes an MCP-UI resource, it will be rendered.',
      parameters: [
        { name: 'toolName', type: 'string', required: true },
        { name: 'toolArgs', type: 'object', required: false },
      ],
      handler: async (args) => {
        const toolName = String((args as any)?.toolName ?? '').trim()
        const toolArgsRaw = (args as any)?.toolArgs
        const toolArgs =
          toolArgsRaw && typeof toolArgsRaw === 'object' && !Array.isArray(toolArgsRaw) ? toolArgsRaw : {}

        const res = await fetch('/api/assistant-mcp-ui', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ toolName, toolArgs }),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json || json.status !== 'success') {
          throw new Error(json?.message || `Failed to call MCP tool: ${toolName}`)
        }
        return { toolResult: json.toolResult ?? null, uiResource: json.uiResource ?? null }
      },
      render: ({ status, args, result }) => {
        const toolName = (args as any)?.toolName

        if (status !== 'complete') {
          return (
            <div className="mt-3 text-sm text-muted-foreground">Calling MCP tool{toolName ? `: ${toolName}` : ''}…</div>
          )
        }

        const uiResource = (result as any)?.uiResource
        if (uiResource && typeof uiResource === 'object') {
          return (
            <div className="mt-3">
              <UIResourceRenderer resource={uiResource} />
            </div>
          )
        }

        const toolResult = (result as any)?.toolResult
        return (
          <div className="mt-3 rounded-md border bg-muted/30 p-3 text-xs">
            <div className="mb-2 font-medium">MCP Result{toolName ? `: ${toolName}` : ''}</div>
            <pre className="whitespace-pre-wrap break-words">{JSON.stringify(toolResult, null, 2)}</pre>
          </div>
        )
      },
    },
    [],
  )

  useFrontendTool(
    {
      name: 'show_dashboard',
      description: 'Open the Flame dashboard UI.',
      parameters: [],
      handler: async () => {
        const res = await fetch('/api/assistant-mcp-ui', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ toolName: 'show_dashboard', toolArgs: {} }),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json || json.status !== 'success') {
          throw new Error(json?.message || 'Failed to open dashboard')
        }
        return { uiResource: json.uiResource ?? null }
      },
      render: ({ status, result }) => {
        if (status !== 'complete') return <div className="mt-3 text-sm text-muted-foreground">Opening Dashboard…</div>
        const uiResource = (result as any)?.uiResource
        if (!uiResource || typeof uiResource !== 'object') return <></>
        return (
          <div className="mt-3">
            <UIResourceRenderer resource={uiResource} />
          </div>
        )
      },
    },
    [],
  )

  useFrontendTool(
    {
      name: 'show_reports',
      description: 'Open the Flame reports UI.',
      parameters: [],
      handler: async () => {
        const res = await fetch('/api/assistant-mcp-ui', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ toolName: 'show_reports', toolArgs: {} }),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json || json.status !== 'success') {
          throw new Error(json?.message || 'Failed to open reports')
        }
        return { uiResource: json.uiResource ?? null }
      },
      render: ({ status, result }) => {
        if (status !== 'complete') return <div className="mt-3 text-sm text-muted-foreground">Opening Reports…</div>
        const uiResource = (result as any)?.uiResource
        if (!uiResource || typeof uiResource !== 'object') return <></>
        return (
          <div className="mt-3">
            <UIResourceRenderer resource={uiResource} />
          </div>
        )
      },
    },
    [],
  )

  useFrontendTool(
    {
      name: 'show_projects',
      description: 'Open the Flame projects UI.',
      parameters: [],
      handler: async () => {
        const res = await fetch('/api/assistant-mcp-ui', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ toolName: 'show_projects', toolArgs: {} }),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json || json.status !== 'success') {
          throw new Error(json?.message || 'Failed to open projects')
        }
        return { uiResource: json.uiResource ?? null }
      },
      render: ({ status, result }) => {
        if (status !== 'complete') return <div className="mt-3 text-sm text-muted-foreground">Opening Projects…</div>
        const uiResource = (result as any)?.uiResource
        if (!uiResource || typeof uiResource !== 'object') return <></>
        return (
          <div className="mt-3">
            <UIResourceRenderer resource={uiResource} />
          </div>
        )
      },
    },
    [],
  )

  useFrontendTool(
    {
      name: 'show_expenses',
      description: 'Open the Flame expenses UI (optionally filtered by projectId/cycleId).',
      parameters: [
        { name: 'projectId', type: 'string', required: false },
        { name: 'cycleId', type: 'string', required: false },
      ],
      handler: async (args) => {
        const toolArgs: Record<string, unknown> = {}
        if (args?.projectId) toolArgs.projectId = args.projectId
        if (args?.cycleId) toolArgs.cycleId = args.cycleId

        const res = await fetch('/api/assistant-mcp-ui', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ toolName: 'show_expenses', toolArgs }),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json || json.status !== 'success') {
          throw new Error(json?.message || 'Failed to open expenses')
        }
        return { uiResource: json.uiResource ?? null }
      },
      render: ({ status, args, result }) => {
        if (status !== 'complete') {
          const suffix =
            args?.projectId || args?.cycleId
              ? ` (projectId=${args?.projectId ?? '-'}, cycleId=${args?.cycleId ?? '-'})`
              : ''
          return (
            <div className="mt-3 text-sm text-muted-foreground">Opening Expenses{suffix}…</div>
          )
        }
        const uiResource = (result as any)?.uiResource
        if (!uiResource || typeof uiResource !== 'object') return <></>
        return (
          <div className="mt-3">
            <UIResourceRenderer resource={uiResource} />
          </div>
        )
      },
    },
    [],
  )

  return (
    <AuthGuard>
      <div className="p-6">
        <div className="h-[70vh] overflow-hidden rounded-lg border bg-background">
          <CopilotChat
            instructions={
              'You are Flame, an assistant for a sales & expense tracking app. Help the user navigate projects, cycles, sales, expenses, invoices, and reports. When useful, you may call tools to show dashboards, reports, projects, and expenses.'
            }
            labels={{
              title: 'Flame Assistant',
              initial: 'Hi! How can I help you today?',
            }}
          />
        </div>
      </div>
    </AuthGuard>
  )
}
