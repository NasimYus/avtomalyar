import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import {
  cabinetStage,
  isFinished,
  isUpcoming,
  ConditionList,
  PlaceMedal,
  useMyPromotion,
  type RankingEntry,
} from '@/entities/cabinet'
import { cn, formatDate, formatMoney, todayISO, useLocaleName } from '@/shared/lib'
import { Badge, Card, CardTitle, EmptyState, LockIcon, Skeleton, TrophyIcon } from '@/shared/ui'

const STAGE_TONES = {
  running: 'success',
  awaiting: 'warning',
  published: 'dark',
  archived: 'neutral',
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

  const today = todayISO()
  const stage = cabinetStage(promotion.status, promotion.end_date, today)
  const upcoming = isUpcoming(promotion, today)
  const finished = isFinished(promotion)

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
          <Badge tone={upcoming ? 'warning' : STAGE_TONES[stage]}>
            {upcoming ? t('cabinet.soon') : t(`cabinet.stage.${stage}`)}
          </Badge>
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

      {!promotion.eligible && (
        <Card>
          <div className="flex items-center gap-2">
            <LockIcon className="size-5 text-brand-red" />
            <CardTitle>{t('cabinet.lockedTitle')}</CardTitle>
          </div>
          <p className="mt-1 text-[13px] font-semibold text-muted">
            {t('cabinet.lockedDescription')}
          </p>
        </Card>
      )}

      {promotion.eligible && upcoming && (
        <Card>
          <p className="text-[13px] font-semibold text-muted">
            {t('cabinet.startsOn', { date: formatDate(promotion.start_date) })}
          </p>
        </Card>
      )}

      {promotion.standing !== undefined && (
        <Card tone="dark">
          <span className="text-[13px] font-semibold text-white/65">
            {finished ? t('cabinet.yourPlace') : t('cabinet.yourPlaceNow')}
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
              {finished ? t('cabinet.prizeWon') : t('cabinet.prizeNow')}:{' '}
              {name(promotion.standing.prize_name_ru, promotion.standing.prize_name_tg)}
            </p>
          )}
        </Card>
      )}

      {/*
        Every condition, met or not (ToR 6). A dealer who already
        qualifies still needs to know on what — the threshold they passed
        is the reason they are in the ranking at all.
      */}
      <section className="flex flex-col gap-3">
        <CardTitle>{t('cabinet.conditions')}</CardTitle>
        <Card>
          {promotion.requirements.length === 0 ? (
            <p className="text-[13px] font-semibold text-muted">{t('cabinet.conditionsNone')}</p>
          ) : (
            <ConditionList requirements={promotion.requirements} />
          )}
        </Card>
      </section>

      {promotion.prize_places !== undefined && promotion.prize_places.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <TrophyIcon className="size-5 text-brand-yellow-dark" />
            <CardTitle>{t('cabinet.prizes')}</CardTitle>
          </div>

          <div className="flex flex-col gap-2">
            {promotion.prize_places.map((place) => (
              <Card
                key={place.place_rank}
                padded={false}
                className={cn(
                  'flex items-center gap-3 p-3',
                  // The top prize is the one the whole promotion is about.
                  place.place_rank === 1 && 'bg-grade-gold/10 ring-2 ring-grade-gold',
                )}
              >
                <PlaceMedal place={place.place_rank} size="md" />

                {place.prize_photo_path !== undefined && (
                  <img
                    src={place.prize_photo_path}
                    alt=""
                    className="size-12 shrink-0 rounded-inner object-cover"
                    // A prize's photo can be replaced or removed after the
                    // promotion was set up; a broken image icon next to the
                    // top prize is worse than no picture at all.
                    onError={(event) => {
                      event.currentTarget.hidden = true
                    }}
                  />
                )}

                <div className="min-w-0">
                  <span className="block text-[11px] font-black tracking-[0.06em] text-muted uppercase">
                    {t('cabinet.place', { rank: place.place_rank })}
                  </span>
                  <b className="block truncate text-[15px]">
                    {name(place.prize_name_ru, place.prize_name_tg)}
                  </b>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {promotion.eligible && (
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
              description={
                upcoming
                  ? t('cabinet.emptyDescriptionRunning')
                  : t('cabinet.rankingPendingDescription')
              }
            />
          ) : (
            <Card padded={false} className="divide-y divide-line px-[18px]">
              {promotion.ranking.map((entry) => (
                <RankingRow key={entry.dealer_id} entry={entry} />
              ))}
            </Card>
          )}
        </section>
      )}
    </>
  )
}

function RankingRow({ entry }: { entry: RankingEntry }) {
  const { t } = useTranslation()
  const name = useLocaleName()

  return (
    <div className="relative flex items-center gap-3 py-3">
      {/*
        The dealer's own row is marked with an accent bar at the card's
        edge and a chip by their name. A filled background across the whole
        row reads as a block and fights with the medals beside it.
      */}
      {entry.is_me && (
        <span
          aria-hidden
          className="absolute inset-y-1 -left-[18px] w-1 rounded-r-full bg-brand-red"
        />
      )}

      <PlaceMedal place={entry.place} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <b className={cn('truncate', entry.is_me && 'font-black')}>{entry.dealer_name}</b>
          {entry.is_me && (
            <span className="shrink-0 rounded-chip bg-brand-red px-1.5 py-px text-[10px] font-black tracking-wide text-white uppercase">
              {t('cabinet.you')}
            </span>
          )}
        </div>
        {/* City, then the prize — the line ToR 4.7 asks the public ranking to show. */}
        <span className="block truncate text-xs font-semibold text-muted">
          {name(entry.city_name_ru, entry.city_name_tg)}
          {entry.prize_name_ru !== undefined &&
            ` · ${name(entry.prize_name_ru, entry.prize_name_tg)}`}
          {entry.awarded && ` · ${t('cabinet.awarded')}`}
        </span>
      </div>

      <b className="shrink-0 whitespace-nowrap">{formatMoney(entry.period_total)}</b>
    </div>
  )
}
