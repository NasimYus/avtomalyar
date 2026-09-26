import { useState } from 'react'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardTitle,
  ConfirmDialog,
  DataTable,
  Drawer,
  EmptyState,
  FilterPill,
  FormField,
  FormNote,
  IconButton,
  Input,
  PageHeader,
  Pagination,
  PillGroup,
  ProgressBar,
  SearchInput,
  Select,
  Skeleton,
  Spinner,
  StatCard,
  Textarea,
  TierBadge,
  TierMedal,
  TierProgress,
  useToast,
} from '@/shared/ui'
import type { Column } from '@/shared/ui'
import { autoTierColors, formatMoney, tierAt } from '@/shared/lib'

const TIER_NAMES: Record<string, string> = {
  bronze: 'Бронза',
  silver: 'Серебро',
  gold: 'Золото',
  platinum: 'Платина',
  emerald: 'Изумруд',
  sapphire: 'Сапфир',
  amethyst: 'Аметист',
  ruby: 'Рубин',
  diamond: 'Бриллиант',
  onyx: 'Оникс',
}

interface DemoDealer {
  id: number
  name: string
  phone: string
  city: string
  /** Place on a three-grade ladder. */
  grade: number
  gradeName: string
  total: number
  progress: number
}

const DEMO_DEALERS: DemoDealer[] = [
  {
    id: 1,
    name: '«Рангсоз»',
    phone: '+992 92 555 01 10',
    city: 'Худжанд',
    grade: 2,
    gradeName: 'Золото',
    total: 491200000,
    progress: 100,
  },
  {
    id: 2,
    name: 'ООО «КрасТех»',
    phone: '+992 93 210 44 07',
    city: 'Душанбе',
    grade: 1,
    gradeName: 'Серебро',
    total: 234000000,
    progress: 78,
  },
  {
    id: 3,
    name: '«Кулоб-Пейнт»',
    phone: '+992 90 118 90 02',
    city: 'Куляб',
    grade: 0,
    gradeName: 'Бронза',
    total: 87040000,
    progress: 29,
  },
]

const COLUMNS: Column<DemoDealer>[] = [
  {
    key: 'dealer',
    header: 'ДИЛЕР',
    width: '1.6fr',
    render: (row) => (
      <div className="flex items-center gap-2.5">
        <Avatar name={row.name} tone={row.id === 2 ? 'red' : row.id === 1 ? 'dark' : 'neutral'} />
        <div className="min-w-0">
          <b className="block truncate">{row.name}</b>
          <div className="text-xs text-muted">{row.phone}</div>
        </div>
      </div>
    ),
  },
  { key: 'city', header: 'ГОРОД', width: '1fr', render: (row) => row.city },
  {
    key: 'grade',
    header: 'УРОВЕНЬ',
    width: '1fr',
    render: (row) => <TierBadge tier={tierAt(row.grade, 3)}>{row.gradeName}</TierBadge>,
  },
  {
    key: 'total',
    header: 'НАКОПЛЕНО',
    width: '1.6fr',
    render: (row) => (
      <div>
        <div className="flex justify-between text-[13px]">
          <b>{formatMoney(row.total)}</b>
          <span className="font-bold text-brand-green">
            {row.progress === 100 ? 'допущен' : `${String(row.progress)}%`}
          </span>
        </div>
        <ProgressBar
          value={row.progress}
          size="sm"
          tone={row.progress === 100 ? 'green' : 'red'}
          className="mt-1.5"
        />
      </div>
    ),
  },
  {
    key: 'month',
    header: 'ЗА МЕСЯЦ',
    width: '120px',
    align: 'right',
    render: (row) => <b>{formatMoney(row.total / 10)}</b>,
  },
]

/**
 * Living reference for the UI kit — every primitive rendered with the
 * tokens from the design system, so the visual language can be reviewed
 * in one place before real screens are built on top of it.
 */
