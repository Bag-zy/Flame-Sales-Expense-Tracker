import type { ReactNode } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Source_Sans_3 } from 'next/font/google'
import { Card } from '@/components/ui/card'
import { DocsPagination } from '@/components/docs-pagination'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'

const docsFont = Source_Sans_3({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Product documentation for Flame Sales & Expense Tracker',
}

interface DocsLayoutProps {
  children: ReactNode
}

export default function DocsLayout({ children }: DocsLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset
        className={`${docsFont.className} min-h-screen bg-gradient-to-b from-sidebar-primary/5 to-background text-foreground`}
      >
        <header className="border-b bg-card">
          <div className="flex w-full items-center justify-between px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="mr-2" />
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-sidebar-primary">
                <img
                  src="/images/logo/flame logo.jpg"
                  alt="Flame logo"
                  className="h-8 w-8 object-cover"
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Flame
                </span>
                <span className="text-sm font-semibold">Sales &amp; Expense Docs</span>
              </div>
            </div>
            <Link
              href="/"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              ← Back to app
            </Link>
          </div>
        </header>

        <div className="w-full px-4 py-6 md:px-6 md:py-8">
          <main className="min-w-0 flex-1 py-1">
            <Card className="docs-content w-full space-y-8 p-4 md:p-8">
              {children}
              <DocsPagination />
            </Card>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
