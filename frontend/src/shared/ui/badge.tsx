import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib'

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'dark'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-field text-ink-soft',
  success: 'bg-brand-green/10 text-brand-green',
  danger: 'bg-brand-red/10 text-brand-red-dark',
  warning: 'bg-brand-yellow/20 text-brand-yellow-dark',
  dark: 'bg-ink text-white',
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
