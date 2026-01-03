'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useFilter } from '@/lib/context/filter-context'
import ExpensesPage from '../../expenses/page'

export default function EmbedExpensesPage() {
  const searchParams = useSearchParams()
  const { setSelectedProject, setSelectedCycle } = useFilter()

  useEffect(() => {
    const projectId = searchParams.get('projectId')
    const cycleId = searchParams.get('cycleId')

    if (projectId) setSelectedProject(projectId)
    if (cycleId) setSelectedCycle(cycleId)
  }, [searchParams, setSelectedProject, setSelectedCycle])

  return <ExpensesPage />
}
