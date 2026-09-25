import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useCities } from '@/entities/city'
import {
  useCreateDealer,
  useDeleteDealer,
  useSetDealerActive,
  useUpdateDealer,
  type Dealer,
} from '@/entities/dealer'
import { ApiError } from '@/shared/api'
import { formatMoney, formatPhone, isPhoneComplete } from '@/shared/lib'
import {
  Button,
  ConfirmDialog,
  Drawer,
  FormField,
  FormNote,
  Input,
  PhoneInput,
  SearchableSelect,
  useToast,
} from '@/shared/ui'

const schema = z.object({
  full_name: z.string().trim().min(1),
  phone: z.string().refine(isPhoneComplete, 'incomplete'),
  city_id: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

interface DealerFormDrawerProps {
  open: boolean
  dealer?: Dealer
  onClose: () => void
  /** Called with the new dealer and their one-time password. */
  onCreated: (dealer: Dealer, password: string) => void
}

export function DealerFormDrawer({ open, dealer, onClose, onCreated }: DealerFormDrawerProps) {
  if (!open) return null
  return <DealerForm dealer={dealer} onClose={onClose} onCreated={onCreated} />
}

function DealerForm({ dealer, onClose, onCreated }: Omit<DealerFormDrawerProps, 'open'>) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: cities = [] } = useCities()
  const create = useCreateDealer()
  const update = useUpdateDealer()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: dealer?.full_name ?? '',
      phone: formatPhone(dealer?.phone ?? ''),
      city_id: dealer ? String(dealer.city_id) : '',
    },
  })

  const pending = create.isPending || update.isPending

  const onSubmit = handleSubmit((values) => {
    const payload = {
      full_name: values.full_name,
      phone: values.phone,
      city_id: Number(values.city_id),
    }

    const onError = (error: Error) => {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'))
    }

    if (dealer) {
      update.mutate(
        { id: dealer.id, ...payload },
        {
          onSuccess: () => {
            toast.success(t('dealers.updated'))
            onClose()
          },
          onError,
        },
      )
    } else {
      create.mutate(payload, {
        onSuccess: (created) => {
          onClose()
          onCreated(created, created.password)
        },
        onError,
      })
    }
  })

  return (
    <Drawer
      open
      onClose={onClose}
      title={dealer ? t('dealers.editTitle') : t('dealers.createTitle')}
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
          label={t('dealers.fullName')}
          message={errors.full_name ? t('errors.required') : undefined}
        >
          {({ id, status }) => (
            <Input
              id={id}
              status={status}
              autoFocus
              placeholder={t('dealers.fullNamePlaceholder')}
              {...register('full_name')}
            />
          )}
        </FormField>

        <FormField
          label={t('dealers.phone')}
          message={errors.phone ? t('dealers.phoneInvalid') : undefined}
        >
          {({ id, status }) => (
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <PhoneInput
                  id={id}
                  status={status}
                  placeholder="92 555 01 10"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          )}
        </FormField>

        <FormField
          label={t('dealers.city')}
          message={errors.city_id ? t('errors.required') : undefined}
        >
          {({ id, status }) => (
            <Controller
              control={control}
              name="city_id"
              render={({ field }) => (
                <SearchableSelect
                  id={id}
                  status={status}
                  value={field.value}
                  onChange={field.onChange}
                  options={cities.map((city) => ({
                    value: String(city.id),
                    label: city.name_ru,
                    hint: city.name_tg,
                  }))}
                  placeholder={t('dealers.selectCity')}
                  searchPlaceholder={t('common.searchCity')}
                  emptyText={t('common.notFound')}
                />
              )}
            />
          )}
        </FormField>

        {!dealer && <FormNote>{t('dealers.credentialsNote')}</FormNote>}
        {dealer && <FormNote>{t('dealers.loginNote', { login: dealer.login })}</FormNote>}
      </form>
    </Drawer>
  )
}

export function ToggleDealerActiveDialog({
  dealer,
  onClose,
}: {
  dealer?: Dealer
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const setActive = useSetDealerActive()
  const deactivating = dealer?.is_active === true
  const name = dealer?.full_name ?? ''

  return (
    <ConfirmDialog
      open={dealer !== undefined}
      title={
        deactivating ? t('dealers.deactivateTitle', { name }) : t('dealers.activateTitle', { name })
      }
      description={
        deactivating ? t('dealers.deactivateDescription') : t('dealers.activateDescription')
      }
      confirmLabel={deactivating ? t('dealers.deactivate') : t('dealers.activate')}
      cancelLabel={t('common.cancel')}
      destructive={deactivating}
      busy={setActive.isPending}
      onCancel={onClose}
      onConfirm={() => {
        if (!dealer) return
        setActive.mutate(
          { id: dealer.id, is_active: !dealer.is_active },
          {
            onSuccess: () => {
              toast.success(deactivating ? t('dealers.deactivated') : t('dealers.activated'))
              onClose()
            },
            onError: () => {
              toast.error(t('errors.generic'))
              onClose()
            },
          },
        )
      }}
    />
  )
}

export function DeleteDealerDialog({ dealer, onClose }: { dealer?: Dealer; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const remove = useDeleteDealer()

  // A dealer who has ever bought something can't be deleted — the API
  // refuses, so the dialog says upfront what will happen instead.
  const hasPurchases = (dealer?.lifetime_purchase_total ?? 0) > 0

  return (
    <ConfirmDialog
      open={dealer !== undefined}
      title={t('dealers.deleteTitle', { name: dealer?.full_name ?? '' })}
      description={
        hasPurchases
          ? t('dealers.deleteBlocked', {
              total: formatMoney(dealer?.lifetime_purchase_total ?? 0),
            })
          : t('dealers.deleteDescription')
      }
      confirmLabel={t('common.delete')}
      cancelLabel={hasPurchases ? t('common.close') : t('common.cancel')}
      destructive
      busy={remove.isPending}
      confirmDisabled={hasPurchases}
      onCancel={onClose}
      onConfirm={() => {
        if (!dealer) return
        remove.mutate(dealer.id, {
          onSuccess: () => {
            toast.success(t('dealers.deleted'))
            onClose()
          },
          onError: (error) => {
            toast.error(
              error instanceof ApiError && error.isConflict
                ? t('dealers.deleteConflict')
                : t('errors.generic'),
            )
            onClose()
          },
        })
      }}
    />
  )
}
