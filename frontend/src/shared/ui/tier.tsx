import type { ReactNode } from 'react'
import { cn, type Tier } from '@/shared/lib'
import { CrownIcon, LockIcon } from './icons'

/**
 * The three looks of a grade tier. Colour comes from the tier's material
 * (the `.tier-<material>` palette in app/styles/index.css), showiness from
 * its rank: the upper half of the ladder shimmers, the top grade also
 * glows and wears a crown.
 */
function tierClasses(tier: Tier) {
  return cn(
    `tier-${tier.color}`,
    'tier-surface',
    tier.rank !== 'base' && 'tier-shine',
    tier.rank === 'crown' && 'shadow-glow-tier',
  )
}

/** A grade's name as a pill in its material. */
export function TierBadge({
  tier,
  children,
  className,
}: {
  tier: Tier
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-inner px-2.5 py-1 text-xs font-extrabold whitespace-nowrap uppercase',
        tierClasses(tier),
        className,
      )}
    >
      {tier.rank === 'crown' && <CrownIcon className="size-3.5" />}
      {children}
    </span>
  )
}

const MEDAL_SIZES = {
  sm: 'size-7 text-[12px]',
  md: 'size-10 text-[15px]',
  lg: 'size-14 text-[21px]',
  xl: 'size-[76px] text-[30px]',
} as const

const CROWN_SIZES = {
  sm: 'size-3 -top-2',
  md: 'size-4 -top-2.5',
  lg: 'size-5 -top-3',
  xl: 'size-7 -top-4',
} as const

/**
 * A round medal with the level number — the grade's place on the ladder,
 * which is what a dealer compares ("I'm 3, the top is 10"). A locked
 * medal is a grade not reached yet: grey, with a lock in place of colour.
 */
export function TierMedal({
  tier,
  size = 'md',
  locked = false,
  surface = 'light',
  label,
  className,
}: {
  tier: Tier
  size?: keyof typeof MEDAL_SIZES
  locked?: boolean
  /** What the medal sits on — a locked medal is drawn to blend into it. */
  surface?: 'light' | 'dark'
  /** Accessible name, e.g. the grade's name. */
  label?: string
  className?: string
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn('relative inline-grid shrink-0', MEDAL_SIZES[size], className)}
    >
      <span
        className={cn(
          'grid place-items-center rounded-full font-black tabular-nums',
          locked
            ? surface === 'dark'
              ? 'bg-white/8 text-white/45 ring-1 ring-white/15'
              : 'bg-field text-faint ring-1 ring-border'
            : tierClasses(tier),
        )}
      >
        {locked ? <LockIcon className="size-[45%]" /> : tier.level}
      </span>
      {tier.rank === 'crown' && !locked && (
        <CrownIcon
          className={cn(
            'absolute left-1/2 -translate-x-1/2 text-brand-yellow drop-shadow-[0_1px_1px_rgb(0_0_0/0.35)]',
            CROWN_SIZES[size],
          )}
        />
      )}
    </span>
  )
}

/**
 * Progress towards a tier, filled in that tier's material — the dealer
 * sees the colour they are about to earn, not a generic bar.
 */
export function TierProgress({
  tier,
  value,
  track = 'light',
  className,
}: {
  tier: Tier
  /** 0–100; values outside the range are clamped. */
  value: number
  track?: 'light' | 'dark'
  className?: string
}) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'h-2.5 overflow-hidden rounded-lg',
        track === 'dark' ? 'bg-white/12' : 'bg-line-strong',
        className,
      )}
    >
      <div
        className={cn('tier-fill tier-shine h-full rounded-lg', `tier-${tier.color}`)}
        style={{ width: `${String(clamped)}%` }}
      />
    </div>
  )
}
