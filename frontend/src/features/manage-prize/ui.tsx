import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import {
  useCreatePrize,
  useDeletePrize,
  useUpdatePrize,
  useUploadPrizePhoto,
  type Prize,
} from '@/entities/prize'
import { ApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Button, ConfirmDialog, Drawer, FormField, Input, Textarea, useToast } from '@/shared/ui'

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const ACCEPTED_PHOTO_TYPES = 'image/jpeg,image/png,image/webp'

const schema = z.object({
  name_ru: z.string().trim().min(1),
  name_tg: z.string().trim().min(1),
  description_ru: z.string(),
  description_tg: z.string(),
  stock_quantity: z.string(),
})

type FormValues = z.infer<typeof schema>

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

interface PrizeFormDrawerProps {
  open: boolean
  prize?: Prize
  onClose: () => void
}

/**
 * Mounts the form only while the drawer is open, so it always starts from
 * the prize being edited (and a clean photo picker) without resetting
 * state from an effect.
 */
export function PrizeFormDrawer({ open, prize, onClose }: PrizeFormDrawerProps) {
  if (!open) return null
  return <PrizeForm prize={prize} onClose={onClose} />
}

function PrizeForm({ prize, onClose }: { prize?: Prize; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const create = useCreatePrize()
  const update = useUpdatePrize()
  const uploadPhoto = useUploadPrizePhoto()

  const fileInput = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name_ru: prize?.name_ru ?? '',
      name_tg: prize?.name_tg ?? '',
      description_ru: prize?.description_ru ?? '',
      description_tg: prize?.description_tg ?? '',
      stock_quantity: prize?.stock_quantity === undefined ? '' : String(prize.stock_quantity),
    },
  })

  const pending = create.isPending || update.isPending || uploadPhoto.isPending

  /** The photo is a separate endpoint, so it goes up after the prize itself. */
  const uploadPhotoIfPicked = (prizeId: number, done: () => void) => {
    if (!photo) {
      done()
      return
    }
    uploadPhoto.mutate(
      { id: prizeId, file: photo },
      {
        onSuccess: done,
        onError: () => {
          toast.error(t('prizes.photoFailed'))
          done()
        },
      },
    )
  }

  const onSubmit = handleSubmit((values) => {
    const payload = {
      name_ru: values.name_ru,
      name_tg: values.name_tg,
      description_ru: emptyToNull(values.description_ru),
      description_tg: emptyToNull(values.description_tg),
      stock_quantity: values.stock_quantity.trim() === '' ? null : Number(values.stock_quantity),
    }

    const finish = (created: boolean) => {
      toast.success(created ? t('prizes.created') : t('prizes.updated'))
      onClose()
    }
    const onError = (error: Error) => {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'))
    }

    if (prize) {
      update.mutate(
        { id: prize.id, ...payload },
        {
          onSuccess: (updated) => {
            uploadPhotoIfPicked(updated.id, () => {
              finish(false)
            })
          },
          onError,
        },
      )
    } else {
      create.mutate(payload, {
        onSuccess: (createdPrize) => {
          uploadPhotoIfPicked(createdPrize.id, () => {
            finish(true)
          })
        },
        onError,
      })
    }
  })

  const pickPhoto = (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(t('prizes.photoTooLarge'))
      setPhoto(null)
      return
    }
    setPhotoError(null)
    setPhoto(file)
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={prize ? t('prizes.editTitle') : t('prizes.createTitle')}
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
        <div className="grid gap-1.5">
          <span className="text-[13px] font-bold">{t('prizes.photo')}</span>
          <button
            type="button"
            onClick={() => {
              fileInput.current?.click()
            }}
            className={cn(
              'grid h-[140px] place-items-center rounded-[22px] border-2 border-dashed px-3 text-center',
              'text-xs font-semibold text-muted transition-colors hover:border-brand-red',
              photoError === null ? 'border-border-dashed' : 'border-brand-red',
            )}
          >
            {photo ? (
              <img
                src={URL.createObjectURL(photo)}
                alt=""
                className="h-[132px] w-full rounded-[18px] object-cover"
              />
            ) : prize?.photo_url !== undefined ? (
              <img
                src={prize.photo_url}
                alt=""
                className="h-[132px] w-full rounded-[18px] object-cover"
              />
            ) : (
              <span>{t('prizes.photoHint')}</span>
            )}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_PHOTO_TYPES}
            className="hidden"
            onChange={(event) => {
              pickPhoto(event.target.files?.[0])
            }}
          />
          {photoError !== null && (
            <span className="text-xs font-bold text-brand-red-dark">{photoError}</span>
          )}
        </div>

        <FormField
          label={t('prizes.nameRu')}
          message={errors.name_ru ? t('errors.required') : undefined}
        >
          {({ id, status }) => <Input id={id} status={status} {...register('name_ru')} />}
        </FormField>

        <FormField
          label={t('prizes.nameTg')}
          message={errors.name_tg ? t('errors.required') : undefined}
        >
          {({ id, status }) => <Input id={id} status={status} {...register('name_tg')} />}
        </FormField>

        <FormField label={t('prizes.descriptionRu')}>
          {({ id, status }) => (
            <Textarea
              id={id}
              status={status}
              rows={2}
              placeholder={t('common.optional')}
              {...register('description_ru')}
            />
          )}
        </FormField>

        <FormField label={t('prizes.descriptionTg')}>
          {({ id, status }) => (
            <Textarea
              id={id}
              status={status}
              rows={2}
              placeholder={t('common.optional')}
              {...register('description_tg')}
            />
          )}
        </FormField>

        <FormField label={t('prizes.stock')} hint={t('prizes.stockHint')}>
          {({ id, status }) => (
            <Input
              id={id}
              status={status}
              inputMode="numeric"
              placeholder={t('common.optional')}
              {...register('stock_quantity')}
            />
          )}
        </FormField>
      </form>
    </Drawer>
  )
}

export function DeletePrizeDialog({ prize, onClose }: { prize?: Prize; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const remove = useDeletePrize()

  return (
    <ConfirmDialog
      open={prize !== undefined}
      title={t('prizes.deleteTitle', { name: prize?.name_ru ?? '' })}
      description={t('prizes.deleteDescription')}
      confirmLabel={t('common.delete')}
      cancelLabel={t('common.cancel')}
      destructive
      busy={remove.isPending}
      onCancel={onClose}
      onConfirm={() => {
        if (!prize) return
        remove.mutate(prize.id, {
          onSuccess: () => {
            toast.success(t('prizes.deleted'))
            onClose()
          },
          onError: (error) => {
            toast.error(
              error instanceof ApiError && error.isConflict
                ? t('prizes.deleteConflict')
                : t('errors.generic'),
            )
            onClose()
          },
        })
      }}
    />
  )
}
