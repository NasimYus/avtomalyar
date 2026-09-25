import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { cabinetStage, useMyPromotion, type RankingEntry } from '@/entities/cabinet'
import { cn, formatDate, formatMoney, todayISO, useLocaleName } from '@/shared/lib'
import { Badge, Card, CardTitle, EmptyState, Skeleton } from '@/shared/ui'

const STAGE_TONES = {
  running: 'success',
  awaiting: 'warning',
  published: 'dark',
} as const

export function DealerPromotionPage() {
  const { t } = useTranslation()
  const name = useLocaleName()
  const { id } = useParams()
  const { data: promotion, isError } = useMyPromotion(Number(id))

  if (isError) {
    return (
      <EmptyState
        title={t('cabinet.promotionMissingTitle')}
        description={t('cabinet.promotionMissingDescription')}
        action={
          <Link to="/me/promotions" className="text-[13px] font-bold text-brand-red">
            {t('cabinet.backToPromotions')}
          </Link>
        }
      />
    )
  }

  if (!promotion) {
    return <Skeleton className="h-[320px]" />
  }

  const stage = cabinetStage(promotion.status, promotion.end_date, todayISO())

  return (
    <>
      <Link to="/me/promotions" className="text-[13px] font-bold text-muted hover:text-ink">
        ← {t('cabinet.backToPromotions')}
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[24px] leading-tight font-black sm:text-[28px]">
            {name(promotion.title_ru, promotion.title_tg)}
          </h1>
          <Badge tone={STAGE_TONES[stage]}>{t(`cabinet.stage.${stage}`)}</Badge>
        </div>
        <p className="mt-1 text-[13px] font-semibold text-muted">
          {formatDate(promotion.start_date)} — {formatDate(promotion.end_date)}
        </p>
        {promotion.description_ru !== undefined && (
          <p className="mt-2 text-[13px] leading-[1.55] text-ink-soft">
            {name(promotion.description_ru, promotion.description_tg)}
          </p>
        )}
      </div>

      {promotion.standing !== undefined && (
        <Card tone="dark">
          <span className="text-[13px] font-semibold text-white/65">
            {stage === 'published' ? t('cabinet.yourPlace') : t('cabinet.yourPlaceNow')}
          </span>
          <div className="mt-1.5 text-[32px] font-black">
            {t('cabinet.placeOf', {
              place: promotion.standing.place,
              total: promotion.participants_count,
            })}
          </div>
          <p className="mt-1 text-[13px] font-semibold text-white/65">
            {t('cabinet.periodTotal', { amount: formatMoney(promotion.standing.period_total) })}
          </p>
          {promotion.standing.prize_name_ru !== undefined && (
            <p className="mt-2 text-[13px] font-bold text-brand-yellow">
              {stage === 'published' ? t('cabinet.prizeWon') : t('cabinet.prizeNow')}:{' '}
              {name(promotion.standing.prize_name_ru, promotion.standing.prize_name_tg)}
            </p>
          )}
        </Card>
      )}

      {promotion.prize_places !== undefined && promotion.prize_places.length > 0 && (
        <section className="flex flex-col gap-3">
          <CardTitle>{t('cabinet.prizes')}</CardTitle>
          <Card padded={false} className="divide-y divide-line px-[18px]">
            {promotion.prize_places.map((place) => (
              <div key={place.place_rank} className="flex items-center gap-3 py-3">
                <span className="w-[68px] shrink-0 text-[13px] font-bold text-muted">
                  {t('cabinet.place', { rank: place.place_rank })}
                </span>
                <b className="min-w-0 truncate">{name(place.prize_name_ru, place.prize_name_tg)}</b>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <CardTitle>{t('cabinet.ranking')}</CardTitle>
          {promotion.ranking.length > 0 && (
            <span className="text-xs font-semibold text-muted">
              {promotion.final ? t('cabinet.rankingFinal') : t('cabinet.rankingLive')}
            </span>
          )}
        </div>

        {promotion.ranking.length === 0 ? (
          <EmptyState
            title={t('cabinet.rankingPendingTitle')}
            description={t('cabinet.rankingPendingDescription')}
          />
        ) : (
          <Card padded={false} className="divide-y divide-line px-[18px]">
            {promotion.ranking.map((entry) => (
              <RankingRow key={entry.dealer_id} entry={entry} />
            ))}
          </Card>
        )}
      </section>
    </>
  )
}

function RankingRow({ entry }: { entry: RankingEntry }) {
  const { t } = useTranslation()
  const name = useLocaleName()

  return (
    <div
      className={cn(
        'flex items-center gap-3 py-3',
        // The dealer's own row is what they came for; it stays findable
        // in a list of a hundred. The highlight sits inside the card's
        // padding — bleeding it to the edges would widen the page.
        entry.is_me && 'rounded-inner bg-field px-2.5',
      )}
    >
      <span
        className={cn(
          'w-7 shrink-0 text-[15px] font-black',
          entry.place <= 3 ? 'text-brand-red' : 'text-faint',
        )}
      >
        {entry.place}
      </span>

      <div className="min-w-0 flex-1">
        <b className="block truncate">{entry.dealer_name}</b>
        {entry.prize_name_ru !== undefined && (
          <span className="block truncate text-xs font-semibold text-muted">
            {name(entry.prize_name_ru, entry.prize_name_tg)}
            {entry.awarded && ` · ${t('cabinet.awarded')}`}
          </span>
        )}
      </div>

      <b className="shrink-0 whitespace-nowrap">{formatMoney(entry.period_total)}</b>
    </div>
  )
}
