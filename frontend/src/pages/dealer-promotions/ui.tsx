import { useTranslation } from 'react-i18next'
import { PromotionCard, splitPromotions, useMyPromotions } from '@/entities/cabinet'
import { todayISO } from '@/shared/lib'
import { CardTitle, EmptyState, Skeleton } from '@/shared/ui'

export function DealerPromotionsPage() {
  const { t } = useTranslation()
  const { data: promotions } = useMyPromotions()
  const { current, ahead, archive } = splitPromotions(promotions ?? [], todayISO())

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
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
                {current.map((promotion) => (
                  <PromotionCard key={promotion.id} promotion={promotion} />
                ))}
              </div>
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
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
                {ahead.map((promotion) => (
                  <PromotionCard key={promotion.id} promotion={promotion} />
                ))}
              </div>
            </section>
          )}

          {/* Finished promotions with announced results — the archive (ToR 6). */}
          {archive.length > 0 && (
            <section className="flex flex-col gap-3">
              <div>
                <CardTitle>{t('cabinet.archiveTitle')}</CardTitle>
                <p className="mt-0.5 text-[13px] font-semibold text-muted">
                  {t('cabinet.archiveDescription')}
                </p>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
                {archive.map((promotion) => (
                  <PromotionCard key={promotion.id} promotion={promotion} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  )
}
