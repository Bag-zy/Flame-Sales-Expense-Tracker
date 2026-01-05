import { CopilotRuntime, GroqAdapter, copilotRuntimeNextJSAppRouterEndpoint } from '@copilotkit/runtime'
import Groq from 'groq-sdk'

const copilotRuntime = new CopilotRuntime()

function getServiceAdapter() {
  const model = (process.env.GROQ_MODEL || '').trim() || 'llama-3.1-70b-versatile'

  return new GroqAdapter({
    groq: new Groq({ apiKey: process.env.GROQ_API_KEY }),
    model,
  })
}

export const copilotkitHandler = copilotRuntimeNextJSAppRouterEndpoint({
  runtime: copilotRuntime,
  serviceAdapter: getServiceAdapter(),
  endpoint: '/api/copilotkit',
})
