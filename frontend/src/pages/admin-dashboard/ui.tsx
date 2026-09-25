import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useDashboardSummary } from '@/entities/dashboard'
import { gradeToneByIndex } from '@/entities/grade'
import { usePurchases } from '@/entities/purchase'
import { cn, formatDate, formatMoney, formatMoneyWithUnit } from '@/shared/lib'
import {
  Card,
  CardTitle,
  DataTable,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
  type Column,
} from '@/shared/ui'

const RECENT_PURCHASES = 5

const GRADE_BAR_TONES: Record<string, string> = {
  bronze: 'bg-grade-bronze',
  silver: 'bg-grade-silver',
  gold: 'bg-grade-gold',
}

interface RecentPurchase {
  id: number
  dealer_name?: string
  amount: number
  purchase_date: string
}

export function AdminDashboardPage() {
  const { t } = useTranslation()
  const { data: summary, isPending } = useDashboardSummary()
  const { data: recent } = usePurchases({ per_page: RECENT_PURCHASES })
  const averagePurchase =
    summary && summary.period_count > 0
      ? Math.round(summary.period_amount / summary.period_count)
      : 0

  const dealersWithGrade = (summary?.grades ?? []).reduce(
    (sum, grade) => sum + grade.dealers_count,
    0,
  )

  const columns: Column<RecentPurchase>[] = [
    {
      key: 'date',
      header: t('purchases.columnDate'),
      width: '110px',
      render: (purchase) => (
        <span className="text-muted">{formatDate(purchase.purchase_date)}</span>
      ),
    },
    {
      key: 'dealer',
      header: t('purchases.columnDealer'),
      width: '1fr',
      render: (purchase) => <b className="block truncate">{purchase.dealer_name ?? '—'}</b>,
    },
    {
      key: 'amount',
      header: t('purchases.columnAmount'),
      width: '140px',
      align: 'right',
      render: (purchase) => <b>{formatMoney(purchase.amount)}</b>,
    },
  ]

  return (
    <>
      <PageHeader title={t('dashboard.title')} />

      {isPending && (
        <div className="grid grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-[124px] rounded-card" />
          ))}
        </div>
      )}

      {summary && (
        <>
          <section className="grid grid-cols-4 gap-3.5">
            <StatCard
              label={t('dashboard.dealers')}
              value={summary.dealers_total}
              note={t('dashboard.dealersActive', { count: summary.dealers_active })}
              noteTone="success"
            />
            <StatCard
              label={t('dashboard.periodPurchases')}
              value={formatMoney(summary.period_amount)}
              note={t('dashboard.periodCount', { count: summary.period_count })}
            />
            <StatCard
              label={t('dashboard.lifetimeTotal')}
              value={formatMoney(summary.lifetime_total)}
              note={t('common.somoni')}
            />
            <StatCard
              tone="dark"
              label={t('dashboard.averagePurchase')}
              value={formatMoney(averagePurchase)}
              note={t('dashboard.averageNote')}
              noteTone="gold"
            />
          </section>

          <div className="grid grid-cols-[1.4fr_1fr] gap-3.5">
            <Card>
              <div className="flex items-baseline justify-between">
                <CardTitle>{t('dashboard.recentPurchases')}</CardTitle>
                <Link to="/admin/purchases" className="text-[13px] font-bold text-brand-red">
                  {t('dashboard.allPurchases')}
                </Link>
              </div>
              <div className="mt-3">
                {recent && recent.items.length > 0 ? (
                  <DataTable
                    columns={columns}
                    rows={recent.items}
                    rowKey={(purchase) => purchase.id}
                    className="px-0 pt-0 pb-0"
                  />
                ) : (
                  <p className="py-4 text-[13px] text-muted">{t('dashboard.noPurchases')}</p>
                )}
              </div>
            </Card>

            <Card>
              <CardTitle>{t('dashboard.dealersByGrade')}</CardTitle>

              {summary.grades.length === 0 ? (
                <p className="mt-3 text-[13px] text-muted">{t('dashboard.noGrades')}</p>
              ) : (
                <>
                  <div className="mt-4.5 flex h-[18px] overflow-hidden rounded-[10px]">
                    {summary.grades.map((grade, index) => (
                      <span
                        key={grade.grade_id}
                        className={cn(
                          GRADE_BAR_TONES[gradeToneByIndex(index, summary.grades.length)],
                        )}
                        style={{
                          width:
                            dealersWithGrade === 0
                              ? `${String(100 / summary.grades.length)}%`
                              : `${String((grade.dealers_count / dealersWithGrade) * 100)}%`,
                        }}
                      />
                    ))}
                  </div>

                  <div className="mt-4 grid gap-2.5 text-sm">
                    {summary.grades.map((grade) => (
                      <div key={grade.grade_id} className="flex justify-between gap-3">
                        <span className="truncate font-semibold">
                          {grade.name_ru}
                          <span className="ml-1.5 text-xs text-muted">
                            {t('grades.from', {
                              amount: formatMoneyWithUnit(grade.min_purchase_amount),
                            })}
                          </span>
                        </span>
                        <b>{grade.dealers_count}</b>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>
        </>
      )}

      {!isPending && summary === undefined && (
        <EmptyState title={t('errors.generic')} description={t('errors.network')} />
      )}
    </>
  )
}
