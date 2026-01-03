import { NextRequest, NextResponse } from 'next/server'
import { getMetrics, incrementInstall, incrementVisit, metricsEnabled } from '@/lib/metrics'

type MetricsEvent = 'visit' | 'install'

export async function GET() {
  try {
    if (!metricsEnabled()) {
      return NextResponse.json({ visits: 0, installs: 0, disabled: true }, { status: 200 })
    }

    const metrics = await getMetrics()
    return NextResponse.json(metrics, { status: 200 })
  } catch (error) {
    console.error('GET /api/metrics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!metricsEnabled()) {
      return NextResponse.json({ ok: false, disabled: true }, { status: 200 })
    }

    const body = (await request.json().catch(() => null)) as { event?: MetricsEvent } | null
    const event = body?.event

    if (event !== 'visit' && event !== 'install') {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
    }

    if (event === 'visit') {
      await incrementVisit()
    } else {
      await incrementInstall()
    }

    const metrics = await getMetrics()
    return NextResponse.json({ ok: true, ...metrics }, { status: 200 })
  } catch (error) {
    console.error('POST /api/metrics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
