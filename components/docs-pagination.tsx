'use client'

import { usePathname } from 'next/navigation'
import { docNavigation, type DocNavItem } from '@/lib/docs-navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export function DocsPagination() {
  const pathname = usePathname()
  const allDocs = docNavigation.flatMap((group) => group.items)
  const currentIndex = allDocs.findIndex((item) => item.href === pathname)

  if (currentIndex === -1) {
    return null
  }

  const prev = currentIndex > 0 ? allDocs[currentIndex - 1] : undefined
  const next = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : undefined

  return (
    <div className="mt-12 flex justify-between items-center">
      <div>
        {prev && (
          <Link
            href={prev.href}
            className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Previous</span>
              <span className="font-semibold text-primary">{prev.name}</span>
            </div>
          </Link>
        )}
      </div>
      <div>
        {next && (
          <Link
            href={next.href}
            className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <div className="flex flex-col text-right">
              <span className="text-xs text-muted-foreground">Next</span>
              <span className="font-semibold text-primary">{next.name}</span>
            </div>
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        )}
      </div>
    </div>
  )
}
