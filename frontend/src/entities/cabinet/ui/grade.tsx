import { useEffect, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import {
  TIER_COLORS,
  cn,
  formatMoney,
  tierAt,
  tierOf,
  useLocaleName,
  useMoneyWithUnit,
  type Tier,
} from '@/shared/lib'
import {
  Badge,
  Button,
  Card,
  CardTitle,
  CheckIcon,
  TierMedal,
  TierProgress,
  TrophyIcon,
} from '@/shared/ui'
import {
  gradeProgress,
  isLevelUp,
  ladderIndex,
  ladderWindow,
  progressMood,
  seenGrade,
  type DealerProfile,
} from '../model'

/** The dealer's grade, or undefined without one. */
function currentTier(profile: DealerProfile): Tier | undefined {
  return tierOf(profile.ladder, profile.grade?.id)
}

/**
 * The cabinet's hero: the dealer's grade as a medal, their lifetime total
 * and the road to the next grade — the bar is painted in the colour they
 * are about to earn, and the cheer above it warms up as they get closer.
 */
export function GradeCard({ profile }: { profile: DealerProfile }) {
  const { t } = useTranslation()
  const name = useLocaleName()
  const money = useMoneyWithUnit()

  const total = profile.ladder.length
  const tier = currentTier(profile)
  const next = profile.next_grade
  const nextTier = tierOf(profile.ladder, next?.id)
  const progress = gradeProgress(profile)

  // The card glows faintly in the dealer's own material.
  const glow: CSSProperties | undefined = tier && {
    backgroundImage: 'radial-gradient(120% 90% at 100% 0%, var(--tier-glow), transparent 60%)',
  }

  return (
    <Card tone="dark" className={cn('overflow-hidden', tier && `tier-${tier.color}`)} style={glow}>
      <div className="flex items-center gap-4">
        <TierMedal
          // Without a grade the medal is the first one, still locked.
          tier={tier ?? tierAt(0, Math.max(total, 1), profile.ladder[0]?.color)}
          locked={tier === undefined}
          surface="dark"
          size="xl"
          label={profile.grade ? name(profile.grade.name_ru, profile.grade.name_tg) : undefined}
          className={cn(tier?.rank === 'crown' && 'mt-3')}
        />
        <div className="min-w-0">
          <div className="text-xs font-bold tracking-wide text-white/55 uppercase">
            {tier ? t('cabinet.levelOf', { level: tier.level, total }) : t('cabinet.yourGrade')}
          </div>
          <div
            className={cn(
              'line-clamp-2 leading-tight font-black',
              tier ? 'tier-text text-[26px]' : 'text-[20px] text-white/80',
            )}
          >
            {profile.grade
              ? name(profile.grade.name_ru, profile.grade.name_tg)
              : t('cabinet.noGrade')}
          </div>
        </div>
      </div>

      <div className="mt-5 text-[13px] font-semibold text-white/65">
        {t('cabinet.lifetimeTotal')}
      </div>
      <div className="mt-0.5 text-[32px] font-black">{money(profile.lifetime_purchase_total)}</div>

      {next !== undefined && nextTier !== undefined && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <b className="text-[15px] font-extrabold">
              {t(`cabinet.mood.${progressMood(progress)}`)}
            </b>
            <span className="text-[13px] font-extrabold text-white/80 tabular-nums">
              {Math.floor(progress)}%
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            {tier && <TierMedal tier={tier} size="sm" />}
            <TierProgress tier={nextTier} value={progress} track="dark" className="flex-1" />
            <TierMedal tier={nextTier} size="sm" label={name(next.name_ru, next.name_tg)} />
          </div>
          <p className="mt-2 text-[13px] font-semibold text-white/65">
            {t('cabinet.toNextGrade', {
              grade: name(next.name_ru, next.name_tg),
              amount: formatMoney(next.remaining),
            })}
          </p>
        </div>
      )}

      {next === undefined && tier !== undefined && (
        <div className="mt-3">
          <b className="text-[15px] font-extrabold">{t('cabinet.topTitle')}</b>
          <p className="mt-0.5 text-[13px] font-semibold text-white/65">{t('cabinet.topGrade')}</p>
        </div>
      )}
    </Card>
  )
}

type LadderRow = { kind: 'step'; index: number } | { kind: 'fold'; count: number; below: number }

/**
 * The ladder's rows from the summit down: the steps to show and, where a
 * long ladder is folded, a "N more" row standing in for the hidden ones.
 */
function ladderRows(shown: number[]): LadderRow[] {
  const rows: LadderRow[] = []
  let previous = -1
  for (const index of shown) {
    if (index - previous > 1) {
      rows.push({ kind: 'fold', count: index - previous - 1, below: previous })
    }
    rows.push({ kind: 'step', index })
    previous = index
  }
  return rows.reverse()
}

