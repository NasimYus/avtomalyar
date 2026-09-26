import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useCities } from '@/entities/city'
import { useGrades } from '@/entities/grade'
import { usePrizes } from '@/entities/prize'
import {
  useArchivePromotion,
  useCreatePromotion,
  useDeletePromotion,
  useSetPrizePlaces,
  useUpdatePromotion,
  type PrizePlaceInput,
  type Promotion,
} from '@/entities/promotion'
import { ApiError } from '@/shared/api'
import { formatMoney, parseMoneyInput } from '@/shared/lib'
import {
  Button,
  ConfirmDialog,
  Drawer,
  FormField,
  FormNote,
  IconButton,
  Input,
  SearchableSelect,
  Textarea,
  TrashIcon,
  useToast,
} from '@/shared/ui'

const schema = z
  .object({
    title_ru: z.string().trim().min(1),
    title_tg: z.string().trim().min(1),
    description_ru: z.string(),
    description_tg: z.string(),
    start_date: z.string().min(1),
    end_date: z.string().min(1),
    city_id: z.string(),
    grade_id: z.string(),
    min_lifetime_threshold: z.string(),
  })
  .refine((values) => values.end_date >= values.start_date, { path: ['end_date'] })
  .refine(
    (values) =>
      values.min_lifetime_threshold.trim() === '' ||
      parseMoneyInput(values.min_lifetime_threshold) !== null,
    { path: ['min_lifetime_threshold'] },
  )

type FormValues = z.infer<typeof schema>

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

interface PromotionFormDrawerProps {
  open: boolean
  promotion?: Promotion
  onClose: () => void
}

/**
 * Mounts the form only while the drawer is open, so it always starts from
 * the promotion being edited without resetting state from an effect.
 */
export function PromotionFormDrawer({ open, promotion, onClose }: PromotionFormDrawerProps) {
  if (!open) return null
  return <PromotionForm promotion={promotion} onClose={onClose} />
}

