import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  isEditable,
  statusTone,
  usePromotion,
  usePromotions,
  useStartPromotion,
  PROMOTION_STATUSES,
  type Promotion,
  type PromotionStatus,
} from '@/entities/promotion'
import {
  ArchivePromotionDialog,
  DeletePromotionDialog,
  PromotionFormDrawer,
} from '@/features/manage-promotion'
import { ApiError } from '@/shared/api'
import { formatDate, todayISO } from '@/shared/lib'
import {
  ArchiveIcon,
  Badge,
  Button,
  DataTable,
  EmptyState,
  FilterPill,
  IconButton,
  PageHeader,
  PencilIcon,
  PillGroup,
  TrashIcon,
  useToast,
  type Column,
} from '@/shared/ui'

export function AdminPromotionsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()

  const [status, setStatus] = useState<PromotionStatus | undefined>(undefined)
  const { data, isPending } = usePromotions(status)

  const [formOpen, setFormOpen] = useState(false)
  // The list carries no prize places, so the form loads the full promotion.
  const [editingId, setEditingId] = useState<number | undefined>(undefined)
  const { data: editing } = usePromotion(editingId)
  const [deleting, setDeleting] = useState<Promotion | undefined>(undefined)
  const [archiving, setArchiving] = useState<Promotion | undefined>(undefined)

  const start = useStartPromotion()
  const today = todayISO()

  const openForm = (promotion?: Promotion) => {
    setEditingId(promotion?.id)
    setFormOpen(true)
  }

  const startPromotion = (promotion: Promotion) => {
    start.mutate(promotion.id, {
      onSuccess: () => {
        toast.success(t('promotions.started'))
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : t('errors.generic'))
      },
    })
  }

  const columns: Column<Promotion>[] = [
    {
      key: 'title',
      header: t('promotions.columnTitle'),
      width: '1.8fr',
      render: (promotion) => (
        <div className="min-w-0">
          <b className="block truncate">{promotion.title_ru}</b>
          {promotion.description_ru !== undefined && (
            <span className="block truncate text-xs text-muted">{promotion.description_ru}</span>
          )}
        </div>
      ),
    },
    {
      key: 'period',
      header: t('promotions.columnPeriod'),
      width: '190px',
      render: (promotion) => (
        <span className="text-muted">
          {formatDate(promotion.start_date)} — {formatDate(promotion.end_date)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('promotions.columnStatus'),
      width: '150px',
      render: (promotion) => (
        <Badge tone={statusTone(promotion.status)}>
          {t(`promotions.status.${promotion.status}`)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '230px',
      align: 'right',
      render: (promotion) => (
        <div className="flex items-center justify-end gap-1.5">
          {promotion.status === 'draft' && (
            <Button
              variant="secondary"
              size="sm"
              className="bg-field"
              disabled={start.isPending}
              onClick={() => {
                startPromotion(promotion)
              }}
            >
              {t('promotions.start')}
            </Button>
          )}

          {promotion.status === 'active' && promotion.end_date < today && (
            <Button
              size="sm"
              onClick={() => {
                void navigate(`/admin/promotions/${String(promotion.id)}/results`)
              }}
            >
              {t('promotions.toResults')}
            </Button>
          )}

          {(promotion.status === 'calculated' || promotion.status === 'published') && (
            <Button
              variant="secondary"
              size="sm"
              className="bg-field"
              onClick={() => {
                void navigate(`/admin/promotions/${String(promotion.id)}/results`)
              }}
            >
              {t('promotions.viewResults')}
            </Button>
          )}

          {isEditable(promotion.status) && (
            <IconButton
              label={t('common.edit')}
              variant="ghost"
              onClick={() => {
                openForm(promotion)
              }}
            >
              <PencilIcon />
            </IconButton>
          )}

          {promotion.status === 'draft' ? (
            <IconButton
              label={t('common.delete')}
              variant="ghost"
              tone="danger"
              onClick={() => {
                setDeleting(promotion)
              }}
            >
              <TrashIcon />
            </IconButton>
          ) : (
            // Anything a dealer has already seen is archived, never
            // deleted, so the history holds.
            promotion.status !== 'archived' && (
              <IconButton
                label={t('promotions.archive')}
                variant="ghost"
                onClick={() => {
                  setArchiving(promotion)
                }}
              >
                <ArchiveIcon />
              </IconButton>
            )
          )}
        </div>
      ),
    },
  ]

  const promotions = data?.items ?? []

  return (
    <>
      <PageHeader
        title={t('nav.promotions')}
        actions={
          <Button
            onClick={() => {
              openForm()
            }}
          >
            {t('promotions.add')}
          </Button>
        }
      />

      <PillGroup>
        <FilterPill
          active={status === undefined}
          onClick={() => {
            setStatus(undefined)
          }}
        >
          {t('promotions.allStatuses')}
        </FilterPill>
        {PROMOTION_STATUSES.map((value) => (
          <FilterPill
            key={value}
            active={status === value}
            onClick={() => {
              setStatus(value)
            }}
          >
            {t(`promotions.status.${value}`)}
            <span className="ml-1.5 font-semibold opacity-60">{data?.counts[value] ?? 0}</span>
          </FilterPill>
        ))}
      </PillGroup>

      <DataTable
        columns={columns}
        rows={promotions}
        rowKey={(promotion) => promotion.id}
        loading={isPending}
        empty={
          <EmptyState
            title={status === undefined ? t('promotions.emptyTitle') : t('common.notFound')}
            description={
              status === undefined ? t('promotions.emptyDescription') : t('common.notFoundHint')
            }
          />
        }
      />

      <PromotionFormDrawer
        open={formOpen && (editingId === undefined || editing !== undefined)}
        promotion={editing}
        onClose={() => {
          setFormOpen(false)
          setEditingId(undefined)
        }}
      />
      <DeletePromotionDialog
        promotion={deleting}
        onClose={() => {
          setDeleting(undefined)
        }}
      />
      <ArchivePromotionDialog
        promotion={archiving}
        onClose={() => {
          setArchiving(undefined)
        }}
      />
    </>
  )
}
