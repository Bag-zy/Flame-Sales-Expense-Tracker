'use client'

import Link from 'next/link'
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { useStackApp, useUser } from '@stackframe/stack'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Separator } from '@/components/ui/separator'
import { ModeToggle } from '@/components/mode-toggle'
import { DashboardStats } from '@/components/dashboard-stats'
import { DashboardAnalytics } from '@/components/dashboard-analytics'
import { DiscordLogoIcon } from '@radix-ui/react-icons'
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  Check,
  Globe,
  Plus,
  Receipt,
  Shield,
  ShoppingCart,
  Users,
} from 'lucide-react'

type LandingMetrics = {
  visits: number
  installs: number
}

function LandingPage({
  app,
  landingMetrics,
  setLandingMetrics,
}: {
  app: ReturnType<typeof useStackApp>
  landingMetrics: LandingMetrics | null
  setLandingMetrics: Dispatch<SetStateAction<LandingMetrics | null>>
}) {
  const showVisits = process.env.NEXT_PUBLIC_METRICS_SHOW_VISITS === 'true'
  const showInstalls = process.env.NEXT_PUBLIC_METRICS_SHOW_INSTALLS === 'true' && false
  const enableTracking = process.env.NEXT_PUBLIC_METRICS_ENABLE_TRACKING !== 'false'

  useEffect(() => {
    const shouldFetch = showVisits || showInstalls
    if (!shouldFetch) return

    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/v1/metrics', { method: 'GET' })
        if (!response.ok) return
        const data = (await response.json()) as Partial<LandingMetrics>
        setLandingMetrics({
          visits: typeof data.visits === 'number' ? data.visits : 0,
          installs: typeof data.installs === 'number' ? data.installs : 0,
        })
      } catch {
        return
      }
    }

    fetchMetrics()
  }, [setLandingMetrics, showInstalls, showVisits])

  useEffect(() => {
    if (!enableTracking) return

    const recordVisit = async () => {
      if (typeof window === 'undefined') return
      if (window.sessionStorage.getItem('metrics_visit_recorded') === 'true') return

      try {
        await fetch('/api/v1/metrics', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ event: 'visit' }),
        })

        window.sessionStorage.setItem('metrics_visit_recorded', 'true')
      } catch {
        return
      }
    }

    recordVisit()
  }, [enableTracking])

  useEffect(() => {
    if (!enableTracking) return

    const onInstalled = async () => {
      if (typeof window === 'undefined') return
      if (window.localStorage.getItem('metrics_install_recorded') === 'true') return

      try {
        const response = await fetch('/api/v1/metrics', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ event: 'install' }),
        })

        if (response.ok) {
          const data = (await response.json()) as Partial<LandingMetrics>
          setLandingMetrics((current) => ({
            visits: typeof data.visits === 'number' ? data.visits : current?.visits ?? 0,
            installs:
              typeof data.installs === 'number'
                ? data.installs
                : (current?.installs ?? 0) + 1,
          }))
        }

        window.localStorage.setItem('metrics_install_recorded', 'true')
      } catch {
        return
      }
    }

    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [enableTracking, setLandingMetrics])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
              <img
                src="/images/logo/flame logo.jpg"
                alt="Flame logo"
                className="h-9 w-9 object-cover"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">Flame</span>
              <span className="text-xs text-muted-foreground">Sales &amp; Expense Tracker</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/docs">Docs</Link>
            </Button>
            <Button variant="outline" onClick={() => app.signInWithOAuth('google')}>
              Sign In
            </Button>
            <ModeToggle />
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sidebar-primary/10 via-background to-background" />
          <div className="mx-auto w-full px-4 py-14 md:py-20">
            <div className="max-w-3xl">
              <Badge variant="secondary" className="mb-4">
                Flame Sales &amp; Expense Tracker
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Track <span className="text-green-600 dark:text-green-500">sales</span> and{' '}
                <span className="text-red-600 dark:text-red-500">expenses</span>. Understand{' '}
                <span className="text-blue-600 dark:text-blue-500">profitability</span> in minutes.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground md:text-xl">
                A modern finance workspace for teams, built around organizations, projects, and cycles.
                Capture transactions, attach receipts, and turn activity into clear reports.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={() => app.signInWithOAuth('google')}>
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/docs">View documentation</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a
                    href="https://discord.gg/3QgsNp7q3c"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2"
                  >
                    <DiscordLogoIcon className="h-4 w-4" />
                    Join our Discord
                  </a>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Role-based access for teams
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Reports and analytics
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Receipts and attachments
                </div>
              </div>

              {(showVisits || showInstalls) && landingMetrics && (
                <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {showVisits && (
                    <Badge variant="outline">{landingMetrics.visits.toLocaleString()} views</Badge>
                  )}
                  {showInstalls && (
                    <Badge variant="outline">{landingMetrics.installs.toLocaleString()} installs</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full px-4 py-14">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base">Organize by structure</CardTitle>
                    <CardDescription>
                      Model your business with organizations, projects, and cycles.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base">Sales and invoices</CardTitle>
                    <CardDescription>
                      Track sales, generate invoices, and follow revenue trends.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base">Expenses, receipts, and proof</CardTitle>
                    <CardDescription>
                      Capture spend with categories and keep documents attached.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base">Reports and analytics</CardTitle>
                    <CardDescription>
                      See profitability, cash flow signals, and trends at a glance.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base">Multi-currency ready</CardTitle>
                    <CardDescription>
                      Work across regions with currency-aware projects and reporting.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base">Built for teams</CardTitle>
                    <CardDescription>
                      Role-based access, shared visibility, and controlled workflows.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </section>

        <Separator />

        <section className="mx-auto w-full px-4 py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight">
                How <span className="text-blue-600 dark:text-blue-500">Flame</span> fits your workflow
              </h2>
              <p className="text-muted-foreground">
                Start small, scale cleanly. Flame keeps structure and reporting aligned as your business grows.
              </p>
            </div>

            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-base">1. Create your workspace</CardTitle>
                      <CardDescription>
                        Set up an organization, create a project, and define cycles.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-base">2. Track daily activity</CardTitle>
                      <CardDescription>
                        Log expenses and sales, attach receipts, and categorize consistently.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-base">3. Review reports</CardTitle>
                      <CardDescription>
                        Understand profitability, spot trends, and make confident decisions.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full px-4 pb-16">
          <Card className="overflow-hidden">
            <div className="grid gap-8 p-6 md:grid-cols-2 md:items-center md:p-10">
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold tracking-tight">
                  Ready to get <span className="text-green-600 dark:text-green-500">clarity</span> on finances?
                </h3>
                <p className="text-muted-foreground">
                  Sign in, create your workspace, and start tracking in minutes.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button size="lg" onClick={() => app.signInWithOAuth('google')}>
                  Sign in with Google
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/docs">Read the docs</Link>
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 overflow-hidden rounded-md border border-border bg-card">
              <img
                src="/images/logo/flame logo.jpg"
                alt="Flame logo"
                className="h-8 w-8 object-cover"
              />
            </div>
            <div className="text-sm">
              <div className="font-medium text-foreground">Flame Sales &amp; Expense Tracker</div>
              <div className="text-muted-foreground">Built by Flamehead Labs</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground">
              Documentation
            </Link>
            <Link href="/api-docs" className="hover:text-foreground">
              API Reference
            </Link>
            <a
              href="https://github.com/Flamehead-Labs-Ug/Flame-Sales-Expense-Tracker"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function HomePage() {
  const user = useUser()
  const app = useStackApp()
  const router = useRouter()

  const [landingMetrics, setLandingMetrics] = useState<LandingMetrics | null>(null)

  useEffect(() => {
    const initialize = async () => {
      try {
        const orgResponse = await fetch('/api/v1/organizations')
        const orgData = await orgResponse.json()

        if (orgData.status === 'success' && orgData.organizations.length === 0) {
          router.push('/setup')
        }
      } catch (error) {
        console.error(error)
      }
    }

    if (user) initialize()
  }, [router, user])

  if (!user) {
    return (
      <LandingPage app={app} landingMetrics={landingMetrics} setLandingMetrics={setLandingMetrics} />
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button size="sm" className="text-xs px-2 sm:text-sm sm:px-4"
            onClick={() => router.push('/expenses?open=expense')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
          <Button size="sm" className="text-xs px-2 sm:text-sm sm:px-4"
            onClick={() => router.push('/sales?open=sale')}
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Sale
          </Button>
          <Button size="sm" className="text-xs px-2 sm:text-sm sm:px-4"
            onClick={() => router.push('/invoices?open=invoice')}
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {/* Top-level KPIs */}
        <DashboardStats />

        {/* Analytical overview */}
        <DashboardAnalytics />
      </div>
    </div>
  )
}