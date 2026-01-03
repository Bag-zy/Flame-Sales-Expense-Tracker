import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Info, AlertTriangle, AlertCircle } from 'lucide-react'

type CalloutType = 'info' | 'warning' | 'danger'

interface CalloutProps {
  type?: CalloutType
  title?: string
  children: ReactNode
  className?: string
}

const typeStyles: Record<CalloutType, string> = {
  info: 'border-sky-400/60 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:border-sky-500/60 dark:text-sky-50',
  warning:
    'border-amber-400/60 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:border-amber-500/60 dark:text-amber-50',
  danger:
    'border-rose-400/60 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:border-rose-500/60 dark:text-rose-50',
}

const typeIcon: Record<CalloutType, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  danger: AlertCircle,
}

export function Callout({ type = 'info', title, children, className }: CalloutProps) {
  const Icon = typeIcon[type]

  return (
    <div
      className={cn(
        'my-4 flex gap-3 rounded-md border-l-4 px-4 py-3 text-sm md:text-base',
        typeStyles[type],
        className,
      )}
    >
      <div className="mt-0.5">
        <Icon className="h-4 w-4" />
      </div>
      <div className="space-y-1">
        {title && <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  )
}
