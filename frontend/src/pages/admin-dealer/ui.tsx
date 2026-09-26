import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { useCities } from '@/entities/city'
import { useDealer, useDealerPromotions, type DealerPromotion } from '@/entities/dealer'
import { useGrades } from '@/entities/grade'
import { usePurchases } from '@/entities/purchase'
import {
  DealerAccessDialog,
  DealerFormDrawer,
  ToggleDealerActiveDialog,
} from '@/features/manage-dealer'
import { formatDate, formatMoney, tierAt, useMoneyWithUnit, useLocaleName } from '@/shared/lib'
import {
  Badge,
  TierBadge,
  Button,
  Card,
  CardTitle,
  DataTable,
  EmptyState,
  KeyIcon,
  PageHeader,
  PencilIcon,
  PowerIcon,
  Skeleton,
  type Column,
} from '@/shared/ui'

const PURCHASES_SHOWN = 10

interface PurchaseRow {
  id: number
  amount: number
  purchase_date: string
  comment?: string
}

/**
 * The dealer's card (ToR 5.3): their details, their purchase history and
 * the promotions they take part in.
 */
export function AdminDealerPage() {
  const { t } = useTranslation()
  const localName = useLocaleName()
  const money = useMoneyWithUnit()
  const { id } = useParams()
  const dealerId = Number(id)

  const { data: dealer, isPending, isError } = useDealer(dealerId)
  const { data: cities } = useCities()
  const { data: grades } = useGrades()
  const { data: purchasePage } = usePurchases({
    dealer_id: dealerId,
    per_page: PURCHASES_SHOWN,
  })
  const { data: promotions } = useDealerPromotions(dealerId)

  const [formOpen, setFormOpen] = useState(false)
  const [access, setAccess] = useState(false)
  const [toggling, setToggling] = useState(false)

  if (isError) {
    return (
      <EmptyState
        title={t('dealers.missingTitle')}
        description={t('dealers.missingDescription')}
        action={
          <Link to="/admin/dealers">
            <Button variant="secondary" size="sm" className="bg-field">
              {t('dealers.backToList')}
            </Button>
          </Link>
        }
      />
    )
  }

  if (isPending) {
    return <Skeleton className="h-[320px] rounded-card" />
  }

  const city = cities?.find((item) => item.id === dealer.city_id)
  const gradeIndex = grades?.findIndex((item) => item.id === dealer.grade_id) ?? -1
  const grade = gradeIndex >= 0 ? grades?.[gradeIndex] : undefined

  const purchaseColumns: Column<PurchaseRow>[] = [
    {
      key: 'date',
      header: t('purchases.columnDate'),
      width: '120px',
      render: (purchase) => (
        <span className="text-muted">{formatDate(purchase.purchase_date)}</span>
      ),
    },
    {
      key: 'comment',
      header: t('purchases.columnComment'),
      width: '1fr',
      render: (purchase) => (
        <span className="block truncate text-muted">{purchase.comment ?? '—'}</span>
      ),
    },
    {
      key: 'amount',
      mobile: 'aside',
      header: t('purchases.columnAmount'),
      width: '140px',
      align: 'right',
      render: (purchase) => <b>{formatMoney(purchase.amount)}</b>,
    },
  ]

  return (
    <>
      <Link to="/admin/dealers" className="text-[13px] font-bold text-muted hover:text-ink">
        ← {t('dealers.backToList')}
      </Link>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {dealer.full_name}
            {!dealer.is_active && <Badge tone="danger">{t('dealers.inactive')}</Badge>}
            {grade !== undefined && grades !== undefined && (
              <TierBadge tier={tierAt(gradeIndex, grades.length, grade.color)}>
                {localName(grade.name_ru, grade.name_tg)}
              </TierBadge>
            )}
          </span>
        }
        actions={
          <>
            <Button
              variant="secondary"
              className="inline-flex items-center gap-1.5 bg-field"
              onClick={() => {
                setAccess(true)
              }}
            >
              <KeyIcon />
              {t('dealers.access')}
            </Button>
            <Button
              variant="secondary"
              className="inline-flex items-center gap-1.5 bg-field"
              onClick={() => {
                setToggling(true)
              }}
            >
              <PowerIcon />
              {dealer.is_active ? t('dealers.deactivate') : t('dealers.activate')}
            </Button>
            <Button
              className="inline-flex items-center gap-1.5"
              onClick={() => {
                setFormOpen(true)
              }}
            >
              <PencilIcon />
              {t('common.edit')}
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-3.5 min-[480px]:grid-cols-2 xl:grid-cols-4">
        <Card padded={false} className="px-[22px] py-5">
          <div className="text-xs font-bold tracking-[0.04em] text-muted uppercase">
            {t('dealers.columnTotal')}
          </div>
          <div className="mt-1.5 text-[26px] font-black whitespace-nowrap">
            {money(dealer.lifetime_purchase_total)}
          </div>
        </Card>
        <Card padded={false} className="px-[22px] py-5">
          <div className="text-xs font-bold tracking-[0.04em] text-muted uppercase">
            {t('dealers.columnCity')}
          </div>
          <div className="mt-1.5 text-[20px] font-black">
            {city ? localName(city.name_ru, city.name_tg) : '—'}
          </div>
        </Card>
        <Card padded={false} className="px-[22px] py-5">
          <div className="text-xs font-bold tracking-[0.04em] text-muted uppercase">
            {t('dealers.phone')}
          </div>
          <div className="mt-1.5 text-[20px] font-black whitespace-nowrap">{dealer.phone}</div>
        </Card>
        <Card padded={false} className="px-[22px] py-5">
          <div className="text-xs font-bold tracking-[0.04em] text-muted uppercase">
            {t('dealers.login')}
          </div>
          <div className="mt-1.5 truncate text-[20px] font-black">{dealer.login}</div>
        </Card>
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <CardTitle>{t('dealers.promotionsTitle')}</CardTitle>
        {promotions === undefined ? (
          <Skeleton className="h-[120px] rounded-card" />
        ) : promotions.length === 0 ? (
          <EmptyState
            title={t('dealers.promotionsEmptyTitle')}
            description={t('dealers.promotionsEmptyDescription')}
          />
        ) : (
          <Card padded={false} className="divide-y divide-line px-[22px]">
            {promotions.map((promotion) => (
              <PromotionRow key={promotion.id} promotion={promotion} />
            ))}
          </Card>
        )}
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <CardTitle>{t('dealers.purchasesTitle')}</CardTitle>
          <Link
            to={`/admin/purchases?dealer_id=${String(dealer.id)}`}
            className="text-[13px] font-bold text-brand-red hover:underline"
          >
            {t('dealers.allPurchases', { count: purchasePage?.total ?? 0 })}
          </Link>
        </div>
        <DataTable
          columns={purchaseColumns}
          rows={purchasePage?.items ?? []}
          rowKey={(purchase) => purchase.id}
          loading={purchasePage === undefined}
          empty={
            <EmptyState
              title={t('dealers.purchasesEmptyTitle')}
              description={t('dealers.purchasesEmptyDescription')}
            />
          }
        />
      </section>

      <DealerFormDrawer
        open={formOpen}
        dealer={dealer}
        onClose={() => {
          setFormOpen(false)
        }}
      />
      <DealerAccessDialog
        dealer={access ? dealer : undefined}
        onClose={() => {
          setAccess(false)
        }}
      />
      <ToggleDealerActiveDialog
        dealer={toggling ? dealer : undefined}
        onClose={() => {
          setToggling(false)
        }}
      />
    </>
  )
}

