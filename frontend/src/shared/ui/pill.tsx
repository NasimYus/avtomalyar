import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib'

interface FilterPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  /** Red text variant, used for the "special" filter in the design. */
  accent?: boolean
}

/** Filter chip above admin tables: white by default, ink when active. */
export function FilterPill({
  active = false,
  accent = false,
  className,
  ...props
}: FilterPillProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'rounded-card px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors',
        active ? 'bg-ink text-white' : 'bg-surface text-ink hover:bg-line',
        !active && accent && 'text-brand-red',
        className,
      )}
      {...props}
    />
  )
}

export function PillGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap items-center gap-2.5', className)} {...props} />
}
