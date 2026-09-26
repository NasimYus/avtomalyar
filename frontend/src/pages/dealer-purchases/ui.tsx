import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMyPurchases } from '@/entities/cabinet'
import { formatDate, formatMoney, useMoneyWithUnit } from '@/shared/lib'
import { Card, EmptyState, Pagination, Skeleton } from '@/shared/ui'

const PER_PAGE = 20

export function DealerPurchasesPage() {
  const { t } = useTranslation()
  const money = useMoneyWithUnit()
  const [page, setPage] = useState(1)
  const { data } = useMyPurchases(page, PER_PAGE)

  return (
    <>
      <h1 className="text-[24px] font-black sm:text-[28px]">{t('cabinet.navPurchases')}</h1>

      <Card padded={false} className="flex items-baseline justify-between gap-3 px-[18px] py-4">
        <span className="text-[13px] font-semibold text-muted">
          {t('cabinet.purchasesTotal', { count: data?.total ?? 0 })}
        </span>
        <b className="text-[20px] whitespace-nowrap">{money(data?.total_amount ?? 0)}</b>
      </Card>

      {data === undefined ? (
        <Skeleton className="h-[200px]" />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={t('cabinet.purchasesEmptyTitle')}
          description={t('cabinet.purchasesEmptyDescription')}
        />
      ) : (
        <Card padded={false} className="divide-y divide-line px-[18px]">
          {data.items.map((purchase) => (
            <div key={purchase.id} className="flex items-center justify-between gap-3 py-3.5">
              <div className="min-w-0">
                <b className="block">{formatDate(purchase.purchase_date)}</b>
                {purchase.comment !== undefined && (
                  <span className="block truncate text-xs text-muted">{purchase.comment}</span>
                )}
              </div>
              <b className="whitespace-nowrap">{formatMoney(purchase.amount)}</b>
            </div>
          ))}
        </Card>
      )}

      {data !== undefined && data.total > PER_PAGE && (
        <Card padded={false} className="px-[18px] pb-3">
          <Pagination
            page={data.page}
            perPage={data.per_page}
            total={data.total}
            onPageChange={setPage}
            renderSummary={(from, to, total) => t('common.paginationSummary', { from, to, total })}
          />
        </Card>
      )}
    </>
  )
}
