import { Fragment, type KeyboardEvent, type ReactNode } from 'react'
import { DESKTOP_TABLE_QUERY, cn, useMediaQuery } from '@/shared/lib'
import { Skeleton } from './feedback'

export interface Column<T> {
  key: string
  header: ReactNode
  /** Grid track for this column, e.g. "1.6fr" or "120px". */
  width: string
  align?: 'left' | 'right'
  render: (row: T) => ReactNode
  /**
   * Where the column goes on a phone, where every row becomes a small
   * card: `title` heads the card (the first column by default), `aside`
   * sits opposite it — an amount, a status — `field` is a labelled line
   * below (the default), `hidden` is left out.
   */
  mobile?: 'title' | 'aside' | 'field' | 'hidden'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  /** Row highlight, e.g. the currently open dealer. */
  isHighlighted?: (row: T) => boolean
  loading?: boolean
  /** Shown instead of rows when there is nothing to display. */
  empty?: ReactNode
  className?: string
}

const SKELETON_ROWS = 5

/**
 * A table on a desktop, a list of cards on a phone: seven columns do not
 * fit in 390px, and a sideways-scrolling table hides exactly the columns
 * that matter. Only one of the two is rendered.
 */
export function DataTable<T>(props: DataTableProps<T>) {
  const desktop = useMediaQuery(DESKTOP_TABLE_QUERY)
  return desktop ? <GridTable {...props} /> : <CardList {...props} />
}

function rowHandlers<T>(row: T, onRowClick: ((row: T) => void) | undefined) {
  if (onRowClick === undefined) return { role: 'row' as const }
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: () => {
      onRowClick(row)
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onRowClick(row)
      }
    },
  }
}

function CardList<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  isHighlighted,
  loading = false,
  empty,
  className,
}: DataTableProps<T>) {
  const placed = columns.map((column, index) => ({
    column,
    place: column.mobile ?? (index === 0 ? 'title' : 'field'),
  }))
  const title = placed.filter((item) => item.place === 'title').map((item) => item.column)
  const aside = placed.filter((item) => item.place === 'aside').map((item) => item.column)
  const fields = placed.filter((item) => item.place === 'field').map((item) => item.column)

  return (
    <div className={cn('rounded-card bg-surface px-4 py-1.5', className)}>
      {loading &&
        Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <div key={`skeleton-${String(index)}`} className="grid gap-2 border-b border-line py-3.5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}

      {!loading && rows.length === 0 && empty !== undefined && <div className="py-2">{empty}</div>}

      {!loading &&
        rows.map((row, index) => (
          <div
            key={rowKey(row)}
            {...rowHandlers(row, onRowClick)}
            className={cn(
              'py-3.5 text-sm',
              index < rows.length - 1 && 'border-b border-line',
              onRowClick !== undefined && 'cursor-pointer',
              isHighlighted?.(row) === true && '-mx-4 bg-danger-bg px-4',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {title.map((column) => (
                  <Fragment key={column.key}>{column.render(row)}</Fragment>
                ))}
              </div>
              {aside.length > 0 && (
                <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                  {aside.map((column) => (
                    <Fragment key={column.key}>{column.render(row)}</Fragment>
                  ))}
                </div>
              )}
            </div>

            {fields.length > 0 && (
              <dl className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 text-[13px]">
                {fields.map((column) =>
                  column.header === '' ? (
                    <dd key={column.key} className="col-span-2 flex justify-end">
                      {column.render(row)}
                    </dd>
                  ) : (
                    <Fragment key={column.key}>
                      <dt className="text-[11px] font-bold tracking-[0.04em] text-faint uppercase">
                        {column.header}
                      </dt>
                      <dd className="flex min-w-0 justify-end text-right">{column.render(row)}</dd>
                    </Fragment>
                  ),
                )}
              </dl>
            )}
          </div>
        ))}
    </div>
  )
}

function GridTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  isHighlighted,
  loading = false,
  empty,
  className,
}: DataTableProps<T>) {
  const template = columns.map((column) => column.width).join(' ')

  return (
    <div className={cn('overflow-x-auto rounded-card bg-surface px-[22px] pt-2.5 pb-4', className)}>
      <div className="min-w-[640px]">
        <div
          role="row"
          className="grid gap-3.5 border-b border-line pt-3.5 pb-2.5 text-xs font-bold tracking-[0.04em] text-faint"
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((column) => (
            <span key={column.key} className={cn(column.align === 'right' && 'text-right')}>
              {column.header}
            </span>
          ))}
        </div>

        {loading &&
          Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <div
              key={`skeleton-${String(index)}`}
              className="grid gap-3.5 border-b border-line py-3.5"
              style={{ gridTemplateColumns: template }}
            >
              {columns.map((column) => (
                <Skeleton key={column.key} className="h-5" />
              ))}
            </div>
          ))}

        {!loading && rows.length === 0 && empty !== undefined && (
          <div className="py-2">{empty}</div>
        )}

        {!loading &&
          rows.map((row, index) => {
            const interactive = onRowClick !== undefined
            return (
              <div
                key={rowKey(row)}
                {...rowHandlers(row, onRowClick)}
                className={cn(
                  'grid items-center gap-3.5 py-3.5 text-sm',
                  index < rows.length - 1 && 'border-b border-line',
                  interactive && 'cursor-pointer',
                  isHighlighted?.(row) === true
                    ? '-mx-[22px] bg-danger-bg px-[22px]'
                    : interactive && 'hover:-mx-[22px] hover:bg-surface-muted hover:px-[22px]',
                )}
                style={{ gridTemplateColumns: template }}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className={cn('min-w-0', column.align === 'right' && 'text-right')}
                  >
                    {column.render(row)}
                  </div>
                ))}
              </div>
            )
          })}
      </div>
    </div>
  )
}
