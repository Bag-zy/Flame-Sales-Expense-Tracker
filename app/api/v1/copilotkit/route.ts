import { copilotkitHandler } from '../../copilotkit/_handler'

export const runtime = 'nodejs'

function rewriteToNonV1(req: Request) {
  const url = new URL(req.url)

  if (url.pathname.startsWith('/api/v1/copilotkit')) {
    url.pathname = url.pathname.replace('/api/v1/copilotkit', '/api/copilotkit')
  }

  const headers = new Headers(req.headers)
  const accept = headers.get('accept') || ''
  const hasJson = accept.toLowerCase().includes('application/json')
  const hasSse = accept.toLowerCase().includes('text/event-stream')
  if (!hasJson || !hasSse) {
    headers.set('accept', 'text/event-stream, application/json')
  }

  const method = req.method.toUpperCase()
  const body = method === 'GET' || method === 'HEAD' ? undefined : req.clone().body

  return new Request(url.toString(), {
    method: req.method,
    headers,
    body,
  })
}

export async function GET(req: Request) {
  return copilotkitHandler.handleRequest(rewriteToNonV1(req))
}

export async function POST(req: Request) {
  return copilotkitHandler.handleRequest(rewriteToNonV1(req))
}
