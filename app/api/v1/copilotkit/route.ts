import { copilotkitHandler } from '../../copilotkit/_handler'

export const runtime = 'nodejs'

function rewriteToNonV1(req: Request) {
  const url = new URL(req.url)

  if (url.pathname.startsWith('/api/v1/copilotkit')) {
    url.pathname = url.pathname.replace('/api/v1/copilotkit', '/api/copilotkit')
  }

  return new Request(url.toString(), req)
}

export async function GET(req: Request) {
  return copilotkitHandler.handleRequest(rewriteToNonV1(req))
}

export async function POST(req: Request) {
  return copilotkitHandler.handleRequest(rewriteToNonV1(req))
}
