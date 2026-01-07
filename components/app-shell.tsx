'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { useUser } from '@stackframe/stack'
import { FilterProvider } from '@/lib/context/filter-context'
import { Toaster } from 'sonner'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Navigation } from '@/components/navigation'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const user = useUser()
  const isDocsRoute = pathname.startsWith('/docs')
  const isLandingRoute = pathname === '/'
  const isAssistantRoute = pathname.startsWith('/assistant')

  if (isDocsRoute) {
    return <>{children}</>
  }

  if (isLandingRoute && !user) {
    return (
      <Suspense fallback={null}>
        <div className="min-h-screen bg-background">
          {children}
          <Toaster />
        </div>
      </Suspense>
    )
  }

  return (
    <Suspense fallback={null}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className={isAssistantRoute ? 'm-0 rounded-none shadow-none' : undefined}>
          <div className="min-h-screen bg-background">
            <FilterProvider>
              {!isAssistantRoute && <Navigation />}
              <main className={isAssistantRoute ? 'h-[100dvh] w-full' : 'w-full px-4 py-6'}>{children}</main>
            </FilterProvider>
            <Toaster />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Suspense>
  )
}
