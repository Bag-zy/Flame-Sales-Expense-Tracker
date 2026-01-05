import { CopilotRuntime, GroqAdapter, copilotRuntimeNextJSAppRouterEndpoint } from '@copilotkit/runtime'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

const copilotRuntime = new CopilotRuntime()

function getServiceAdapter() {
  return new GroqAdapter({
    groq: new Groq({ apiKey: process.env.GROQ_API_KEY }),
    model: 'qwen/qwen3-32b',
  })
}

const handler = copilotRuntimeNextJSAppRouterEndpoint({
  runtime: copilotRuntime,
  serviceAdapter: getServiceAdapter(),
  endpoint: '/api/copilotkit',
})

export async function POST(req: Request) {
  return handler.handleRequest(req)
}
