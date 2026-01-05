import { copilotkitHandler } from '../_handler'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  return copilotkitHandler.handleRequest(req)
}