function PromotionForm({ promotion, onClose }: { promotion?: Promotion; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const create = useCreatePromotion()
  const update = useUpdatePromotion()
  const setPrizePlaces = useSetPrizePlaces()

  const { data: cities } = useCities()
  const { data: grades } = useGrades()
  const { data: prizes } = usePrizes()

  const [places, setPlaces] = useState<PrizePlaceInput[]>(
    promotion?.prize_places?.map((place) => ({
      place_rank: place.place_rank,
      prize_id: place.prize_id,
    })) ?? [],
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title_ru: promotion?.title_ru ?? '',
      title_tg: promotion?.title_tg ?? '',
      description_ru: promotion?.description_ru ?? '',
      description_tg: promotion?.description_tg ?? '',
      start_date: promotion?.start_date ?? '',
      end_date: promotion?.end_date ?? '',
      city_id: promotion?.city_id === undefined ? '' : String(promotion.city_id),
      grade_id: promotion?.grade_id === undefined ? '' : String(promotion.grade_id),
      min_lifetime_threshold:
        promotion?.min_lifetime_purchase_threshold === undefined
          ? ''
          : formatMoney(promotion.min_lifetime_purchase_threshold),
    },
  })

  const pending = create.isPending || update.isPending || setPrizePlaces.isPending

  const addPlace = () => {
    const firstPrize = prizes?.[0]
    if (!firstPrize) return
    const nextRank = places.reduce((max, place) => Math.max(max, place.place_rank), 0) + 1
    setPlaces([...places, { place_rank: nextRank, prize_id: firstPrize.id }])
  }

  const changePlacePrize = (index: number, prizeId: number) => {
    setPlaces(places.map((place, i) => (i === index ? { ...place, prize_id: prizeId } : place)))
  }

  const removePlace = (index: number) => {
    // Places stay consecutive: removing the third of four makes the last
    // one third, which is what an admin means by "one prize fewer".
    setPlaces(
      places.filter((_, i) => i !== index).map((place, i) => ({ ...place, place_rank: i + 1 })),
    )
  }

  const onSubmit = handleSubmit((values) => {
    const threshold = values.min_lifetime_threshold.trim()
    const payload = {
      title_ru: values.title_ru,
      title_tg: values.title_tg,
      description_ru: emptyToNull(values.description_ru),
      description_tg: emptyToNull(values.description_tg),
      start_date: values.start_date,
      end_date: values.end_date,
      city_id: values.city_id === '' ? null : Number(values.city_id),
      grade_id: values.grade_id === '' ? null : Number(values.grade_id),
      min_lifetime_purchase_threshold: threshold === '' ? null : parseMoneyInput(threshold),
    }

    const onError = (error: Error) => {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'))
    }

    // Prize places live behind their own endpoint, so they go up right
    // after the promotion itself.
    const savePlaces = (id: number, created: boolean) => {
      setPrizePlaces.mutate(
        { id, places },
        {
          onSuccess: () => {
            toast.success(created ? t('promotions.created') : t('promotions.updated'))
            onClose()
          },
          onError,
        },
      )
    }

    if (promotion) {
      update.mutate(
        { id: promotion.id, ...payload },
        {
          onSuccess: (saved) => {
            savePlaces(saved.id, false)
          },
          onError,
        },
      )
    } else {
      create.mutate(payload, {
        onSuccess: (saved) => {
          savePlaces(saved.id, true)
        },
        onError,
      })
    }
  })

  const prizeOptions =
    prizes?.map((prize) => ({ value: String(prize.id), label: prize.name_ru })) ?? []

  return (
    <Drawer
      open
      onClose={onClose}
      title={promotion ? t('promotions.editTitle') : t('promotions.createTitle')}
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
          label={t('promotions.titleRu')}
          message={errors.title_ru ? t('errors.required') : undefined}
        >
          {({ id, status }) => <Input id={id} status={status} {...register('title_ru')} />}
        </FormField>

        <FormField
          label={t('promotions.titleTg')}
          message={errors.title_tg ? t('errors.required') : undefined}
        >
          {({ id, status }) => <Input id={id} status={status} {...register('title_tg')} />}
        </FormField>

        <FormField label={t('promotions.descriptionRu')}>
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

        <FormField label={t('promotions.descriptionTg')}>
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

        <div className="grid grid-cols-2 gap-3">
          <FormField
            label={t('promotions.startDate')}
            message={errors.start_date ? t('errors.required') : undefined}
          >
            {({ id, status }) => (
              <Input id={id} status={status} type="date" {...register('start_date')} />
            )}
          </FormField>
          <FormField
            label={t('promotions.endDate')}
            message={errors.end_date ? t('promotions.endBeforeStart') : undefined}
          >
            {({ id, status }) => (
              <Input id={id} status={status} type="date" {...register('end_date')} />
            )}
          </FormField>
        </div>

        <FormNote>{t('promotions.conditionsNote')}</FormNote>

        <FormField label={t('promotions.city')}>
          {({ id, status }) => (
            <SearchableSelect
              id={id}
              status={status}
              value={watch('city_id')}
              onChange={(next) => {
                setValue('city_id', next)
              }}
              options={
                cities?.map((city) => ({ value: String(city.id), label: city.name_ru })) ?? []
              }
              placeholder={t('promotions.allCities')}
              searchPlaceholder={t('common.searchCity')}
              emptyText={t('common.notFound')}
              allOption={t('promotions.allCities')}
            />
          )}
        </FormField>

        <FormField label={t('promotions.grade')}>
          {({ id, status }) => (
            <SearchableSelect
              id={id}
              status={status}
              value={watch('grade_id')}
              onChange={(next) => {
                setValue('grade_id', next)
              }}
              options={
                grades?.map((grade) => ({ value: String(grade.id), label: grade.name_ru })) ?? []
              }
              placeholder={t('promotions.allGrades')}
              searchPlaceholder={t('common.search')}
              emptyText={t('common.notFound')}
              allOption={t('promotions.allGrades')}
            />
          )}
        </FormField>

        <FormField
          label={t('promotions.threshold')}
          hint={t('promotions.thresholdHint')}
          message={errors.min_lifetime_threshold ? t('promotions.thresholdInvalid') : undefined}
        >
          {({ id, status }) => (
            <Input
              id={id}
              status={status}
              inputMode="decimal"
              placeholder={t('common.optional')}
              {...register('min_lifetime_threshold')}
            />
          )}
        </FormField>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold">{t('promotions.prizePlaces')}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="bg-field"
              disabled={prizeOptions.length === 0}
              onClick={addPlace}
            >
              {t('promotions.addPlace')}
            </Button>
          </div>

          {places.length === 0 ? (
            <p className="text-xs font-medium text-muted">{t('promotions.noPlaces')}</p>
          ) : (
            places.map((place, index) => (
              <div key={place.place_rank} className="flex items-center gap-2">
                <span className="w-[86px] shrink-0 text-sm font-bold">
                  {t('promotions.place', { rank: place.place_rank })}
                </span>
                <SearchableSelect
                  className="flex-1"
                  value={String(place.prize_id)}
                  onChange={(next) => {
                    changePlacePrize(index, Number(next))
                  }}
                  options={prizeOptions}
                  placeholder={t('promotions.pickPrize')}
                  searchPlaceholder={t('common.search')}
                  emptyText={t('common.notFound')}
                />
                <IconButton
                  label={t('promotions.removePlace')}
                  variant="ghost"
                  tone="danger"
                  onClick={() => {
                    removePlace(index)
                  }}
                >
                  <TrashIcon />
                </IconButton>
              </div>
            ))
          )}
          <span className="text-xs font-medium text-muted">{t('promotions.placesHint')}</span>
        </div>
      </form>
    </Drawer>
  )
}