/** One promotion the dealer takes part in, with where they stand in it. */
function PromotionRow({ promotion }: { promotion: DealerPromotion }) {
  const { t } = useTranslation()
  const localName = useLocaleName()
  const standing = promotion.standing

  return (
    <Link
      to={`/admin/promotions/${String(promotion.id)}/results`}
      className="flex items-center gap-4 py-3.5"
    >
      <div className="min-w-0 flex-1">
        <b className="block truncate">{localName(promotion.title_ru, promotion.title_tg)}</b>
        <span className="block text-xs font-semibold text-muted">
          {formatDate(promotion.start_date)} — {formatDate(promotion.end_date)}
        </span>
      </div>

      {!promotion.eligible ? (
        <span className="shrink-0 text-[13px] font-semibold text-faint">
          {t('dealers.notParticipating')}
        </span>
      ) : standing === undefined ? (
        <span className="shrink-0 text-[13px] font-semibold text-muted">
          {t('dealers.awaitingResults')}
        </span>
      ) : (
        <>
          <span className="shrink-0 text-[13px] font-semibold text-muted">
            {formatMoney(standing.period_total)}
          </span>
          <b className="w-[86px] shrink-0 text-right text-[15px] text-brand-red">
            {t('dealers.placeOf', {
              place: standing.place,
              total: promotion.participants_count,
            })}
          </b>
        </>
      )}
    </Link>
  )
}
