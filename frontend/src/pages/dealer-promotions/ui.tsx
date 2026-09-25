import { useTranslation } from 'react-i18next'
import { PromotionCard, useMyPromotions } from '@/entities/cabinet'
import { EmptyState, Skeleton } from '@/shared/ui'

export function DealerPromotionsPage() {
  const { t } = useTranslation()
  const { data: promotions } = useMyPromotions()

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
        promotions.map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} />)
      )}
    </>
  )
}
