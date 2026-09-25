import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePrizes } from '@/entities/prize'
import {
  useAdjustResult,
  usePublishPromotion,
  type Promotion,
  type PromotionResult,
} from '@/entities/promotion'
import { ApiError } from '@/shared/api'
import { formatMoneyWithUnit } from '@/shared/lib'
import {
  Button,
  ConfirmDialog,
  FormField,
  Input,
  Modal,
  SearchableSelect,
  useToast,
} from '@/shared/ui'

interface AdjustResultModalProps {
  promotionId: number
  result?: PromotionResult
  onClose: () => void
}

/**
 * Manual correction of one participant's outcome (ToR 4.5): the admin can
 * move a dealer to another place, swap their prize, take them off the
 * prize places entirely, or mark the prize as handed over.
 */
export function AdjustResultModal({ promotionId, result, onClose }: AdjustResultModalProps) {
  if (!result) return null
  return <AdjustResultForm promotionId={promotionId} result={result} onClose={onClose} />
}

function AdjustResultForm({
  promotionId,
  result,
  onClose,
}: {
  promotionId: number
  result: PromotionResult
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const adjust = useAdjustResult()
  const { data: prizes } = usePrizes()

  const [place, setPlace] = useState(
    result.place_rank === undefined ? '' : String(result.place_rank),
  )
  const [prizeId, setPrizeId] = useState(
    result.prize_id === undefined ? '' : String(result.prize_id),
  )
  const [awarded, setAwarded] = useState(result.awarded)

  const placeInvalid = place.trim() !== '' && !/^[1-9]\d*$/.test(place.trim())

  const save = () => {
    if (placeInvalid) return
    adjust.mutate(
      {
        id: promotionId,
        dealer_id: result.dealer_id,
        place_rank: place.trim() === '' ? null : Number(place),
        prize_id: prizeId === '' ? null : Number(prizeId),
        awarded,
      },
      {
        onSuccess: () => {
          toast.success(t('results.adjusted'))
          onClose()
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : t('errors.generic'))
        },
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      kicker={formatMoneyWithUnit(result.period_total)}
      title={result.dealer_name}
      footer={
        <>
          <Button variant="secondary" size="sm" className="bg-field" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" disabled={adjust.isPending || placeInvalid} onClick={save}>
            {adjust.isPending ? t('common.loading') : t('common.save')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <FormField
          label={t('results.place')}
          hint={t('results.placeHint')}
          message={placeInvalid ? t('results.placeInvalid') : undefined}
        >
          {({ id, status }) => (
            <Input
              id={id}
              status={status}
              inputMode="numeric"
              placeholder={t('results.noPlace')}
              value={place}
              onChange={(event) => {
                setPlace(event.target.value)
              }}
            />
          )}
        </FormField>

        <FormField label={t('results.prize')}>
          {({ id, status }) => (
            <SearchableSelect
              id={id}
              status={status}
              value={prizeId}
              onChange={setPrizeId}
              options={
                prizes?.map((prize) => ({ value: String(prize.id), label: prize.name_ru })) ?? []
              }
              placeholder={t('results.noPrize')}
              searchPlaceholder={t('common.search')}
              emptyText={t('common.notFound')}
              allOption={t('results.noPrize')}
            />
          )}
        </FormField>

        <label className="flex items-center gap-2.5 text-sm font-semibold">
          <input
            type="checkbox"
            checked={awarded}
            onChange={(event) => {
              setAwarded(event.target.checked)
            }}
            className="size-4 accent-brand-red"
          />
          {t('results.awarded')}
        </label>
      </div>
    </Modal>
  )
}

/**
 * The dark publication card from the design. Publishing freezes the
 * results, so it asks for confirmation first.
 */
export function PublishResultsCard({ promotion }: { promotion: Promotion }) {
  const { t } = useTranslation()
  const toast = useToast()
  const publish = usePublishPromotion()
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-night p-[22px] text-white shadow-glow-lg">
        <div className="min-w-0">
          <h2 className="text-[17px] font-extrabold">{t('results.publishTitle')}</h2>
          <p className="mt-1 text-[13px] font-semibold text-white/65">
            {t('results.publishDescription')}
          </p>
        </div>
        <Button
          size="lg"
          disabled={publish.isPending}
          onClick={() => {
            setConfirming(true)
          }}
        >
          {t('results.publish')}
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        title={t('results.publishConfirmTitle')}
        description={t('results.publishConfirmDescription')}
        confirmLabel={t('results.publish')}
        cancelLabel={t('common.cancel')}
        busy={publish.isPending}
        onCancel={() => {
          setConfirming(false)
        }}
        onConfirm={() => {
          publish.mutate(promotion.id, {
            onSuccess: () => {
              toast.success(t('results.published'))
              setConfirming(false)
            },
            onError: (error) => {
              toast.error(error instanceof ApiError ? error.message : t('errors.generic'))
              setConfirming(false)
            },
          })
        }}
      />
    </>
  )
}
