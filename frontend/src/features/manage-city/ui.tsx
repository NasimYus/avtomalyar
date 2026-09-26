import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useCreateCity, useDeleteCity, useUpdateCity, type City } from '@/entities/city'
import { ApiError, apiErrorMessage } from '@/shared/api'
import { Button, ConfirmDialog, Drawer, FormField, Input, useToast } from '@/shared/ui'
import { useLocaleName } from '@/shared/lib'

const schema = z.object({
  name_ru: z.string().trim().min(1),
  name_tg: z.string().trim().min(1),
})

type FormValues = z.infer<typeof schema>

interface CityFormDrawerProps {
  open: boolean
  /** Undefined means "create a new city". */
  city?: City
  onClose: () => void
}

/**
 * Mounts the form only while the drawer is open, so it always starts
 * from the city being edited without resetting state from an effect.
 */
export function CityFormDrawer({ open, city, onClose }: CityFormDrawerProps) {
  if (!open) return null
  return <CityForm city={city} onClose={onClose} />
}

function CityForm({ city, onClose }: { city?: City; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const create = useCreateCity()
  const update = useUpdateCity()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name_ru: city?.name_ru ?? '', name_tg: city?.name_tg ?? '' },
  })

  const pending = create.isPending || update.isPending

  const onSubmit = handleSubmit((values) => {
    const onSuccess = () => {
      toast.success(city ? t('cities.updated') : t('cities.created'))
      onClose()
    }
    const onError = (error: Error) => {
      toast.error(apiErrorMessage(error, t))
    }

    if (city) {
      update.mutate({ id: city.id, ...values }, { onSuccess, onError })
    } else {
      create.mutate(values, { onSuccess, onError })
    }
  })

  return (
    <Drawer
      open
      onClose={onClose}
      title={city ? t('cities.editTitle') : t('cities.createTitle')}
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
          label={t('cities.nameRu')}
          message={errors.name_ru ? t('errors.required') : undefined}
        >
          {({ id, status }) => <Input id={id} status={status} autoFocus {...register('name_ru')} />}
        </FormField>

        <FormField
          label={t('cities.nameTg')}
          message={errors.name_tg ? t('errors.required') : undefined}
        >
          {({ id, status }) => <Input id={id} status={status} {...register('name_tg')} />}
        </FormField>
      </form>
    </Drawer>
  )
}

export function DeleteCityDialog({ city, onClose }: { city?: City; onClose: () => void }) {
  const { t } = useTranslation()
  const localName = useLocaleName()
  const toast = useToast()
  const remove = useDeleteCity()

  return (
    <ConfirmDialog
      open={city !== undefined}
      title={t('cities.deleteTitle', { name: city ? localName(city.name_ru, city.name_tg) : '' })}
      description={t('cities.deleteDescription')}
      confirmLabel={t('common.delete')}
      cancelLabel={t('common.cancel')}
      destructive
      busy={remove.isPending}
      onCancel={onClose}
      onConfirm={() => {
        if (!city) return
        remove.mutate(city.id, {
          onSuccess: () => {
            toast.success(t('cities.deleted'))
            onClose()
          },
          onError: (error) => {
            // 409 means dealers still reference the city — the API
            // explains why in its message.
            toast.error(
              error instanceof ApiError && error.isConflict
                ? t('cities.deleteConflict')
                : apiErrorMessage(error, t),
            )
            onClose()
          },
        })
      }}
    />
  )
}