export function DeletePromotionDialog({
  promotion,
  onClose,
}: {
  promotion?: Promotion
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const remove = useDeletePromotion()

  return (
    <ConfirmDialog
      open={promotion !== undefined}
      title={t('promotions.deleteTitle', { title: promotion?.title_ru ?? '' })}
      description={t('promotions.deleteDescription')}
      confirmLabel={t('common.delete')}
      cancelLabel={t('common.cancel')}
      destructive
      busy={remove.isPending}
      onCancel={onClose}
      onConfirm={() => {
        if (!promotion) return
        remove.mutate(promotion.id, {
          onSuccess: () => {
            toast.success(t('promotions.deleted'))
            onClose()
          },
          onError: (error) => {
            toast.error(
              error instanceof ApiError && error.isConflict
                ? t('promotions.deleteConflict')
                : t('errors.generic'),
            )
            onClose()
          },
        })
      }}
    />
  )
}

/**
 * Archiving is the way a promotion leaves the active lists — deleting is
 * only ever available for a draft. It cannot be undone, so the dialog
 * spells out what it costs, and that differs: an announced promotion
 * keeps its results and moves to the dealers' archive, while one that
 * never reached publication simply disappears from their cabinets.
 */
export function ArchivePromotionDialog({
  promotion,
  onClose,
}: {
  promotion?: Promotion
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const archive = useArchivePromotion()
  const published = promotion?.status === 'published'

  return (
    <ConfirmDialog
      open={promotion !== undefined}
      title={t('promotions.archiveTitle', { title: promotion?.title_ru ?? '' })}
      description={t(
        published ? 'promotions.archiveDescriptionPublished' : 'promotions.archiveDescriptionDraft',
      )}
      confirmLabel={t('promotions.archive')}
      cancelLabel={t('common.cancel')}
      destructive
      busy={archive.isPending}
      onCancel={onClose}
      onConfirm={() => {
        if (!promotion) return
        archive.mutate(promotion.id, {
          onSuccess: () => {
            toast.success(t('promotions.archived'))
            onClose()
          },
          onError: (error) => {
            toast.error(error instanceof ApiError ? error.message : t('errors.generic'))
            onClose()
          },
        })
      }}
    />
  )
}
