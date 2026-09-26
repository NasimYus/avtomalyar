import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useCreateGrade, useDeleteGrade, useUpdateGrade, type Grade } from '@/entities/grade'
import { ApiError, apiErrorMessage } from '@/shared/api'
import {
  TIER_COLORS,
  cn,
  formatMoney,
  isTierColor,
  parseMoneyInput,
  useLocaleName,
} from '@/shared/lib'
import { Button, ConfirmDialog, Drawer, FormField, FormNote, Input, useToast } from '@/shared/ui'

const schema = z.object({
  name_ru: z.string().trim().min(1),
  name_tg: z.string().trim().min(1),
  // Typed in somoni, sent in dirams.
  threshold: z.string().refine((value) => parseMoneyInput(value) !== null, 'invalid'),
  // A material from the palette, or '' for "by place in the ladder".
  color: z.string(),
})

type FormValues = z.infer<typeof schema>

interface GradeFormDrawerProps {
  open: boolean
  grade?: Grade
  onClose: () => void
}

/**
 * Mounts the form only while the drawer is open, so it always starts
 * from the grade being edited without resetting state from an effect.
 */
export function GradeFormDrawer({ open, grade, onClose }: GradeFormDrawerProps) {
  if (!open) return null
  return <GradeForm grade={grade} onClose={onClose} />
}

function GradeForm({ grade, onClose }: { grade?: Grade; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const create = useCreateGrade()
  const update = useUpdateGrade()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name_ru: grade?.name_ru ?? '',
      name_tg: grade?.name_tg ?? '',
      threshold: grade ? formatMoney(grade.min_purchase_amount) : '',
      color: isTierColor(grade?.color) ? grade.color : '',
    },
  })

  const pending = create.isPending || update.isPending

  const onSubmit = handleSubmit((values) => {
    const minPurchaseAmount = parseMoneyInput(values.threshold)
    if (minPurchaseAmount === null) return

    const payload = {
      name_ru: values.name_ru,
      name_tg: values.name_tg,
      min_purchase_amount: minPurchaseAmount,
      color: isTierColor(values.color) ? values.color : null,
    }

    const onSuccess = () => {
      toast.success(grade ? t('grades.updated') : t('grades.created'))
      onClose()
    }
    const onError = (error: Error) => {
      toast.error(
        error instanceof ApiError && error.isConflict
          ? t('grades.thresholdTaken')
          : apiErrorMessage(error, t),
      )
    }

    if (grade) {
      update.mutate({ id: grade.id, ...payload }, { onSuccess, onError })
    } else {
      create.mutate(payload, { onSuccess, onError })
    }
  })

  return (
    <Drawer
      open
      onClose={onClose}
      title={grade ? t('grades.editTitle') : t('grades.createTitle')}
      footer={
        <Button
          size="lg"
          fullWidth
          disabled={pending}
          onClick={() => {
            void onSubmit()
          }}
        >
          {pending ? t('common.loading') : t('common.save')}
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
          label={t('grades.nameRu')}
          message={errors.name_ru ? t('errors.required') : undefined}
        >
          {({ id, status }) => <Input id={id} status={status} autoFocus {...register('name_ru')} />}
        </FormField>

        <FormField
          label={t('grades.nameTg')}
          message={errors.name_tg ? t('errors.required') : undefined}
        >
          {({ id, status }) => <Input id={id} status={status} {...register('name_tg')} />}
        </FormField>

        <FormField
          label={t('grades.threshold')}
          message={errors.threshold ? t('grades.thresholdInvalid') : undefined}
        >
          {({ id, status }) => (
            <Input id={id} status={status} inputMode="decimal" {...register('threshold')} />
          )}
        </FormField>

        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-[13px] font-bold">{t('grades.color')}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(['', ...TIER_COLORS] as const).map((color) => (
              <label key={color || 'auto'} className="cursor-pointer">
                <input type="radio" value={color} className="peer sr-only" {...register('color')} />
                <span
                  className={cn(
                    'flex items-center gap-2 rounded-chip border-2 border-transparent bg-field px-3 py-2 text-[13px] font-bold',
                    'peer-checked:border-ink peer-checked:bg-surface',
                    'peer-focus-visible:outline-2 peer-focus-visible:outline-brand-red',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'size-5 shrink-0 rounded-full',
                      color === ''
                        ? // "Auto" previews the palette it picks from.
                          'bg-[conic-gradient(var(--color-tier-bronze),var(--color-tier-gold),var(--color-tier-emerald),var(--color-tier-sapphire),var(--color-tier-amethyst),var(--color-tier-ruby),var(--color-tier-bronze))]'
                        : `tier-${color} tier-surface`,
                    )}
                  />
                  {color === '' ? t('grades.colorAuto') : t(`grades.colors.${color}`)}
                </span>
              </label>
            ))}
          </div>
          <span className="text-xs font-medium text-muted">{t('grades.colorAutoHint')}</span>
        </fieldset>

        <FormNote>{t('grades.formNote')}</FormNote>
        <FormNote>{t('grades.colorNote')}</FormNote>
      </form>
    </Drawer>
  )
}

export function DeleteGradeDialog({ grade, onClose }: { grade?: Grade; onClose: () => void }) {
  const { t } = useTranslation()
  const localName = useLocaleName()
  const toast = useToast()
  const remove = useDeleteGrade()

  return (
    <ConfirmDialog
      open={grade !== undefined}
      title={t('grades.deleteTitle', {
        name: grade ? localName(grade.name_ru, grade.name_tg) : '',
      })}
      description={t('grades.deleteDescription')}
      confirmLabel={t('common.delete')}
      cancelLabel={t('common.cancel')}
      destructive
      busy={remove.isPending}
      onCancel={onClose}
      onConfirm={() => {
        if (!grade) return
        remove.mutate(grade.id, {
          onSuccess: () => {
            toast.success(t('grades.deleted'))
            onClose()
          },
          onError: (error) => {
            toast.error(apiErrorMessage(error, t))
            onClose()
          },
        })
      }}
    />
  )
}
