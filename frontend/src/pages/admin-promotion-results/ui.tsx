import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import {
  statusTone,
  useCalculatePromotion,
  usePromotion,
  usePromotionResults,
  type PromotionResult,
  type PromotionStatus,
} from '@/entities/promotion'
import { AdjustResultModal, PublishResultsCard } from '@/features/manage-promotion-results'
import { ApiError } from '@/shared/api'
import { cn, formatDate, formatDateTime, formatMoney, todayISO } from '@/shared/lib'
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  IconButton,
  PageHeader,
  PencilIcon,
  Spinner,
  useToast,
  type Column,
} from '@/shared/ui'

/** The steps the design shows above the ranking. */
const STEPS = ['period', 'calculate', 'review', 'publish'] as const

/** Which step a promotion is on, so the stepper can mark progress. */
function currentStep(status: PromotionStatus, periodOver: boolean): number {
  if (status === 'published' || status === 'archived') return 3
  if (status === 'calculated') return 2
  return periodOver ? 1 : 0
}

export function AdminPromotionResultsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { id } = useParams()
  const promotionId = Number(id)

  const { data: promotion, isPending } = usePromotion(promotionId)
  const { data: results } = usePromotionResults(promotionId)
  const calculate = useCalculatePromotion()

  const [adjusting, setAdjusting] = useState<PromotionResult | undefined>(undefined)

  if (isPending || !promotion) {
    return (
      <Card className="grid place-items-center py-16">
        <Spinner />
      </Card>
    )
  }

  const periodOver = promotion.end_date < todayISO()
  const step = currentStep(promotion.status, periodOver)
  const canCalculate =
    periodOver && (promotion.status === 'active' || promotion.status === 'calculated')
  const canAdjust = promotion.status === 'calculated'

  const runCalculation = () => {
    calculate.mutate(promotionId, {
      onSuccess: (items) => {
        toast.success(t('results.calculated', { count: items.length }))
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : t('errors.generic'))
      },
    })
  }

  const columns: Column<PromotionResult>[] = [
    {
      key: 'place',
      header: t('results.columnPlace'),
      width: '80px',
      render: (result) =>
        result.place_rank === undefined ? (
          <span className="text-faint">—</span>
        ) : (
          <b className={cn('text-[15px]', result.place_rank <= 3 && 'text-brand-red')}>
            {result.place_rank}
          </b>
        ),
    },
    {
      key: 'dealer',
      header: t('results.columnDealer'),
      width: '1.6fr',
      render: (result) => (
        <div className="flex min-w-0 items-center gap-2">
          <b className="truncate">{result.dealer_name}</b>
          {result.is_manually_adjusted && <Badge tone="warning">{t('results.adjustedMark')}</Badge>}
        </div>
      ),
    },
    {
      key: 'total',
      header: t('results.columnTotal'),
      width: '150px',
      align: 'right',
      render: (result) => <b>{formatMoney(result.period_total)}</b>,
    },
    {
      key: 'prize',
      header: t('results.columnPrize'),
      width: '1.2fr',
      render: (result) =>
        result.prize_name_ru === undefined ? (
          <span className="text-faint">—</span>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate">{result.prize_name_ru}</span>
            {result.awarded && <Badge tone="success">{t('results.awardedMark')}</Badge>}
          </div>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: '60px',
      align: 'right',
      render: (result) =>
        canAdjust ? (
          <IconButton
            label={t('results.adjust')}
            variant="ghost"
            onClick={() => {
              setAdjusting(result)
            }}
          >
            <PencilIcon />
          </IconButton>
        ) : null,
    },
  ]

  return (
    <>
      <PageHeader
        title={promotion.title_ru}
        actions={
          <>
            <Link to="/admin/promotions">
              <Button variant="secondary" className="bg-field">
                {t('results.back')}
              </Button>
            </Link>
            {canCalculate && (
              <Button disabled={calculate.isPending} onClick={runCalculation}>
                {calculate.isPending
                  ? t('common.loading')
                  : promotion.status === 'calculated'
                    ? t('results.recalculate')
                    : t('results.calculate')}
              </Button>
            )}
          </>
        }
      />

      <Card padded={false} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-[22px] py-4.5">
        <span className="text-[13px] font-semibold text-muted">
          {formatDate(promotion.start_date)} — {formatDate(promotion.end_date)}
        </span>
        <Badge tone={statusTone(promotion.status)}>
          {t(`promotions.status.${promotion.status}`)}
        </Badge>
        {promotion.published_at !== undefined && (
          <span className="text-[13px] font-semibold text-muted">
            {t('results.publishedAt', { date: formatDateTime(promotion.published_at) })}
          </span>
        )}
      </Card>

      <ol className="flex flex-wrap gap-2.5">
        {STEPS.map((name, index) => (
          <li
            key={name}
            className={cn(
              'flex items-center gap-2 rounded-card px-4 py-3 text-sm font-bold',
              index < step && 'bg-brand-green/10 text-brand-green',
              index === step && 'bg-ink text-white',
              index > step && 'bg-surface text-faint',
            )}
          >
            <span
              className={cn(
                'grid size-5 place-items-center rounded-full text-xs',
                index <= step ? 'bg-white/20' : 'bg-field',
              )}
            >
              {index + 1}
            </span>
            {t(`results.step.${name}`)}
          </li>
        ))}
      </ol>

      {!periodOver && promotion.status === 'active' && (
        <Card>
          <p className="text-[13px] font-semibold text-muted">{t('results.periodNotOver')}</p>
        </Card>
      )}

      <DataTable
        columns={columns}
        rows={results ?? []}
        rowKey={(result) => result.dealer_id}
        loading={results === undefined}
        empty={
          <EmptyState
            title={t('results.emptyTitle')}
            description={
              periodOver ? t('results.emptyDescription') : t('results.emptyDescriptionRunning')
            }
            action={
              canCalculate ? (
                <Button size="sm" disabled={calculate.isPending} onClick={runCalculation}>
                  {t('results.calculate')}
                </Button>
              ) : undefined
            }
          />
        }
      />

      {promotion.status === 'calculated' && <PublishResultsCard promotion={promotion} />}

      <AdjustResultModal
        promotionId={promotionId}
        result={adjusting}
        onClose={() => {
          setAdjusting(undefined)
        }}
      />
    </>
  )
}
