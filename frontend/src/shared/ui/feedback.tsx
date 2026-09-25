import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-chip bg-line', className)} {...props} />
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Загрузка"
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-line-strong border-t-brand-red',
        className,
      )}
    />
  )
}

interface EmptyStateProps {
  title: ReactNode
  description?: ReactNode
  /** Usually a "reset filters" button. */
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('rounded-card bg-surface px-7 py-8 text-center', className)}>
      <div className="text-[17px] font-extrabold">{title}</div>
      {description !== undefined && (
        <div className="mt-1.5 text-[13px] text-muted">{description}</div>
      )}
      {action !== undefined && <div className="mt-3.5">{action}</div>}
    </div>
  )
}

interface ProgressBarProps {
  /** 0–100; values outside the range are clamped. */
  value: number
  tone?: 'red' | 'green' | 'gold' | 'dark'
  size?: 'sm' | 'md'
  className?: string
}

const PROGRESS_TONES: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  red: 'bg-brand-red',
  green: 'bg-brand-green',
  gold: 'bg-brand-yellow',
  dark: 'bg-night',
}

export function ProgressBar({ value, tone = 'red', size = 'md', className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const height = size === 'sm' ? 'h-1.5' : 'h-2'

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('overflow-hidden rounded-lg bg-line-strong', height, className)}
    >
      <div
        className={cn('h-full rounded-lg', PROGRESS_TONES[tone])}
        style={{ width: `${String(clamped)}%` }}
      />
    </div>
  )
}
