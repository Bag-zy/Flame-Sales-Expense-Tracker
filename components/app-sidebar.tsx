'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useUser, useStackApp } from '@stackframe/stack'
import { DiscordLogoIcon } from '@radix-ui/react-icons'
import { useEffect, useMemo, useState } from 'react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { navigation } from '@/components/navigation'
import { docNavigation } from '@/lib/docs-navigation';
import { ApiDocsSidebar } from '@/components/api-docs-sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ModeToggle } from '@/components/mode-toggle'

interface ChatSession {
  id: number
  title: string | null
  created_at: string
  updated_at: string
  last_message_at: string | null
}

export function AppSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const user = useUser()
  const app = useStackApp()
  const isDocsRoute = pathname.startsWith('/docs')
  const isApiDocsRoute = pathname === '/api-docs'
  const isAssistantRoute = pathname.startsWith('/assistant')

  const [assistantSessions, setAssistantSessions] = useState<ChatSession[]>([])
  const [assistantSessionsLoading, setAssistantSessionsLoading] = useState(false)

  const activeAssistantSessionId = useMemo(() => {
    const raw = searchParams.get('session_id')
    if (!raw) return null
    const id = parseInt(raw, 10)
    return Number.isFinite(id) ? id : null
  }, [searchParams])

  useEffect(() => {
    if (!isAssistantRoute) return

    let cancelled = false

    async function loadSessions() {
      setAssistantSessionsLoading(true)
      try {
        const res = await fetch('/api/v1/assistant-chat-sessions?limit=50')
        const data = await res.json().catch(() => null)
        if (cancelled) return
        if (!data || data.status !== 'success') {
          setAssistantSessions([])
          return
        }
        setAssistantSessions((data.sessions as ChatSession[]) ?? [])
      } catch {
        if (!cancelled) setAssistantSessions([])
      } finally {
        if (!cancelled) setAssistantSessionsLoading(false)
      }
    }

    loadSessions()

    return () => {
      cancelled = true
    }
  }, [isAssistantRoute, activeAssistantSessionId])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-3 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary overflow-hidden">
            <img
              src="/images/logo/flame logo.jpg"
              alt="Flame logo"
              className="h-8 w-8 object-cover"
            />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/70">
              Flame
            </span>
            <span className="text-sm font-semibold text-sidebar-foreground">
              Sales &amp; Expense
            </span>
            <span className="text-[11px] text-sidebar-foreground/60">
              Tracker
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        {isAssistantRoute ? (
          <SidebarGroup>
            <SidebarGroupLabel>Conversations</SidebarGroupLabel>
            <SidebarGroupContent>
              {assistantSessionsLoading ? (
                <div className="px-2 py-2 text-xs text-muted-foreground">Loading...</div>
              ) : assistantSessions.length === 0 ? (
                <div className="px-2 py-2 text-xs text-muted-foreground">No conversations yet.</div>
              ) : (
                <SidebarMenu>
                  {assistantSessions.map((s) => {
                    const isActive = activeAssistantSessionId
                      ? s.id === activeAssistantSessionId
                      : s.id === assistantSessions[0]?.id

                    const title = s.title?.trim() || `Conversation #${s.id}`

                    return (
                      <SidebarMenuItem key={s.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={title}
                        >
                          <Link href={{ pathname: '/assistant', query: { session_id: String(s.id) } }}>
                            <span className="truncate">{title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        ) : isDocsRoute ? (
          <>
            {docNavigation.map((group) => (
              <SidebarGroup key={group.title}>
                <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const Icon =
                        item.icon as
                          | React.ComponentType<React.SVGProps<SVGSVGElement>>
                          | undefined

                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname === item.href}
                            tooltip={item.name}
                          >
                            <Link href={item.href}>
                              {Icon && <Icon className="h-4 w-4" />}
                              <span>{item.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </>
        ) : isApiDocsRoute ? (
          <SidebarGroup>
            <SidebarGroupLabel>API Reference</SidebarGroupLabel>
            <SidebarGroupContent>
              <ApiDocsSidebar />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => {
                  const Icon =
                    item.icon as
                      | React.ComponentType<React.SVGProps<SVGSVGElement>>
                      | undefined

                  const isActive =
                    item.href === '/'
                      ? pathname === '/'
                      : item.href === '/docs'
                        ? pathname === '/docs' || pathname.startsWith('/docs/')
                        : pathname === item.href

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.name}
                      >
                        <Link href={item.href}>
                          {Icon && <Icon className="h-4 w-4" />}
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-2 border-t border-sidebar-border px-2 py-2 text-xs group-data-[collapsible=icon]:hidden">
          <Button variant="secondary" size="sm" className="w-full justify-center" asChild>
            <a href="https://discord.gg/3QgsNp7q3c" target="_blank" rel="noreferrer">
              <DiscordLogoIcon className="h-4 w-4" />
              <span>Give Feedback</span>
            </a>
          </Button>

          <Button variant="outline" size="sm" className="w-full justify-center" asChild>
            <Link href="/docs">
              <span>Docs</span>
            </Link>
          </Button>


          <div className="flex items-center justify-between gap-3">
            {user ? (
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {(user.displayName ?? user.primaryEmail ?? 'U')
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <div className="font-medium truncate">{user.displayName ?? 'User'}</div>
                  <div className="text-muted-foreground truncate">{user.primaryEmail}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                <span>Not signed in</span>
              </div>
            )}

            <ModeToggle />
          </div>

          {user ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center"
              onClick={() => user.signOut()}
            >
              Sign Out
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center"
              onClick={() => app.signInWithOAuth('google')}
            >
              Sign In
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