export function UiKitPage() {
  const toast = useToast()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [page, setPage] = useState(1)

  return (
    <>
      <PageHeader
        title="UI-кит"
        count="v1"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                toast.success('Покупка сохранена · 120 000 сом.', {
                  label: 'Отменить',
                  onClick: () => undefined,
                })
              }}
            >
              Показать тост
            </Button>
            <Button
              onClick={() => {
                setDrawerOpen(true)
              }}
            >
              + Добавить покупку
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-4 gap-3.5">
        <StatCard label="Дилеров" value="142" note="+6 за месяц" noteTone="success" />
        <StatCard
          label="Покупки за месяц"
          value="4,82 млн"
          note="+12% к августу"
          noteTone="success"
        />
        <StatCard label="Накоплено всего" value="186,4 млн" note="сомони" />
        <StatCard
          tone="dark"
          label="Допущены к авто"
          value="18"
          note="ещё 9 близко к порогу"
          noteTone="gold"
        />
      </section>

      <Card>
        <CardTitle>Кнопки</CardTitle>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <Button>Основное действие</Button>
          <Button variant="dark">Тёмная</Button>
          <Button variant="secondary">Вторичная</Button>
          <Button variant="danger" size="sm">
            Удалить
          </Button>
          <Button variant="ghost" size="sm">
            Сохранить и добавить ещё
          </Button>
          <Button disabled>Недоступна</Button>
          <IconButton label="Закрыть">✕</IconButton>
          <Spinner />
        </div>
      </Card>

      <Card>
        <CardTitle>Бейджи и уровни</CardTitle>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <Badge tone="success">идёт</Badge>
          <Badge tone="danger">отключён</Badge>
          <Badge tone="warning">черновик</Badge>
          <Badge tone="neutral">завершена</Badge>
          <Badge tone="dark">итоги</Badge>
          <Avatar name="ООО «КрасТех»" tone="red" />
          <Avatar name="«Рангсоз»" tone="dark" />
          <Avatar name="ИП Рахимов А." />
        </div>
      </Card>

      <Card>
        <CardTitle>Уровни: лестница любой длины</CardTitle>
        <p className="mt-1 text-[13px] text-muted">
          Цвет — по месту в лестнице (или выбран админом), эффекты — по рангу: верхняя половина
          переливается, вершина светится и носит корону.
        </p>
        {[3, 5, 10].map((total) => (
          <div key={total} className="mt-4 grid gap-2.5">
            <div className="text-xs font-bold text-muted">{total} уровней</div>
            <div className="flex flex-wrap items-center gap-2">
              {autoTierColors(total).map((color, index) => (
                <TierBadge key={color} tier={tierAt(index, total)}>
                  {TIER_NAMES[color]}
                </TierBadge>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {autoTierColors(total).map((color, index) => (
                <TierMedal key={color} tier={tierAt(index, total)} label={TIER_NAMES[color]} />
              ))}
            </div>
          </div>
        ))}
        <div className="mt-5 grid gap-2.5 rounded-inner bg-night p-4">
          {[20, 55, 92].map((value, index) => (
            <TierProgress key={value} tier={tierAt(index + 3, 5)} value={value} track="dark" />
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Фильтры</CardTitle>
        <PillGroup className="mt-4">
          <SearchInput placeholder="Поиск по названию, телефону…" />
          {[
            { id: 'all', label: 'Все уровни' },
            { id: 'gold', label: 'Золото' },
            { id: 'silver', label: 'Серебро' },
            { id: 'bronze', label: 'Бронза' },
          ].map((filter) => (
            <FilterPill
              key={filter.id}
              active={activeFilter === filter.id}
              onClick={() => {
                setActiveFilter(filter.id)
              }}
            >
              {filter.label}
            </FilterPill>
          ))}
          <FilterPill accent>Только активные</FilterPill>
        </PillGroup>
      </Card>

      <section className="grid grid-cols-2 gap-3.5">
        <Card>
          <CardTitle>Поля формы</CardTitle>
          <div className="mt-4 grid gap-3.5">
            <FormField label="Название города">
              {({ id, status }) => (
                <Input
                  id={id}
                  status={status}
                  defaultValue="Душанбе"
                  placeholder="Введите название"
                />
              )}
            </FormField>
            <FormField label="Сумма, сомони" message="Введите сумму больше 0">
              {({ id, status }) => <Input id={id} status={status} emphasis defaultValue="0" />}
            </FormField>
            <FormField label="Дата" status="warning" message="Дата не может быть в будущем">
              {({ id, status }) => (
                <Input id={id} status={status} type="date" defaultValue="2026-10-02" />
              )}
            </FormField>
            <FormField label="Город" hint="Город выбирается из справочника">
              {({ id, status }) => (
                <Select id={id} status={status} defaultValue="dushanbe">
                  <option value="dushanbe">Душанбе</option>
                  <option value="khujand">Худжанд</option>
                </Select>
              )}
            </FormField>
            <FormField label="Комментарий">
              {({ id, status }) => <Textarea id={id} status={status} placeholder="необязательно" />}
            </FormField>
          </div>
        </Card>

        <div className="grid content-start gap-3.5">
          <Card>
            <CardTitle>Состояния</CardTitle>
            <div className="mt-4 grid gap-3">
              <FormNote>Серебро · накоплено 2 340 000 · до авто 660 000</FormNote>
              <FormNote tone="success">
                После сохранения дилер перейдёт на уровень «Золото».
              </FormNote>
              <div className="grid gap-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            </div>
          </Card>

          <EmptyState
            title="Ничего не найдено"
            description="Попробуйте изменить фильтры или период"
            action={
              <Button variant="secondary" size="sm" className="bg-field">
                Сбросить фильтры
              </Button>
            }
          />

          <Card>
            <CardTitle>Диалоги</CardTitle>
            <div className="mt-4 flex gap-2.5">
              <Button
                variant="secondary"
                onClick={() => {
                  setDrawerOpen(true)
                }}
              >
                Боковая панель
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirmOpen(true)
                }}
              >
                Подтверждение
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <div className="grid gap-3.5">
        <DataTable
          columns={COLUMNS}
          rows={DEMO_DEALERS}
          rowKey={(row) => row.id}
          isHighlighted={(row) => row.id === 2}
        />
        <Card padded={false} className="px-[22px] pb-4">
          <Pagination
            page={page}
            perPage={5}
            total={142}
            onPageChange={setPage}
            renderSummary={(from, to, total) => `${String(from)}–${String(to)} из ${String(total)}`}
          />
        </Card>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
        }}
        title="Новая покупка"
        footer={
          <>
            <Button
              size="lg"
              fullWidth
              onClick={() => {
                setDrawerOpen(false)
              }}
            >
              Сохранить покупку
            </Button>
            <Button variant="ghost" size="sm" fullWidth>
              Сохранить и добавить ещё
            </Button>
          </>
        }
      >
        <FormField label="Дилер">
          {({ id }) => (
            <Input
              id={id}
              className="border-brand-red font-bold"
              defaultValue="ООО «КрасТех»"
              readOnly
            />
          )}
        </FormField>
        <FormNote>Серебро · накоплено 2 340 000 · до авто 660 000</FormNote>
        <FormField label="Сумма, сомони">
          {({ id, status }) => <Input id={id} status={status} emphasis defaultValue="120 000" />}
        </FormField>
        <div className="grid grid-cols-2 gap-2.5">
          <FormField label="Дата">
            {({ id, status }) => (
              <Input id={id} status={status} type="date" defaultValue="2026-09-24" />
            )}
          </FormField>
          <FormField label="№ накладной">
            {({ id, status }) => <Input id={id} status={status} defaultValue="4821" />}
          </FormField>
        </div>
        <FormField label="Комментарий">
          {({ id, status }) => <Textarea id={id} status={status} placeholder="необязательно" />}
        </FormField>
        <FormNote tone="success">
          После сохранения дилер перейдёт на уровень «Золото» и поднимется на 3 место.
        </FormNote>
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        title="Удалить покупку № 4812?"
        description="Сумма ООО «КрасТех» уменьшится на 86 200 сом. Уровень пересчитается автоматически."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        destructive
        onConfirm={() => {
          setConfirmOpen(false)
          toast.success('Покупка удалена')
        }}
        onCancel={() => {
          setConfirmOpen(false)
        }}
      />
    </>
  )
}
