'use client'

import { useParams } from 'next/navigation'
import { ExpenseReceiptDetailsView } from '@/components/expense-receipt-details-view'

export default function ExpenseDetailsPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string)

  return <ExpenseReceiptDetailsView expenseId={id} backHref="/expenses" />
}
