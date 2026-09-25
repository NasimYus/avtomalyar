import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCities, type City } from '@/entities/city'
import { CityFormDrawer, DeleteCityDialog } from '@/features/manage-city'
import {
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  PillGroup,
  SearchInput,
  type Column,
} from '@/shared/ui'

export function AdminCitiesPage() {
  const { t } = useTranslation()
  const { data: cities = [], isPending } = useCities()
  const [search, setSearch] = useState('')

  const query = search.trim().toLowerCase()
  const visibleCities =
    query === ''
      ? cities
      : cities.filter(
          (city) =>
            city.name_ru.toLowerCase().includes(query) ||
            city.name_tg.toLowerCase().includes(query),
        )

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<City | undefined>(undefined)
  const [deleting, setDeleting] = useState<City | undefined>(undefined)

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }

  const openEdit = (city: City) => {
    setEditing(city)
    setFormOpen(true)
  }

  const columns: Column<City>[] = [
    { key: 'ru', header: 'RU', width: '1fr', render: (city) => <b>{city.name_ru}</b> },
    { key: 'tg', header: 'TJ', width: '1fr', render: (city) => city.name_tg },
    {
      key: 'actions',
      header: '',
      width: '160px',
      align: 'right',
      render: (city) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="bg-field"
            onClick={() => {
              openEdit(city)
            }}
          >
            {t('common.edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDeleting(city)
            }}
          >
            {t('common.delete')}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title={t('nav.cities')}
        count={cities.length > 0 ? cities.length : undefined}
        actions={<Button onClick={openCreate}>{t('cities.add')}</Button>}
      />

      {cities.length > 0 && (
        <PillGroup>
          <SearchInput
            value={search}
            placeholder={t('cities.searchPlaceholder')}
            onChange={(event) => {
              setSearch(event.target.value)
            }}
          />
        </PillGroup>
      )}

      <DataTable
        columns={columns}
        rows={visibleCities}
        rowKey={(city) => city.id}
        loading={isPending}
        empty={
          query === '' ? (
            <EmptyState
              title={t('cities.emptyTitle')}
              description={t('cities.emptyDescription')}
              action={<Button onClick={openCreate}>{t('cities.add')}</Button>}
            />
          ) : (
            <EmptyState
              title={t('common.notFound')}
              description={t('common.notFoundHint')}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-field"
                  onClick={() => {
                    setSearch('')
                  }}
                >
                  {t('common.reset')}
                </Button>
              }
            />
          )
        }
      />

      <CityFormDrawer
        open={formOpen}
        city={editing}
        onClose={() => {
          setFormOpen(false)
        }}
      />
      <DeleteCityDialog
        city={deleting}
        onClose={() => {
          setDeleting(undefined)
        }}
      />
    </>
  )
}
