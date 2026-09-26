import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { cn, formatDate, formatMoney, todayISO, useLocaleName } from '@/shared/lib'
import { Badge, Card, LockIcon } from '@/shared/ui'
import {
  cabinetStage,
  isFinished,
  isUpcoming,
  type CabinetPromotion,
  type CabinetRequirement,
} from './model'

/**
 * Medals for the three prize places, in the same metals the grade badges
 * use. Everything below the podium is a plain number, so the places worth
 * chasing stand out at a glance.
 */
const MEDALS: Record<number, string> = {
  1: 'bg-grade-gold text-ink shadow-glow-gold',
  2: 'bg-grade-silver text-ink',
  3: 'bg-grade-bronze text-ink',
}

export function PlaceMedal({ place, size = 'sm' }: { place: number; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-black',
        size === 'md' ? 'size-10 text-[17px]' : 'size-7 text-[13px]',
        MEDALS[place] ?? 'text-faint',
      )}
    >
      {place}
    </span>
  )
}

const STAGE_TONES = {
  running: 'success',
  awaiting: 'warning',
  published: 'dark',
  archived: 'neutral',
} as const

/**
 * The conditions still in the way, spelled out as what the dealer has to
 * do. Conditions they already meet are left out — this is a to-do list,
 * not a checklist.
 */
export function RequirementList({ requirements }: { requirements: CabinetRequirement[] }) {
  const unmet = requirements.filter((requirement) => !requirement.met)
  if (unmet.length === 0) return null

  return (
    <ul className="grid gap-1.5">
      {unmet.map((requirement) => (
        <RequirementLine key={requirement.kind} requirement={requirement} />
      ))}
    </ul>
  )
}

function RequirementLine({ requirement }: { requirement: CabinetRequirement }) {
  const { t } = useTranslation()
  const name = useLocaleName()

  const text =
    requirement.kind === 'purchases'
      ? t('cabinet.needPurchases', { amount: formatMoney(requirement.remaining ?? 0) })
      : t(requirement.kind === 'city' ? 'cabinet.needCity' : 'cabinet.needGrade', {
          value: name(requirement.name_ru ?? '', requirement.name_tg),
        })

  return (
    <li className="flex items-start gap-2 text-[13px] font-semibold text-muted">
      <LockIcon className="mt-px size-4 shrink-0 text-brand-red" />
      {text}
    </li>
  )
}

/**
 * A promotion as it appears in the dealer's list. It has three faces: a
 * contest the dealer is in shows where they stand, one that has not
 * started shows when it will, and one whose conditions are unmet shows
 * what is still in the way.
 */
export function PromotionCard({ promotion }: { promotion: CabinetPromotion }) {
  const { t } = useTranslation()
  const name = useLocaleName()
  const today = todayISO()
  const stage = cabinetStage(promotion.status, promotion.end_date, today)
  const upcoming = isUpcoming(promotion, today)
  // Wording differs once the results are in: a place the dealer *took*,
  // not the one they hold right now.
  const finished = isFinished(promotion)
  const standing = promotion.standing
  const unmet = promotion.requirements.filter((requirement) => !requirement.met)

  return (
    <Link to={`/me/promotions/${String(promotion.id)}`} className="block">
      <Card className="transition-shadow hover:shadow-modal">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <b className="block text-[17px] leading-tight">
              {name(promotion.title_ru, promotion.title_tg)}
            </b>
            <span className="mt-1 block text-xs font-semibold text-muted">
              {formatDate(promotion.start_date)} — {formatDate(promotion.end_date)}
            </span>
          </div>
          <Badge tone={upcoming ? 'warning' : STAGE_TONES[stage]}>
            {upcoming ? t('cabinet.soon') : t(`cabinet.stage.${stage}`)}
          </Badge>
        </div>

        {unmet.length > 0 ? (
          <div className="mt-3.5 border-t border-line pt-3.5">
            <RequirementList requirements={promotion.requirements} />
          </div>
        ) : upcoming ? (
          <p className="mt-3.5 border-t border-line pt-3.5 text-[13px] font-semibold text-muted">
            {t('cabinet.startsOn', { date: formatDate(promotion.start_date) })}
          </p>
        ) : standing ? (
          <div className="mt-3.5 flex items-end justify-between gap-3 border-t border-line pt-3.5">
            <div className="min-w-0">
              <span className="block text-[13px] font-semibold text-muted">
                {finished ? t('cabinet.yourPlace') : t('cabinet.yourPlaceNow')}
              </span>
              <b className="mt-1 block text-[22px] leading-none text-brand-red">
                {t('cabinet.placeOf', {
                  place: standing.place,
                  total: promotion.participants_count,
                })}
              </b>
            </div>
            <span className="shrink-0 text-[13px] font-semibold text-muted">
              {formatMoney(standing.period_total)} {t('common.somoni')}
            </span>
          </div>
        ) : (
          <p className="mt-3.5 border-t border-line pt-3.5 text-[13px] font-semibold text-muted">
            {t('cabinet.awaitingResults')}
          </p>
        )}

        {standing?.prize_name_ru !== undefined && (
          <p className="mt-2 text-[13px] font-bold">
            {finished ? t('cabinet.prizeWon') : t('cabinet.prizeNow')}:{' '}
            {name(standing.prize_name_ru, standing.prize_name_tg)}
          </p>
        )}
      </Card>
    </Link>
  )
}
