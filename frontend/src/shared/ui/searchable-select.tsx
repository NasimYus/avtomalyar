import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/shared/lib'
import { fieldClasses, type FieldStatus, type FieldVariant } from './field'
import { Spinner } from './feedback'

export interface SelectOption {
  value: string
  label: string
  /** Secondary line, e.g. a dealer's city. */
  hint?: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  /** Shown on the trigger when nothing is selected. */
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  /**
   * Provide to filter on the server (large lists): the parent receives
   * the query and supplies matching `options`. Without it the given
   * options are filtered locally.
   */
  onSearch?: (query: string) => void
  loading?: boolean
  /** Adds an "all" entry that clears the selection. */
  allOption?: string
  status?: FieldStatus
  variant?: FieldVariant
  id?: string
  className?: string
  /** Renders as a white pill, matching the filter row above tables. */
  asFilter?: boolean
}

/**
 * Select with a search box. Native <select> is fine for a handful of
 * options, but dealer and city lists grow — scrolling a few hundred
 * entries to find one isn't workable.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  onSearch,
  loading = false,
  allOption,
  status = 'default',
  variant = 'field',
  id,
  className,
  asFilter = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()

  const serverSide = onSearch !== undefined

  const visibleOptions = useMemo(() => {
    if (serverSide) return options
    const normalized = query.trim().toLowerCase()
    if (normalized === '') return options
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalized) ||
        (option.hint?.toLowerCase().includes(normalized) ?? false),
    )
  }, [options, query, serverSide])

  const entries: SelectOption[] =
    allOption === undefined ? visibleOptions : [{ value: '', label: allOption }, ...visibleOptions]

  const selected = options.find((option) => option.value === value)

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // The search box is the point of this control, so focus goes straight
  // there when the list opens.
  useLayoutEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  const openList = () => {
    setOpen(true)
    setActiveIndex(0)
  }

  const choose = (option: SelectOption) => {
    onChange(option.value)
    setOpen(false)
    setQuery('')
    onSearch?.('')
  }

  return (
    <div ref={containerRef} className={cn('relative', asFilter && 'inline-block')}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        onClick={() => {
          if (open) setOpen(false)
          else openList()
        }}
        className={cn(
          asFilter
            ? cn(
                'rounded-card border-2 border-transparent bg-surface px-4 py-3 text-sm font-bold whitespace-nowrap',
                'focus:border-brand-red focus:outline-none',
              )
            : fieldClasses(status, variant),
          'flex items-center justify-between gap-2 text-left',
          className,
        )}
      >
        <span className={cn('truncate', selected === undefined && 'font-medium text-faint')}>
          {selected?.label ?? placeholder}
        </span>
        <span aria-hidden className="shrink-0 text-xs text-muted">
          ▾
        </span>
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-30 mt-1.5 w-full min-w-[260px] overflow-hidden rounded-inner bg-surface shadow-modal',
            asFilter && 'w-max max-w-[320px]',
          )}
        >
          <div className="border-b border-line p-2">
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder={searchPlaceholder}
              onChange={(event) => {
                setQuery(event.target.value)
                setActiveIndex(0)
                onSearch?.(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setActiveIndex((index) => Math.min(index + 1, entries.length - 1))
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setActiveIndex((index) => Math.max(index - 1, 0))
                } else if (event.key === 'Enter') {
                  event.preventDefault()
                  // .at() is honestly typed as possibly undefined —
                  // activeIndex can point past an emptied list.
                  const option = entries.at(activeIndex)
                  if (option) choose(option)
                }
              }}
              className="w-full rounded-chip bg-field px-3 py-2 text-sm font-semibold text-ink placeholder:font-medium placeholder:text-faint focus:outline-none"
            />
          </div>

          <ul id={listboxId} role="listbox" className="max-h-[260px] overflow-y-auto py-1">
            {loading && (
              <li className="grid place-items-center py-4">
                <Spinner />
              </li>
            )}

            {!loading && entries.length === 0 && (
              <li className="px-3 py-3 text-center text-[13px] text-muted">{emptyText}</li>
            )}

            {!loading &&
              entries.map((option, index) => (
                <li key={option.value || 'all'}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    onMouseEnter={() => {
                      setActiveIndex(index)
                    }}
                    onClick={() => {
                      choose(option)
                    }}
                    className={cn(
                      'block w-full px-3 py-2 text-left text-sm transition-colors',
                      index === activeIndex && 'bg-surface-muted',
                      option.value === value ? 'font-bold text-brand-red' : 'font-semibold',
                    )}
                  >
                    <span className="block truncate">{option.label}</span>
                    {option.hint !== undefined && (
                      <span className="block truncate text-xs font-medium text-muted">
                        {option.hint}
                      </span>
                    )}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
