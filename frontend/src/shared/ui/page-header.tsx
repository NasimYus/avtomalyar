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
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <h1 className="text-[28px] font-black">
        {title}
        {count !== undefined && <span className="ml-2 font-bold text-faint">{count}</span>}
      </h1>
      {actions !== undefined && <div className="flex gap-2.5">{actions}</div>}
    </div>
  )
}
