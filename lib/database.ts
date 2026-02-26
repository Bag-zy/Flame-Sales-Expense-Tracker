import { neon } from '@neondatabase/serverless'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// HTTP client for simple queries
const sql = neon(connectionString)

type QueryResult = { rows: any[] }

async function query(text: string, params?: any[]): Promise<QueryResult> {
  // Newer neon versions require .query() for $1 placeholders
  const result = params && params.length > 0
    ? await sql.query(text, params)
    : await sql.query(text)

  const rows = Array.isArray(result) ? result : (result as any).rows || []
  return { rows }
}

async function transaction<T>(fn: (tx: { query: typeof query }) => Promise<T>): Promise<T> {
  // Simple fallback for HTTP client
  return await fn({ query })
}

export const db = { query, transaction }

export interface Project {
  id: number
  project_name: string
  project_category_id?: number
  category_id?: number
  vendor_id?: number
  department?: string
  created_datetime?: string
  created_by: string
}

export interface Expense {
  id: number
  project_id: number
  cycle_id?: number
  category_id: number
  vendor_id?: number
  payment_method_id?: number
  description?: string
  amount: number
  date_time_created?: string
  created_by: string
}