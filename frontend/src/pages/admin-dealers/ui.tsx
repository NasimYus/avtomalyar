import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCities } from '@/entities/city'
import { useDealers, type Dealer } from '@/entities/dealer'
import { gradeToneByIndex, useGrades } from '@/entities/grade'
import {
  DealerAccessDialog,
  DealerFormDrawer,
  DeleteDealerDialog,
  ToggleDealerActiveDialog,
} from '@/features/manage-dealer'
import { formatMoney } from '@/shared/lib'
import {
  Avatar,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  FilterPill,
  IconButton,
  KeyIcon,
  PageHeader,
  Pagination,
  PencilIcon,
  PillGroup,
  PowerIcon,
  SearchInput,
  Select,
  TrashIcon,
  type Column,
} from '@/shared/ui'

const PER_PAGE = 20

export function AdminDealersPage() {
  const { t } = useTranslation()
  const { data: cities = [] } = useCities()
  const { data: grades = [] } = useGrades()

  const [search, setSearch] = useState('')
  const [cityId, setCityId] = useState<number | undefined>(undefined)
  const [gradeId, setGradeId] = useState<number | undefined>(undefined)
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined)
  const [page, setPage] = useState(1)

  const { data, isPending } = useDealers({
    q: search || undefined,
    city_id: cityId,
    grade_id: gradeId,
    is_active: isActive,
    page,
    per_page: PER_PAGE,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Dealer | undefined>(undefined)
  const [toggling, setToggling] = useState<Dealer | undefined>(undefined)
  const [deleting, setDeleting] = useState<Dealer | undefined>(undefined)
  // Access dialog: opened from a row, or automatically right after a
  // dealer is created so their first password can be handed over.
  const [access, setAccess] = useState<{ dealer: Dealer; password?: string } | undefined>(undefined)

  const gradeToneById = (id: number | undefined) => {
    if (id === undefined) return 'neutral' as const
    const index = grades.findIndex((grade) => grade.id === id)
    return index === -1 ? ('neutral' as const) : gradeToneByIndex(index, grades.length)
  }

  const gradeName = (id: number | undefined) =>
    grades.find((grade) => grade.id === id)?.name_ru ?? '—'

  const cityName = (id: number) => cities.find((city) => city.id === id)?.name_ru ?? '—'

  const resetFilters = () => {
    setSearch('')
    setCityId(undefined)
    setGradeId(undefined)
    setIsActive(undefined)
    setPage(1)
  }

  const columns: Column<Dealer>[] = [
    {
      key: 'dealer',
      header: t('dealers.columnDealer'),
      width: '2fr',
      render: (dealer) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={dealer.full_name} tone={dealer.is_active ? 'dark' : 'neutral'} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <b className="truncate">{dealer.full_name}</b>
              {!dealer.is_active && <Badge tone="danger">{t('dealers.inactive')}</Badge>}
            </div>
            <div className="truncate text-xs text-muted">
              {dealer.phone} · {dealer.login}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'city',
      header: t('dealers.columnCity'),
      width: '1fr',
      render: (dealer) => cityName(dealer.city_id),
    },
    {
      key: 'grade',
      header: t('dealers.columnGrade'),
      width: '1fr',
      render: (dealer) =>
        dealer.grade_id === undefined ? (
          <span className="text-faint">—</span>
        ) : (
          <Badge tone={gradeToneById(dealer.grade_id)} className="font-extrabold uppercase">
            {gradeName(dealer.grade_id)}
          </Badge>
        ),
    },
    {
      key: 'total',
      header: t('dealers.columnTotal'),
      width: '140px',
      align: 'right',
      render: (dealer) => <b>{formatMoney(dealer.lifetime_purchase_total)}</b>,
    },
    {
      key: 'actions',
      header: '',
      width: '172px',
      align: 'right',
      render: (dealer) => (
        <div className="flex justify-end gap-1">
          <IconButton
            label={t('common.edit')}
            variant="ghost"
            onClick={() => {
              setEditing(dealer)
              setFormOpen(true)
            }}
          >
            <PencilIcon />
          </IconButton>
          <IconButton
            label={t('dealers.access')}
            variant="ghost"
            onClick={() => {
              setAccess({ dealer })
            }}
          >
            <KeyIcon />
          </IconButton>
          <IconButton
            label={dealer.is_active ? t('dealers.deactivate') : t('dealers.activate')}
            variant="ghost"
            className={dealer.is_active ? undefined : 'text-brand-green'}
            onClick={() => {
              setToggling(dealer)
            }}
          >
            <PowerIcon />
          </IconButton>
          <IconButton
            label={t('common.delete')}
            variant="ghost"
            tone="danger"
            onClick={() => {
              setDeleting(dealer)
            }}
          >
            <TrashIcon />
          </IconButton>
        </div>
      ),
    },
  ]

  const dealers = data?.items ?? []
  const hasFilters =
    search !== '' || cityId !== undefined || gradeId !== undefined || isActive !== undefined

  return (
    <>
      <PageHeader
        title={t('nav.dealers')}
        count={data?.total}
        actions={
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            {t('dealers.add')}
          </Button>
        }
      />

      <PillGroup>
        <SearchInput
          value={search}
          placeholder={t('dealers.searchPlaceholder')}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />
        <Select
          className="w-auto rounded-card border-transparent bg-surface py-3 font-bold"
          value={cityId ?? ''}
          onChange={(event) => {
            setCityId(event.target.value === '' ? undefined : Number(event.target.value))
            setPage(1)
          }}
        >
          <option value="">{t('dealers.allCities')}</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name_ru}
            </option>
          ))}
        </Select>

        <FilterPill
          active={gradeId === undefined}
          onClick={() => {
            setGradeId(undefined)
            setPage(1)
          }}
        >
          {t('dealers.allGrades')}
        </FilterPill>
        {grades.map((grade) => (
          <FilterPill
            key={grade.id}
            active={gradeId === grade.id}
            onClick={() => {
              setGradeId(grade.id)
              setPage(1)
            }}
          >
            {grade.name_ru}
          </FilterPill>
        ))}

        <FilterPill
          accent
          active={isActive === false}
          onClick={() => {
            setIsActive(isActive === false ? undefined : false)
            setPage(1)
          }}
        >
          {t('dealers.onlyInactive')}
        </FilterPill>
      </PillGroup>

      <DataTable
        columns={columns}
        rows={dealers}
        rowKey={(dealer) => dealer.id}
        loading={isPending}
        isHighlighted={(dealer) => !dealer.is_active}
        empty={
          <EmptyState
            title={hasFilters ? t('common.notFound') : t('dealers.emptyTitle')}
            description={hasFilters ? t('common.notFoundHint') : t('dealers.emptyDescription')}
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

      <DealerFormDrawer
        open={formOpen}
        dealer={editing}
        onClose={() => {
          setFormOpen(false)
        }}
        onCreated={(dealer, password) => {
          setAccess({ dealer, password })
        }}
      />
      <ToggleDealerActiveDialog
        dealer={toggling}
        onClose={() => {
          setToggling(undefined)
        }}
      />
      <DeleteDealerDialog
        dealer={deleting}
        onClose={() => {
          setDeleting(undefined)
        }}
      />
      <DealerAccessDialog
        dealer={access?.dealer}
        initialPassword={access?.password}
        onClose={() => {
          setAccess(undefined)
        }}
      />
    </>
  )
}
