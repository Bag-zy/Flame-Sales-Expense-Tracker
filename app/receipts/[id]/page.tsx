'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ExpenseReceiptDetailsView } from '@/components/expense-receipt-details-view'

export default function ReceiptDetailsPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string)

  // Receipts are linked to expenses, but the details UI is expense-driven.
  // We load the receipt by id, then render the expense+receipt view.
  // Since the shared view needs an expense id, we pass the same id as receiptId
  // and let the view choose the first linked receipt for the expense.
  // The view will resolve the right receipt once receipts are loaded.
  return <ReceiptDetailsPageContent receiptId={id} />
}

function ReceiptDetailsPageContent({ receiptId }: { receiptId: string }) {
  // We can't know the expense id until we fetch the receipt.
  // The shared view supports passing receiptId, but still needs expenseId.
  // To keep changes minimal, we do a tiny prefetch here.
  const [expenseId, setExpenseId] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      try {
        const url = new URL('/api/v1/receipts', window.location.origin)
        url.searchParams.set('id', receiptId)
        const res = await fetch(url.toString())
        const data = await res.json()
        const r = (data?.receipts || [])[0]
        const expId = r?.expense_id
        if (expId) setExpenseId(String(expId))
      } catch {
        setExpenseId('')
      }
    }

    void load()
  }, [receiptId])

  if (!expenseId) {
    return <div className="p-6">Loading...</div>
  }

  return <ExpenseReceiptDetailsView expenseId={expenseId} receiptId={receiptId} backHref="/receipts" />
}
