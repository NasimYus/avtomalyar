import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib'

interface PaginationProps {
  page: number
  perPage: number
  total: number
  onPageChange: (page: number) => void
  /** e.g. (from, to, total) => "1–5 из 142" */
  renderSummary: (from: number, to: number, total: number) => string
  className?: string
}

const MAX_PAGE_BUTTONS = 5

function pageNumbers(current: number, last: number): number[] {
  if (last <= MAX_PAGE_BUTTONS) {
    return Array.from({ length: last }, (_, index) => index + 1)
  }

  const start = Math.min(Math.max(1, current - 2), last - MAX_PAGE_BUTTONS + 1)
  return Array.from({ length: MAX_PAGE_BUTTONS }, (_, index) => start + index)
}

export function Pagination({
  page,
  perPage,
  total,
  onPageChange,
  renderSummary,
  className,
}: PaginationProps) {
  const { t } = useTranslation()
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  if (total === 0) return null

  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 pt-3.5 text-[13px] font-semibold text-muted',
        className,
      )}
    >
      <span>{renderSummary(from, to, total)}</span>
      <div className="flex gap-1.5">
        {pageNumbers(page, lastPage).map((number) => (
          <button
            key={number}
            type="button"
            aria-current={number === page ? 'page' : undefined}
            onClick={() => {
              onPageChange(number)
            }}
            className={cn(
              'rounded-page px-3 py-[7px] transition-colors',
              number === page ? 'bg-ink text-white' : 'bg-canvas hover:bg-line-strong',
            )}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          aria-label={t('common.nextPage')}
          disabled={page >= lastPage}
          onClick={() => {
            onPageChange(page + 1)
          }}
          className="rounded-page bg-canvas px-3 py-[7px] transition-colors hover:bg-line-strong disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  )
}
