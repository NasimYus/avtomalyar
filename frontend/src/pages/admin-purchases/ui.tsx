import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDealers } from '@/entities/dealer'
import { usePurchases, type Purchase } from '@/entities/purchase'
import { DeletePurchaseDialog, PurchaseFormDrawer } from '@/features/manage-purchase'
import { formatDate, formatMoney, formatMoneyWithUnit } from '@/shared/lib'
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  Pagination,
  PillGroup,
  Select,
  type Column,
} from '@/shared/ui'

const PER_PAGE = 20

/** First and last day of the current month, as API dates. */
function currentMonthRange(): { from: string; to: string } {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const year = now.getFullYear()
  const month = now.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  return {
    from: `${String(year)}-${pad(month + 1)}-01`,
    to: `${String(year)}-${pad(month + 1)}-${pad(lastDay)}`,
  }
}

export function AdminPurchasesPage() {
  const { t } = useTranslation()
  const { data: dealerPage } = useDealers({ per_page: 200 })
  const dealers = dealerPage?.items ?? []

  const thisMonth = currentMonthRange()
  const [dealerId, setDealerId] = useState<number | undefined>(undefined)
  const [dateFrom, setDateFrom] = useState<string>(thisMonth.from)
  const [dateTo, setDateTo] = useState<string>(thisMonth.to)
  const [page, setPage] = useState(1)

  const { data, isPending } = usePurchases({
    dealer_id: dealerId,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
    per_page: PER_PAGE,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Purchase | undefined>(undefined)
  const [deleting, setDeleting] = useState<Purchase | undefined>(undefined)

  const dealerName = (id: number) => dealers.find((dealer) => dealer.id === id)?.full_name ?? '—'

  const resetFilters = () => {
    setDealerId(undefined)
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const columns: Column<Purchase>[] = [
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
      width: '1.5fr',
      render: (purchase) => <b className="block truncate">{dealerName(purchase.dealer_id)}</b>,
    },
    {
      key: 'comment',
      header: t('purchases.columnComment'),
      width: '1.5fr',
      render: (purchase) => (
        <span className="block truncate text-muted">{purchase.comment ?? '—'}</span>
      ),
    },
    {
      key: 'amount',
      header: t('purchases.columnAmount'),
      width: '130px',
      align: 'right',
      render: (purchase) => <b>{formatMoney(purchase.amount)}</b>,
    },
    {
      key: 'actions',
      header: '',
      width: '190px',
      align: 'right',
      render: (purchase) => (
        <div className="flex justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            className="bg-field"
            onClick={() => {
              setEditing(purchase)
              setFormOpen(true)
            }}
          >
            {t('common.edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDeleting(purchase)
            }}
          >
            {t('common.delete')}
          </Button>
        </div>
      ),
    },
  ]

  const purchases = data?.items ?? []
  const hasFilters = dealerId !== undefined || dateFrom !== '' || dateTo !== ''

  return (
    <>
      <PageHeader
        title={t('nav.purchases')}
        actions={
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            {t('purchases.add')}
          </Button>
        }
      />

      <PillGroup>
        <Select
          className="w-auto rounded-card border-transparent bg-surface py-3 font-bold"
          value={dealerId ?? ''}
          onChange={(event) => {
            setDealerId(event.target.value === '' ? undefined : Number(event.target.value))
            setPage(1)
          }}
        >
          <option value="">{t('purchases.allDealers')}</option>
          {dealers.map((dealer) => (
            <option key={dealer.id} value={dealer.id}>
              {dealer.full_name}
            </option>
          ))}
        </Select>

        <label className="flex items-center gap-2 rounded-card bg-surface px-4 py-2 text-sm font-bold">
          {t('purchases.from')}
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value)
              setPage(1)
            }}
            className="bg-transparent font-semibold focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2 rounded-card bg-surface px-4 py-2 text-sm font-bold">
          {t('purchases.to')}
          <input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value)
              setPage(1)
            }}
            className="bg-transparent font-semibold focus:outline-none"
          />
        </label>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            {t('common.reset')}
          </Button>
        )}
      </PillGroup>

      <Card padded={false} className="flex items-baseline justify-between px-[22px] py-4.5">
        <span className="text-[13px] font-semibold text-muted">
          {t('purchases.periodTotal', { count: data?.total ?? 0 })}
        </span>
        <b className="text-[22px] whitespace-nowrap">
          {formatMoneyWithUnit(data?.total_amount ?? 0)}
        </b>
      </Card>

      <DataTable
        columns={columns}
        rows={purchases}
        rowKey={(purchase) => purchase.id}
        loading={isPending}
        empty={
          <EmptyState
            title={hasFilters ? t('common.notFound') : t('purchases.emptyTitle')}
            description={hasFilters ? t('common.notFoundHint') : t('purchases.emptyDescription')}
            action={
              hasFilters ? (
                <Button variant="secondary" size="sm" className="bg-field" onClick={resetFilters}>
                  {t('common.reset')}
                </Button>
              ) : undefined
            }
          />
        }
      />

      {data !== undefined && data.total > PER_PAGE && (
        <Card padded={false} className="px-[22px] pb-4">
          <Pagination
            page={data.page}
            perPage={data.per_page}
            total={data.total}
            onPageChange={setPage}
            renderSummary={(from, to, total) => t('common.paginationSummary', { from, to, total })}
          />
        </Card>
      )}

      <PurchaseFormDrawer
        open={formOpen}
        purchase={editing}
        onClose={() => {
          setFormOpen(false)
        }}
      />
      <DeletePurchaseDialog
        purchase={deleting}
        dealerName={deleting ? dealerName(deleting.dealer_id) : undefined}
        onClose={() => {
          setDeleting(undefined)
        }}
      />
    </>
  )
}
