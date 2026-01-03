import path from 'path'
import { createSwaggerSpec } from 'next-swagger-doc'

export const getSwaggerSpec = () => {
  const spec = createSwaggerSpec({
    apiFolder: 'app/api',
    pathFilter: (path: string) => path.endsWith('/route.ts'),
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Flame Sales & Expense Tracker API',
        version: '1.0.0',
        description:
          'API for managing organizations, projects, expenses, sales, and related resources in the Flame Sales & Expense Tracker.',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Local development server',
        },
        {
          url: 'https://flame-expense-tracker.bagumajonah3.workers.dev',
          description: 'Production server (Cloudflare Workers)',
        },
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-Api-Key',
            description:
              'Flame API key in the format flame_ak_<prefix>_<secret>. Include it as an X-Api-Key header when calling these endpoints.',
          },
        },
        schemas: {
          Project: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              project_name: { type: 'string' },
              project_category_id: { type: 'integer', nullable: true },
              category_id: { type: 'integer', nullable: true },
              vendor_id: { type: 'integer', nullable: true },
              department: { type: 'string', nullable: true },
              created_datetime: { type: 'string', format: 'date-time', nullable: true },
              created_by: { type: 'string' },
            },
          },
          Expense: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              project_id: { type: 'integer' },
              cycle_id: { type: 'integer', nullable: true },
              category_id: { type: 'integer' },
              vendor_id: { type: 'integer', nullable: true },
              payment_method_id: { type: 'integer', nullable: true },
              description: { type: 'string', nullable: true },
              amount: { type: 'number' },
              date_time_created: { type: 'string', format: 'date-time', nullable: true },
              created_by: { type: 'string' },
            },
          },
          Sale: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              project_id: { type: 'integer', nullable: true },
              cycle_id: { type: 'integer', nullable: true },
              product_id: { type: 'integer', nullable: true },
              variant_id: { type: 'integer', nullable: true },
              customer_name: { type: 'string', nullable: true },
              customer_id: { type: 'integer', nullable: true },
              quantity: { type: 'number' },
              unit_cost: { type: 'number' },
              price: { type: 'number' },
              status: { type: 'string' },
              cash_at_hand: { type: 'number', nullable: true },
              balance: { type: 'number', nullable: true },
              amount: { type: 'number' },
              amount_org_ccy: { type: 'number', nullable: true },
              sale_date: { type: 'string', format: 'date-time', nullable: true },
              organization_id: { type: 'integer' },
              created_by: { type: 'integer' },
            },
          },
          Organization: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              created_at: { type: 'string', format: 'date-time', nullable: true },
              updated_at: { type: 'string', format: 'date-time', nullable: true },
              country_code: { type: 'string', nullable: true },
              currency_code: { type: 'string', nullable: true },
              currency_symbol: { type: 'string', nullable: true },
            },
          },
          User: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              email: { type: 'string', format: 'email', nullable: true },
              employee_name: { type: 'string', nullable: true },
              user_role: { type: 'string', nullable: true },
              phone_number: { type: 'string', nullable: true },
              created_at: { type: 'string', format: 'date-time', nullable: true },
              organization_id: { type: 'integer', nullable: true },
            },
          },
          Team: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              organization_id: { type: 'integer' },
              team_lead_id: { type: 'integer', nullable: true },
            },
          },
          ReportSummary: {
            type: 'object',
            properties: {
              totalRevenue: { type: 'number' },
              totalExpenses: { type: 'number' },
              netProfit: { type: 'number' },
              totalBudgetAllotment: { type: 'number' },
              monthlyTrends: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    month: { type: 'string', example: '2025-01' },
                    totalRevenue: { type: 'number' },
                    totalExpenses: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
      security: [{ ApiKeyAuth: [] }],
      tags: [
        { name: 'Auth', description: 'Authentication and session endpoints' },
        { name: 'Organizations', description: 'Organizations and settings' },

        { name: 'Projects', description: 'Projects' },
        { name: 'Project Categories', description: 'Project category definitions' },
        { name: 'Cycles', description: 'Project cycles' },
        {
          name: 'Category Presets',
          description: 'Global project and expense category presets and application',
        },

        { name: 'Expenses', description: 'Expense records' },
        { name: 'Expense Categories', description: 'Expense category definitions' },
        { name: 'Payment Methods', description: 'Payment method definitions' },
        { name: 'Vendors', description: 'Vendors and suppliers' },
        { name: 'Mileage Logs', description: 'Mileage log entries' },
        { name: 'Receipts', description: 'Expense receipts and OCR data' },

        { name: 'Sales', description: 'Sales and revenue transactions' },
        { name: 'Products', description: 'Products and inventory' },

        { name: 'Invoices', description: 'Invoices and billing documents' },
        { name: 'Customers', description: 'Customer records' },

        { name: 'Users', description: 'User accounts and roles' },
        { name: 'Teams', description: 'Teams and members' },
        { name: 'Reports', description: 'Reporting and analytics' },
        {
          name: 'Lookups',
          description: 'Reference data (countries, currencies, variant types, etc.)',
        },
        { name: 'System', description: 'System and internal endpoints (e.g. OpenAPI spec, MCP)' },
      ],
      // NOTE: Individual paths for each app/api route are primarily defined via JSDoc-based annotations
      // or can be incrementally added under `paths` here if needed.
    },
  })

  // Normalize any operation-level security blocks that still reference the old
  // stackSession scheme so they instead reference the ApiKeyAuth apiKey scheme.
  // This lets us keep the route JSDoc concise while ensuring the final
  // OpenAPI document is consistently API-key-only.
  const anySpec: any = spec

  // Normalize any operation-level security blocks that still reference the old
  // stackSession scheme so they instead reference the ApiKeyAuth apiKey scheme.
  if (anySpec.paths) {
    for (const pathItem of Object.values(anySpec.paths) as any[]) {
      if (!pathItem) continue
      for (const operation of Object.values(pathItem) as any[]) {
        if (!operation || !Array.isArray(operation.security)) continue

        operation.security = operation.security.map((sec: any) => {
          if (sec && Object.prototype.hasOwnProperty.call(sec, 'stackSession')) {
            const { stackSession, ...rest } = sec
            return { ...rest, ApiKeyAuth: stackSession }
          }
          return sec
        })
      }
    }
  }

  // Rewrite path keys from /api/* to /api/v1/* so that the published
  // documentation exposes versioned endpoints while the underlying
  // route files remain under /api/.
  if (anySpec.paths) {
    const newPaths: Record<string, any> = {}

    for (const [pathKey, pathItem] of Object.entries(anySpec.paths) as [string, any][]) {
      if (!pathItem) continue

      if (pathKey.startsWith('/api/')) {
        const v1Key = pathKey.startsWith('/api/v1/')
          ? pathKey
          : `/api/v1${pathKey.slice('/api'.length)}`
        newPaths[v1Key] = pathItem
      } else {
        newPaths[pathKey] = pathItem
      }
    }

    anySpec.paths = newPaths
  }

  return spec
}
