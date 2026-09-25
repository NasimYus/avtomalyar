import type { ReactNode } from 'react'
import { cn } from '@/shared/lib'
import { Skeleton } from './feedback'

export interface Column<T> {
  key: string
  header: ReactNode
  /** Grid track for this column, e.g. "1.6fr" or "120px". */
  width: string
  align?: 'left' | 'right'
  render: (row: T) => ReactNode
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

export function DataTable<T>({
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
      <div className="min-w-[760px]">
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
                role={interactive ? 'button' : 'row'}
                tabIndex={interactive ? 0 : undefined}
                onClick={
                  interactive
                    ? () => {
                        onRowClick(row)
                      }
                    : undefined
                }
                onKeyDown={
                  interactive
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
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
