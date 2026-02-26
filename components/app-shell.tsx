'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { useUser } from '@stackframe/stack'
import { FilterProvider } from '@/lib/context/filter-context'
import { Toaster } from 'sonner'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Navigation } from '@/components/navigation'
import { AssistantSidebar } from '@/components/assistant-sidebar'
import { CopilotPopup } from "@copilotkit/react-ui"
import { AssistantProvider } from '@/lib/context/assistant-context'
import { cn } from '@/lib/utils'
import "@copilotkit/react-ui/styles.css"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const user = useUser()
  const isDocsRoute = pathname.startsWith('/docs')
  const isLandingRoute = pathname === '/'
  const isAssistantRoute = pathname.startsWith('/assistant')

  const assistantLabels = {
    title: "Flame Assistant",
    initial: "Hi! I'm Flame, your intelligent sales, expense, and inventory assistant. How can I help you today?",
  }

  if (isDocsRoute) {
    return <>{children}</>
  }

  if (isLandingRoute && !user) {
    return (
      <Suspense fallback={null}>
        <div className="min-h-screen bg-background text-foreground">
          {children}
          <CopilotPopup
            defaultOpen={false}
            labels={assistantLabels}
          />
          <Toaster />
        </div>
      </Suspense>
    )
  }

  return (
    <Suspense fallback={null}>
      <AssistantProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className={isAssistantRoute ? 'm-0 rounded-none shadow-none' : undefined}>
            <div className="h-screen flex flex-col overflow-hidden bg-background">
              <FilterProvider>
                {!isAssistantRoute && <Navigation />}
                <div className="flex-1 flex overflow-hidden">
                  <main className={cn(
                    "flex-1 overflow-auto",
                    isAssistantRoute ? 'h-full w-full' : 'w-full px-4 py-6'
                  )}>
                    {children}
                  </main>
                  {!isAssistantRoute && <AssistantSidebar />}
                </div>
              </FilterProvider>
              <Toaster />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </AssistantProvider>
    </Suspense>
  )
}
