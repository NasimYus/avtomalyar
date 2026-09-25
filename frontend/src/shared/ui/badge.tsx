import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib'

export type BadgeTone =
  'neutral' | 'success' | 'danger' | 'warning' | 'dark' | 'bronze' | 'silver' | 'gold'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-field text-ink-soft',
  success: 'bg-brand-green/10 text-brand-green',
  danger: 'bg-brand-red/10 text-brand-red-dark',
  warning: 'bg-brand-yellow/20 text-brand-yellow-dark',
  dark: 'bg-ink text-white',
  bronze: 'bg-grade-bronze text-ink',
  silver: 'bg-grade-silver text-ink',
  gold: 'bg-grade-gold text-ink',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-inner px-2.5 py-1 text-xs font-bold whitespace-nowrap',
        TONES[tone],
        className,
      )}
      {...props}
    />
  )
}

/**
 * Grade pill. Grades are admin-defined, so the colour is picked by the
 * grade's position in the ladder rather than by its name.
 */
export function GradeBadge({
  name,
  tone = 'neutral',
  className,
}: {
  name: string
  tone?: BadgeTone
  className?: string
}) {
  return (
    <Badge tone={tone} className={cn('font-extrabold uppercase', className)}>
      {name}
    </Badge>
  )
}
