import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCities, type City } from '@/entities/city'
import { CityFormDrawer, DeleteCityDialog } from '@/features/manage-city'
import { Button, DataTable, EmptyState, PageHeader, type Column } from '@/shared/ui'

export function AdminCitiesPage() {
  const { t } = useTranslation()
  const { data: cities = [], isPending } = useCities()

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

      <DataTable
        columns={columns}
        rows={cities}
        rowKey={(city) => city.id}
        loading={isPending}
        empty={
          <EmptyState
            title={t('cities.emptyTitle')}
            description={t('cities.emptyDescription')}
            action={<Button onClick={openCreate}>{t('cities.add')}</Button>}
          />
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
