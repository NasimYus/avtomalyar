import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePrizes, type Prize } from '@/entities/prize'
import { DeletePrizeDialog, PrizeFormDrawer } from '@/features/manage-prize'
import { Button, Card, EmptyState, PageHeader, PillGroup, SearchInput, Skeleton } from '@/shared/ui'

export function AdminPrizesPage() {
  const { t } = useTranslation()
  const { data: prizes = [], isPending } = usePrizes()
  const [search, setSearch] = useState('')

  const query = search.trim().toLowerCase()
  const visiblePrizes =
    query === ''
      ? prizes
      : prizes.filter((prize) =>
          [prize.name_ru, prize.name_tg, prize.description_ru ?? ''].some((text) =>
            text.toLowerCase().includes(query),
          ),
        )

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Prize | undefined>(undefined)
  const [deleting, setDeleting] = useState<Prize | undefined>(undefined)

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }

  return (
    <>
      <PageHeader
        title={t('nav.prizes')}
        count={prizes.length > 0 ? prizes.length : undefined}
        actions={
          <Button variant="dark" onClick={openCreate}>
            {t('prizes.add')}
          </Button>
        }
      />

      {isPending && (
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-[220px] rounded-card" />
          <Skeleton className="h-[220px] rounded-card" />
          <Skeleton className="h-[220px] rounded-card" />
        </div>
      )}

      {!isPending && prizes.length > 0 && (
        <PillGroup>
          <SearchInput
            value={search}
            placeholder={t('prizes.searchPlaceholder')}
            onChange={(event) => {
              setSearch(event.target.value)
            }}
          />
        </PillGroup>
      )}

      {!isPending && prizes.length > 0 && visiblePrizes.length === 0 && (
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
      )}

      {!isPending && prizes.length === 0 && (
        <EmptyState
          title={t('prizes.emptyTitle')}
          description={t('prizes.emptyDescription')}
          action={
            <Button variant="dark" onClick={openCreate}>
              {t('prizes.add')}
            </Button>
          }
        />
      )}

      {!isPending && visiblePrizes.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {visiblePrizes.map((prize) => (
            <Card key={prize.id} padded={false} className="overflow-hidden">
              {prize.photo_url === undefined ? (
                <div
                  className="grid h-[120px] place-items-center text-xs font-medium text-faint"
                  style={{
                    background:
                      'repeating-linear-gradient(135deg, #ececef 0 10px, #f5f5f7 10px 20px)',
                  }}
                >
                  {t('prizes.noPhoto')}
                </div>
              ) : (
                <img src={prize.photo_url} alt="" className="h-[120px] w-full object-cover" />
              )}

              <div className="grid gap-1 px-4 py-3.5">
                <div className="text-sm font-extrabold">{prize.name_ru}</div>
                <div className="text-xs leading-[1.4] text-muted">
                  {prize.description_ru ?? prize.name_tg}
                  {prize.stock_quantity !== undefined &&
                    ` · ${t('prizes.stockCount', { count: prize.stock_quantity })}`}
                </div>
                <div className="mt-1.5 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-field"
                    onClick={() => {
                      setEditing(prize)
                      setFormOpen(true)
                    }}
                  >
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeleting(prize)
                    }}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          <button
            type="button"
            onClick={openCreate}
            className="grid min-h-[200px] place-items-center rounded-card border-2 border-dashed border-border-dashed text-sm font-bold text-muted transition-colors hover:border-brand-red hover:text-brand-red"
          >
            {t('prizes.add')}
          </button>
        </div>
      )}

      <PrizeFormDrawer
        open={formOpen}
        prize={editing}
        onClose={() => {
          setFormOpen(false)
        }}
      />
      <DeletePrizeDialog
        prize={deleting}
        onClose={() => {
          setDeleting(undefined)
        }}
      />
    </>
  )
}
