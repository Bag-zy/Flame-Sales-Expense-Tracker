'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { docNavigation } from '@/lib/docs-navigation'

export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-full shrink-0 border-b pb-4 md:w-64 md:border-b-0 md:border-r md:pb-0 md:pr-4">
      {docNavigation.map((group) => (
        <div key={group.title} className="mb-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.title}
          </div>
          <nav className="space-y-1">
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href === '/docs' && pathname === '/docs')

              const Icon = item.icon as
                | React.ComponentType<React.SVGProps<SVGSVGElement>>
                | undefined

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      ))}
    </aside>
  )
}
