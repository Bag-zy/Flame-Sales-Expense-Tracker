import { CopilotRuntime, GroqAdapter, copilotRuntimeNextJSAppRouterEndpoint } from '@copilotkit/runtime'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

const copilotRuntime = new CopilotRuntime()

function getServiceAdapter() {
  return new GroqAdapter({
    groq: new Groq({ apiKey: process.env.GROQ_API_KEY }),
    model: 'llama-3.1-70b-versatile',
  })
}

export const POST = copilotRuntimeNextJSAppRouterEndpoint({
  runtime: copilotRuntime,
  serviceAdapter: getServiceAdapter(),
})
