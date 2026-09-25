import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useDealers, type Dealer } from '@/entities/dealer'
import { useGrades } from '@/entities/grade'
import {
  useCreatePurchase,
  useDeletePurchase,
  useUpdatePurchase,
  type Purchase,
} from '@/entities/purchase'
import { ApiError } from '@/shared/api'
import { formatMoney, formatMoneyWithUnit, parseMoneyInput, todayISO } from '@/shared/lib'
import {
  Button,
  ConfirmDialog,
  Drawer,
  FormField,
  FormNote,
  Input,
  Select,
  Textarea,
  useToast,
} from '@/shared/ui'

const schema = z.object({
  dealer_id: z.string().min(1),
  amount: z.string().refine((value) => {
    const parsed = parseMoneyInput(value)
    return parsed !== null && parsed > 0
  }, 'invalid'),
  purchase_date: z.string().min(1),
  comment: z.string(),
})

type FormValues = z.infer<typeof schema>

interface PurchaseFormDrawerProps {
  open: boolean
  purchase?: Purchase
  /** Pre-selected dealer when adding from a dealer's context. */
  dealerId?: number
  onClose: () => void
}

export function PurchaseFormDrawer({ open, purchase, dealerId, onClose }: PurchaseFormDrawerProps) {
  if (!open) return null
  return <PurchaseForm purchase={purchase} dealerId={dealerId} onClose={onClose} />
}

function PurchaseForm({ purchase, dealerId, onClose }: Omit<PurchaseFormDrawerProps, 'open'>) {
  const { t } = useTranslation()
  const toast = useToast()
  const create = useCreatePurchase()
  const update = useUpdatePurchase()

  // Dealers are picked from a list; the admin panel is for one shop, so
  // the full list is small enough to load at once.
  const { data: dealerPage } = useDealers({ per_page: 200, is_active: true })
  const { data: grades = [] } = useGrades()
  const dealers = dealerPage?.items ?? []

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dealer_id: String(purchase?.dealer_id ?? dealerId ?? ''),
      amount: purchase ? formatMoney(purchase.amount) : '',
      purchase_date: purchase?.purchase_date ?? todayISO(),
      comment: purchase?.comment ?? '',
    },
  })

  const selectedDealerId = watch('dealer_id')
  const amountInput = watch('amount')
  const selected: Dealer | undefined = dealers.find(
    (dealer) => String(dealer.id) === selectedDealerId,
  )

  /** What this purchase will do to the dealer's total and grade. */
  const preview = (() => {
    if (!selected) return null
    const amount = parseMoneyInput(amountInput)
    if (amount === null || amount <= 0) return null

    const previousAmount = purchase?.dealer_id === selected.id ? purchase.amount : 0
    const newTotal = selected.lifetime_purchase_total - previousAmount + amount

    const sorted = [...grades].sort((a, b) => a.min_purchase_amount - b.min_purchase_amount)
    const currentGrade = sorted
      .filter((g) => g.min_purchase_amount <= selected.lifetime_purchase_total)
      .at(-1)
    const nextGrade = sorted.filter((g) => g.min_purchase_amount <= newTotal).at(-1)

    return {
      newTotal,
      gradeChange:
        nextGrade !== undefined && nextGrade.id !== currentGrade?.id ? nextGrade.name_ru : null,
    }
  })()

  const pending = create.isPending || update.isPending

  const onSubmit = handleSubmit((values) => {
    const amount = parseMoneyInput(values.amount)
    if (amount === null) return

    const payload = {
      dealer_id: Number(values.dealer_id),
      amount,
      purchase_date: values.purchase_date,
      comment: values.comment.trim() === '' ? null : values.comment.trim(),
    }

    const onSuccess = () => {
      toast.success(purchase ? t('purchases.updated') : t('purchases.created'))
      onClose()
    }
    const onError = (error: Error) => {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'))
    }

    if (purchase) {
      update.mutate({ id: purchase.id, ...payload }, { onSuccess, onError })
    } else {
      create.mutate(payload, { onSuccess, onError })
    }
  })

  return (
    <Drawer
      open
      onClose={onClose}
      title={purchase ? t('purchases.editTitle') : t('purchases.createTitle')}
      footer={
        <Button
          size="lg"
          fullWidth
          disabled={pending}
          onClick={() => {
            void onSubmit()
          }}
        >
          {pending ? t('common.loading') : t('purchases.save')}
        </Button>
      }
    >
      <form
        onSubmit={(event) => {
          void onSubmit(event)
        }}
        className="grid gap-4"
        noValidate
      >
        <FormField
          label={t('purchases.dealer')}
          message={errors.dealer_id ? t('errors.required') : undefined}
        >
          {({ id, status }) => (
            <Select id={id} status={status} {...register('dealer_id')}>
              <option value="">{t('purchases.selectDealer')}</option>
              {dealers.map((dealer) => (
                <option key={dealer.id} value={dealer.id}>
                  {dealer.full_name}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        {selected && (
          <FormNote>
            {t('purchases.dealerSummary', {
              total: formatMoneyWithUnit(selected.lifetime_purchase_total),
            })}
          </FormNote>
        )}

        <FormField
          label={t('purchases.amount')}
          message={errors.amount ? t('purchases.amountInvalid') : undefined}
        >
          {({ id, status }) => (
            <Input id={id} status={status} emphasis inputMode="decimal" {...register('amount')} />
          )}
        </FormField>

        <FormField
          label={t('purchases.date')}
          message={errors.purchase_date ? t('errors.required') : undefined}
        >
          {({ id, status }) => (
            <Input
              id={id}
              status={status}
              type="date"
              max={todayISO()}
              {...register('purchase_date')}
            />
          )}
        </FormField>

        <FormField label={t('purchases.comment')}>
          {({ id, status }) => (
            <Textarea
              id={id}
              status={status}
              rows={2}
              placeholder={t('common.optional')}
              {...register('comment')}
            />
          )}
        </FormField>

        {preview && (
          <FormNote tone="success">
            {t('purchases.previewTotal', { total: formatMoneyWithUnit(preview.newTotal) })}
            {preview.gradeChange !== null &&
              ` ${t('purchases.previewGrade', { grade: preview.gradeChange })}`}
          </FormNote>
        )}
      </form>
    </Drawer>
  )
}

export function DeletePurchaseDialog({
  purchase,
  dealerName,
  onClose,
}: {
  purchase?: Purchase
  dealerName?: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const remove = useDeletePurchase()

  return (
    <ConfirmDialog
      open={purchase !== undefined}
      title={t('purchases.deleteTitle')}
      description={t('purchases.deleteDescription', {
        dealer: dealerName ?? '',
        amount: purchase ? formatMoneyWithUnit(purchase.amount) : '',
      })}
      confirmLabel={t('common.delete')}
      cancelLabel={t('common.cancel')}
      destructive
      busy={remove.isPending}
      onCancel={onClose}
      onConfirm={() => {
        if (!purchase) return
        remove.mutate(purchase.id, {
          onSuccess: () => {
            toast.success(t('purchases.deleted'))
            onClose()
          },
          onError: () => {
            toast.error(t('errors.generic'))
            onClose()
          },
        })
      }}
    />
  )
}
