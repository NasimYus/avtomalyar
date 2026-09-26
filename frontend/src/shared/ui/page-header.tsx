import type { ReactNode } from 'react'
import { cn } from '@/shared/lib'

interface PageHeaderProps {
  title: ReactNode
  /** Muted counter next to the title, e.g. the total number of dealers. */
  count?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, count, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-3', className)}>
      <h1 className="min-w-0 text-[22px] leading-tight font-black break-words sm:text-[28px]">
        {title}
        {count !== undefined && <span className="ml-2 font-bold text-faint">{count}</span>}
      </h1>
      {actions !== undefined && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  )
}
