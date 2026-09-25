import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** "dark" is the flagship card from the design (night surface + red glow). */
  tone?: 'light' | 'dark'
  /** Tables manage their own inner padding, so they opt out. */
  padded?: boolean
}

export function Card({ tone = 'light', padded = true, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card',
        tone === 'dark' ? 'bg-night text-white shadow-glow-lg' : 'bg-surface text-ink',
        padded && 'p-[22px]',
        className,
      )}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-[17px] font-extrabold', className)} {...props} />
}

interface StatCardProps {
  label: string
  value: ReactNode
  /** Small line under the value — e.g. "+6 за месяц". */
  note?: ReactNode
  noteTone?: 'muted' | 'success' | 'gold'
  tone?: 'light' | 'dark'
  className?: string
}

const NOTE_TONES: Record<NonNullable<StatCardProps['noteTone']>, string> = {
  muted: 'text-muted',
  success: 'text-brand-green',
  gold: 'text-brand-yellow',
}

/** Dashboard summary tile: label, big number, optional note. */
export function StatCard({
  label,
  value,
  note,
  noteTone = 'muted',
  tone = 'light',
  className,
}: StatCardProps) {
  return (
    <Card tone={tone} padded={false} className={cn('px-[22px] py-5', className)}>
      <div
        className={cn(
          'text-[13px] font-semibold',
          tone === 'dark' ? 'text-white/65' : 'text-muted',
        )}
      >
        {label}
      </div>
      <div className="mt-1.5 text-[32px] font-black whitespace-nowrap">{value}</div>
      {note !== undefined && (
        <div className={cn('mt-1 text-xs font-bold', NOTE_TONES[noteTone])}>{note}</div>
      )}
    </Card>
  )
}
