import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { cn, formatDate, formatMoney, todayISO, useLocaleName } from '@/shared/lib'
import { Badge, Card } from '@/shared/ui'
import { cabinetStage, type CabinetPromotion } from './model'

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
} as const

/**
 * A promotion as it appears in the dealer's list: the period, what stage
 * it is at, and where the dealer currently stands in it.
 */
export function PromotionCard({ promotion }: { promotion: CabinetPromotion }) {
  const { t } = useTranslation()
  const name = useLocaleName()
  const stage = cabinetStage(promotion.status, promotion.end_date, todayISO())
  const standing = promotion.standing

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
          <Badge tone={STAGE_TONES[stage]}>{t(`cabinet.stage.${stage}`)}</Badge>
        </div>

        {standing ? (
          <div className="mt-3.5 flex items-end justify-between gap-3 border-t border-line pt-3.5">
            <div className="min-w-0">
              <span className="block text-[13px] font-semibold text-muted">
                {stage === 'published' ? t('cabinet.yourPlace') : t('cabinet.yourPlaceNow')}
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
            {stage === 'published' ? t('cabinet.prizeWon') : t('cabinet.prizeNow')}:{' '}
            {name(standing.prize_name_ru, standing.prize_name_tg)}
          </p>
        )}
      </Card>
    </Link>
  )
}
