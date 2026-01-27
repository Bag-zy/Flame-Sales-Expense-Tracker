'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ExpenseForm } from '@/components/forms/expense-form'
import { useFilter } from '@/lib/context/filter-context'

interface Expense {
  id: number
  project_id?: number
  cycle_id?: number
  category_id?: number
  vendor_id?: number
  payment_method_id?: number
  expense_name?: string
  description: string
  amount: number
  product_id?: number | null
  variant_id?: number | null
  inventory_quantity?: number | null
  inventory_unit_cost?: number | null
  date_time_created: string
  created_by: number
  created_at: string
}

interface Receipt {
  id: number
  expense_id?: number
  file_path?: string
  upload_date: string
  raw_text?: string
  structured_data?: any
}

interface ExpenseCategory {
  id: number
  category_name: string
  project_category_id?: number | null
}

interface Vendor {
  id: number
  vendor_name: string
}

interface PaymentMethod {
  id: number
  payment_method: string
}

interface ProjectCategory {
  id: number
  category_name: string
}

interface Cycle {
  id: number
  cycle_name: string
}

export function ExpenseReceiptDetailsView({
  expenseId,
  receiptId,
  backHref,
}: {
  expenseId: string
  receiptId?: string
  backHref: string
}) {
  const router = useRouter()
  const { projects } = useFilter()

  const [loading, setLoading] = useState(true)
  const [expense, setExpense] = useState<Expense | null>(null)
  const [receipts, setReceipts] = useState<Receipt[]>([])

  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([])
  const [cycles, setCycles] = useState<Cycle[]>([])

  const selectedReceipt = useMemo(() => {
    if (receiptId) {
      const exact = receipts.find((r) => String(r.id) === String(receiptId))
      if (exact) return exact
    }
    return receipts[0] ?? null
  }, [receiptId, receipts])

  const loadData = async () => {
    try {
      setLoading(true)

      const expenseUrl = new URL('/api/v1/expenses', window.location.origin)
      expenseUrl.searchParams.set('id', expenseId)

      const receiptsUrl = new URL('/api/v1/receipts', window.location.origin)
      receiptsUrl.searchParams.set('expense_id', expenseId)

      const [expenseRes, receiptsRes, categoriesRes, vendorsRes, paymentMethodsRes, projectCategoriesRes] =
        await Promise.all([
          fetch(expenseUrl.toString()),
          fetch(receiptsUrl.toString()),
          fetch('/api/v1/expense-categories'),
          fetch('/api/v1/vendors'),
          fetch('/api/v1/payment-methods'),
          fetch('/api/v1/project-categories'),
        ])

      const expenseData = await expenseRes.json()
      const receiptsData = await receiptsRes.json()
      const categoriesData = await categoriesRes.json()
      const vendorsData = await vendorsRes.json()
      const paymentMethodsData = await paymentMethodsRes.json()
      const projectCategoriesData = await projectCategoriesRes.json()

      const exp = (expenseData?.expenses || [])[0] as Expense | undefined
      if (expenseData?.status !== 'success' || !exp) {
        toast.error(expenseData?.message || 'Expense not found')
        setExpense(null)
        setReceipts([])
        return
      }

      setExpense({
        ...exp,
        description: (exp as any).description ?? '',
      })
      setReceipts(receiptsData?.status === 'success' ? (receiptsData.receipts || []) : [])

      if (categoriesData?.status === 'success') setCategories(categoriesData.categories || [])
      if (vendorsData?.status === 'success') setVendors(vendorsData.vendors || [])
      if (paymentMethodsData?.status === 'success') setPaymentMethods(paymentMethodsData.payment_methods || [])
      if (projectCategoriesData?.status === 'success') setProjectCategories(projectCategoriesData.categories || [])

      try {
        const cyclesUrl = exp.project_id
          ? `/api/v1/cycles?project_id=${exp.project_id}`
          : '/api/v1/cycles'
        const cyclesRes = await fetch(cyclesUrl)
        const cyclesData = await cyclesRes.json()
        if (cyclesData?.status === 'success') setCycles(cyclesData.cycles || [])
      } catch {
        setCycles([])
      }
    } catch {
      toast.error('Failed to load expense details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!expenseId) return
    void loadData()
  }, [expenseId])

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  if (!expense) {
    return (
      <AuthGuard>
        <div className="p-6 space-y-4">
          <Button variant="outline" onClick={() => router.push(backHref)}>
            Back
          </Button>
          <div className="text-muted-foreground">Expense not found.</div>
        </div>
      </AuthGuard>
    )
  }

  const receiptTitle = selectedReceipt?.structured_data?.details?.receipt_number
    ? `Receipt ${selectedReceipt.structured_data.details.receipt_number}`
    : selectedReceipt
      ? `Receipt #${selectedReceipt.id}`
      : 'Receipt'

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Expense Details</h1>
            <div className="text-sm text-muted-foreground">
              #{expense.id}
              {expense.expense_name ? ` • ${expense.expense_name}` : ''}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(backHref)}>
              Back
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Edit Expense</CardTitle>
              <CardDescription>Update the expense details</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseForm
                editingExpense={expense}
                selectedProject={expense.project_id?.toString() || ''}
                selectedCycle={expense.cycle_id?.toString() || ''}
                projects={projects}
                cycles={cycles}
                categories={categories}
                vendors={vendors}
                paymentMethods={paymentMethods}
                projectCategories={projectCategories}
                setCategories={setCategories}
                setVendors={setVendors}
                onSuccess={() => {
                  void loadData()
                }}
                onCancel={() => router.push(backHref)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{receiptTitle}</CardTitle>
              <CardDescription>Receipt preview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedReceipt?.file_path ? (
                <div className="rounded-md border border-border bg-muted/20 p-2">
                  <img
                    src={selectedReceipt.file_path}
                    alt="Receipt"
                    className="w-full max-h-[70vh] object-contain rounded"
                  />
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
                  No receipt image found for this expense.
                </div>
              )}

              {selectedReceipt?.raw_text ? (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">View OCR text</summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-3 text-xs font-mono">
                    {selectedReceipt.raw_text}
                  </pre>
                </details>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
