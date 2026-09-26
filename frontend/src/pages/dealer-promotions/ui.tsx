import { useTranslation } from 'react-i18next'
import { PromotionCard, splitPromotions, useMyPromotions } from '@/entities/cabinet'
import { todayISO } from '@/shared/lib'
import { CardTitle, EmptyState, Skeleton } from '@/shared/ui'

export function DealerPromotionsPage() {
  const { t } = useTranslation()
  const { data: promotions } = useMyPromotions()
  const { current, ahead } = splitPromotions(promotions ?? [], todayISO())

  return (
    <>
      <h1 className="text-[24px] font-black sm:text-[28px]">{t('cabinet.navPromotions')}</h1>

      {promotions === undefined ? (
        <Skeleton className="h-[260px]" />
      ) : promotions.length === 0 ? (
        <EmptyState
          title={t('cabinet.promotionsEmptyTitle')}
          description={t('cabinet.promotionsEmptyDescription')}
        />
      ) : (
        <>
          {current.length > 0 && (
            <section className="flex flex-col gap-3">
              <CardTitle>{t('cabinet.promotionsTitle')}</CardTitle>
              {current.map((promotion) => (
                <PromotionCard key={promotion.id} promotion={promotion} />
              ))}
            </section>
          )}

          {ahead.length > 0 && (
            <section className="flex flex-col gap-3">
              <div>
                <CardTitle>{t('cabinet.aheadTitle')}</CardTitle>
                <p className="mt-0.5 text-[13px] font-semibold text-muted">
                  {t('cabinet.aheadDescription')}
                </p>
              </div>
              {ahead.map((promotion) => (
                <PromotionCard key={promotion.id} promotion={promotion} />
              ))}
            </section>
          )}
        </>
      )}
    </>
  )
}
