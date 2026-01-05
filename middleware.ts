import { NextRequest, NextResponse } from 'next/server'

// Middleware to enforce versioned API routes under /api/v1/*.
//
// - /api/v1/*           -> internally rewritten to the existing /api/* routes
// - /api/openapi, /api/mcp* remain accessible for tooling
// - any other /api/*    -> blocked with an error telling the client to use /api/v1/*

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/embed/')) {
    const res = NextResponse.next()

    const allowedFrameAncestorsRaw =
      process.env.EMBED_ALLOWED_FRAME_ANCESTORS || process.env.NEXT_PUBLIC_EMBED_ALLOWED_FRAME_ANCESTORS
    const allowedFrameAncestors = allowedFrameAncestorsRaw
      ? allowedFrameAncestorsRaw
          .split(/[\s,]+/)
          .map(s => s.trim())
          .filter(Boolean)
      : []

    const frameAncestorsValue =
      allowedFrameAncestors.length > 0 ? allowedFrameAncestors.join(' ') : "'self'"

    res.headers.set('Content-Security-Policy', `frame-ancestors ${frameAncestorsValue}`)
    return res
  }

  // Only care about /api/* traffic; everything else passes through.
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Allow internal/system endpoints to remain unversioned.
  if (
    pathname === '/api/openapi' ||
    pathname.startsWith('/api/mcp') ||
    pathname === '/api/copilotkit' ||
    pathname.startsWith('/api/copilotkit/') ||
    pathname === '/api/assistant-mcp-ui'
  ) {
    return NextResponse.next()
  }

  // For versioned API requests, rewrite /api/v1/* -> /api/* so existing
  // route files in app/api/** continue to handle the logic.
  if (pathname.startsWith('/api/v1/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/api\/v1/, '/api')
    return NextResponse.rewrite(url)
  }

  // For any other /api/* path (non-versioned business APIs), block access and
  // instruct clients to use the versioned /api/v1/* URLs instead.
  return NextResponse.json(
    {
      status: 'error',
      message: 'Please use versioned API routes under /api/v1/*',
    },
    { status: 404 },
  )
}

// Limit this middleware to API routes only.
export const config = {
  matcher: ['/api/:path*', '/embed/:path*'],
}
