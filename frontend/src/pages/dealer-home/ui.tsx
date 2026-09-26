import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  splitPromotions,
  useDealerProfile,
  useMyPromotions,
  useMyPurchases,
  GradeCard,
  GradeLadder,
  LevelUpCard,
  PromotionCard,
} from '@/entities/cabinet'
import { formatDate, formatMoney, todayISO, useLocaleName } from '@/shared/lib'
import { Card, CardTitle, EmptyState, Skeleton } from '@/shared/ui'

const RECENT_PURCHASES = 5

export function DealerHomePage() {
  const { t } = useTranslation()
  const name = useLocaleName()
  const { data: profile } = useDealerProfile()
  const { data: promotions } = useMyPromotions()
  const { data: purchases } = useMyPurchases(1, RECENT_PURCHASES)

  if (!profile) {
    return (
      <>
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[160px]" />
      </>
    )
  }

  const { current, ahead } = splitPromotions(promotions ?? [], todayISO())

  return (
    <>
      <div>
        <h1 className="text-[24px] leading-tight font-black sm:text-[28px]">{profile.full_name}</h1>
        <p className="mt-1 text-[13px] font-semibold text-muted">
          {name(profile.city_name_ru, profile.city_name_tg)}
        </p>
      </div>

      {/* One column on a phone; from lg the grade and the road ahead sit on
          the left, promotions and purchases on the right. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid content-start gap-4">
          <LevelUpCard profile={profile} />
          <GradeCard profile={profile} />
          <GradeLadder profile={profile} />
        </div>

        <div className="grid content-start gap-4">
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <CardTitle>{t('cabinet.promotionsTitle')}</CardTitle>
              <Link
                to="/me/promotions"
                className="text-[13px] font-bold text-brand-red hover:underline"
              >
                {t('cabinet.showAll')}
              </Link>
            </div>

            {promotions === undefined ? (
              <Skeleton className="h-[130px]" />
            ) : current.length === 0 ? (
              <EmptyState
                title={t('cabinet.promotionsEmptyTitle')}
                description={t('cabinet.promotionsEmptyDescription')}
              />
            ) : (
              current
                .slice(0, 2)
                .map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} />)
            )}
          </section>

          {/*
            What the dealer can aim at next: promotions that have not started
            and ones whose conditions they have not met. Hidden entirely when
            there is nothing ahead, rather than shown as an empty block.
          */}
          {ahead.length > 0 && (
            <section className="flex flex-col gap-3">
              <div>
                <CardTitle>{t('cabinet.aheadTitle')}</CardTitle>
                <p className="mt-0.5 text-[13px] font-semibold text-muted">
                  {t('cabinet.aheadDescription')}
                </p>
              </div>

              {ahead.slice(0, 3).map((promotion) => (
                <PromotionCard key={promotion.id} promotion={promotion} />
              ))}
            </section>
          )}

          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <CardTitle>{t('cabinet.recentPurchases')}</CardTitle>
              <Link
                to="/me/purchases"
                className="text-[13px] font-bold text-brand-red hover:underline"
              >
                {t('cabinet.showAll')}
              </Link>
            </div>

            {purchases === undefined ? (
              <Skeleton className="h-[140px]" />
            ) : purchases.items.length === 0 ? (
              <EmptyState
                title={t('cabinet.purchasesEmptyTitle')}
                description={t('cabinet.purchasesEmptyDescription')}
              />
            ) : (
              <Card padded={false} className="divide-y divide-line px-[18px]">
                {purchases.items.map((purchase) => (
                  <div key={purchase.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <b className="block">{formatDate(purchase.purchase_date)}</b>
                      {purchase.comment !== undefined && (
                        <span className="block truncate text-xs text-muted">
                          {purchase.comment}
                        </span>
                      )}
                    </div>
                    <b className="whitespace-nowrap">{formatMoney(purchase.amount)}</b>
                  </div>
                ))}
              </Card>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