/**
 * The whole programme as a road: every grade from the summit down, the
 * ones behind the dealer ticked off, their own highlighted, the next one
 * in colour with what is left, the rest locked. The line between the
 * dealer's grade and the next fills up as they buy.
 *
 * A long ladder folds around the dealer — with the summit always in
 * sight — and unfolds on request.
 */
export function GradeLadder({ profile }: { profile: DealerProfile }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const total = profile.ladder.length
  if (total === 0) return null

  const current = ladderIndex(profile)
  const folded = ladderWindow(total, current)
  const shown = expanded ? profile.ladder.map((_, index) => index) : folded
  const rows = ladderRows(shown)

  return (
    <section className="flex flex-col gap-3">
      <div>
        <CardTitle>{t('cabinet.ladderTitle')}</CardTitle>
        <p className="mt-0.5 text-[13px] font-semibold text-muted">
          {t('cabinet.ladderDescription')}
        </p>
      </div>

      <Card padded={false} className="px-[18px] py-3">
        <ol>
          {rows.map((row, position) => {
            const last = position === rows.length - 1
            if (row.kind === 'fold') {
              return (
                <li key={`fold-${String(row.below)}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setExpanded(true)
                    }}
                    className="flex w-full items-center gap-3 py-1 text-left text-[13px] font-bold text-muted hover:text-ink"
                  >
                    <span aria-hidden className="flex w-10 justify-center self-stretch">
                      <span className="w-0 border-l-2 border-dashed border-line-strong" />
                    </span>
                    {t('cabinet.ladderHidden', { count: row.count })}
                  </button>
                </li>
              )
            }

            const below = rows[position + 1]
            return (
              <LadderStep
                key={profile.ladder[row.index].id}
                profile={profile}
                index={row.index}
                current={current}
                // The line runs down to the step below only when that step
                // is the very next one, not a fold.
                connector={last ? 'none' : below.kind === 'step' ? 'solid' : 'dashed'}
              />
            )
          })}
        </ol>

        {folded.length < total && (
          <button
            type="button"
            onClick={() => {
              setExpanded((value) => !value)
            }}
            className="mt-1 w-full rounded-chip py-2 text-[13px] font-bold text-brand-red hover:underline"
          >
            {expanded ? t('cabinet.ladderCollapse') : t('cabinet.ladderShowAll')}
          </button>
        )}
      </Card>
    </section>
  )
}

function LadderStep({
  profile,
  index,
  current,
  connector,
}: {
  profile: DealerProfile
  index: number
  current: number
  connector: 'none' | 'solid' | 'dashed'
}) {
  const { t } = useTranslation()
  const name = useLocaleName()
  const money = useMoneyWithUnit()

  const total = profile.ladder.length
  const step = profile.ladder[index]
  const tier = tierAt(index, total, step.color)
  const reached = index <= current
  const isCurrent = index === current
  const isNext = index === current + 1
  const isSummit = index === total - 1
  // The goals worth looking at keep their colour even while locked.
  const inSight = isNext || isSummit

  return (
    <li
      className={cn(
        'flex items-center gap-3 py-2',
        isCurrent && '-mx-2.5 rounded-inner bg-surface-muted px-2.5',
      )}
    >
      <span className="relative shrink-0">
        <TierMedal
          tier={tier}
          size="md"
          locked={!reached && !inSight}
          label={name(step.name_ru, step.name_tg)}
          className={cn(!reached && inSight && 'opacity-45 grayscale-[35%]')}
        />
        {connector !== 'none' && (
          <Connector
            tier={tier}
            dashed={connector === 'dashed'}
            // The segment below a step is climbed once the dealer holds
            // it; the one leading to the next grade fills up as they buy.
            fill={reached ? 100 : isNext ? gradeProgress(profile) : 0}
          />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className={cn('truncate text-[15px] font-extrabold', !reached && 'text-muted')}>
          {name(step.name_ru, step.name_tg)}
        </div>
        <div className="text-xs font-semibold text-faint">
          {t('grades.from', { amount: money(step.min_purchase_amount) })}
        </div>
        {isNext && profile.next_grade !== undefined && (
          <div className="mt-0.5 text-xs font-extrabold text-brand-red">
            {t('cabinet.ladderRemaining', { amount: formatMoney(profile.next_grade.remaining) })}
          </div>
        )}
      </div>

      <StepStatus reached={reached} isCurrent={isCurrent} isSummit={isSummit} />
    </li>
  )
}

function StepStatus({
  reached,
  isCurrent,
  isSummit,
}: {
  reached: boolean
  isCurrent: boolean
  isSummit: boolean
}) {
  const { t } = useTranslation()

  if (isCurrent) {
    return <Badge tone="dark">{t('cabinet.ladderCurrent')}</Badge>
  }
  if (reached) {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-brand-green">
        <CheckIcon className="size-4" />
        {t('cabinet.ladderReached')}
      </span>
    )
  }
  if (isSummit) {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-brand-yellow-dark">
        <TrophyIcon className="size-4" />
        {t('cabinet.ladderSummit')}
      </span>
    )
  }
  return null
}

/**
 * The line from a step's medal down to the step below: under the medal's
 * centre, across the two 8px row paddings that separate two medals.
 */
function Connector({ tier, fill, dashed }: { tier: Tier; fill: number; dashed: boolean }) {
  if (dashed) {
    return (
      <span
        aria-hidden
        className="absolute top-full left-[19px] h-4 w-0 border-l-2 border-dashed border-line-strong"
      />
    )
  }
  return (
    <span
      aria-hidden
      className="absolute top-full left-[19px] flex h-4 w-0.5 flex-col-reverse overflow-hidden rounded-full bg-line-strong"
    >
      <span
        className={cn('tier-fill w-full', `tier-${tier.color}`)}
        style={{ height: `${String(fill)}%` }}
      />
    </span>
  )
}

const STORAGE_PREFIX = 'avtomalyar.seenGrade.'

function readSeen(dealerId: number): string | undefined {
  try {
    return localStorage.getItem(STORAGE_PREFIX + String(dealerId)) ?? undefined
  } catch {
    // Private mode / blocked storage: no memory, so no celebration.
    return undefined
  }
}

function writeSeen(dealerId: number, value: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + String(dealerId), value)
  } catch {
    // Nothing to do — the next visit simply will not celebrate.
  }
}

/** Confetti pieces, laid out by index so every render draws the same. */
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 7) % 10) / 10,
  size: 6 + ((i * 5) % 5),
  color: TIER_COLORS[(i * 3) % TIER_COLORS.length],
  round: i % 3 === 0,
}))

/**
 * "New level!" — shown once when the dealer opens the cabinet on a higher
 * grade than last time. What was last seen is remembered per dealer in
 * the browser; a first visit only remembers, so nobody is congratulated
 * on the grade they already had.
 */
export function LevelUpCard({ profile }: { profile: DealerProfile }) {
  const { t } = useTranslation()
  const name = useLocaleName()
  // The grade seen when the cabinet was opened. Kept in state, not read
  // on every render, so a refetch that raises the grade mid-visit still
  // celebrates rather than being quietly remembered.
  const [seen, setSeen] = useState(() => readSeen(profile.id))
  const celebrate = isLevelUp(profile, seen)

  useEffect(() => {
    // Remember the grade unless a celebration is still on screen — that
    // one is remembered when it is closed.
    if (!celebrate) writeSeen(profile.id, seenGrade(profile))
  }, [celebrate, profile])

  const tier = currentTier(profile)
  if (!celebrate || !profile.grade || !tier) return null

  const close = () => {
    const value = seenGrade(profile)
    writeSeen(profile.id, value)
    setSeen(value)
  }

  return (
    <Card
      role="status"
      className={cn('animate-pop-in relative overflow-hidden text-center', `tier-${tier.color}`)}
      style={{
        backgroundImage: 'radial-gradient(90% 70% at 50% 0%, var(--tier-glow), transparent 70%)',
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-full">
        {CONFETTI.map((piece, i) => (
          <span
            key={i}
            className={cn(
              'animate-confetti tier-surface absolute top-0',
              `tier-${piece.color}`,
              piece.round ? 'rounded-full' : 'rounded-[2px]',
            )}
            style={{
              left: `${String(piece.left)}%`,
              width: piece.size,
              height: piece.round ? piece.size : piece.size * 1.6,
              animationDelay: `${String(piece.delay)}s`,
            }}
          />
        ))}
      </div>

      <div className="relative">
        <TierMedal
          tier={tier}
          size="xl"
          label={name(profile.grade.name_ru, profile.grade.name_tg)}
          className="animate-pop-in mx-auto mt-3"
        />
        <div className="mt-3 text-[22px] font-black">{t('cabinet.levelUpTitle')}</div>
        <p className="mt-1 text-sm font-semibold text-muted">
          {t('cabinet.levelUpText', {
            grade: name(profile.grade.name_ru, profile.grade.name_tg),
          })}
        </p>
        <Button className="mt-4" onClick={close}>
          {t('cabinet.levelUpClose')}
        </Button>
      </div>
    </Card>
  )
}
