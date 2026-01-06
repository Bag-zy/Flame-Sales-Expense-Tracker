import { CopilotRuntime, EmptyAdapter, copilotRuntimeNextJSAppRouterEndpoint } from '@copilotkit/runtime'
import { BuiltInAgent } from '@copilotkitnext/agent'

if (!process.env.OPENAI_API_KEY && process.env.GROQ_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.GROQ_API_KEY
}

if (!process.env.OPENAI_BASE_URL) {
  process.env.OPENAI_BASE_URL = 'https://api.groq.com/openai/v1'
}

const model = (process.env.GROQ_MODEL || '').trim() || 'llama-3.3-70b-versatile'

const flamePrompt =
  'You are Flame, an assistant for the Flame Sales & Expense Tracker.\n' +
  'Your goal is to help users manage organizations, projects, cycles, sales, expenses, invoices, receipts, customers, vendors, categories, payment methods, teams, and reports.\n' +
  'Ask clarifying questions when required fields are missing.\n' +
  'Prefer using tools to fetch or update real data instead of guessing.\n' +
  'When asked to show the UI (dashboard/reports/projects/expenses), call the appropriate tool to open the UI.\n' +
  'Be concise and action-oriented.'

const flameAgent = new BuiltInAgent({
  model: `openai/${model}`,
  prompt: flamePrompt,
  maxSteps: 5,
})

const copilotRuntime = new CopilotRuntime({
  agents: {
    Flame: flameAgent,
    default: flameAgent,
  },
})

export const copilotkitHandler = copilotRuntimeNextJSAppRouterEndpoint({
  runtime: copilotRuntime,
  serviceAdapter: new EmptyAdapter(),
  endpoint: '/api/copilotkit',
})
