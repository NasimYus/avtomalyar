import { useSyncExternalStore } from 'react'

/**
 * Whether a CSS media query matches, kept in sync as the window resizes.
 *
 * For the few places where the layout differs in structure, not just in
 * spacing — a table that becomes a list of cards on a phone — so only one
 * version is rendered. Everything else stays in Tailwind breakpoints.
 *
 * Without matchMedia (tests, old engines) it reports `fallback`, which is
 * the desktop layout by default.
 */
export function useMediaQuery(query: string, fallback = true): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => undefined
      }
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => {
        list.removeEventListener('change', onChange)
      }
    },
    () =>
      typeof window === 'undefined' || typeof window.matchMedia !== 'function'
        ? fallback
        : window.matchMedia(query).matches,
    () => fallback,
  )
}

/** Tailwind's `md` breakpoint: from here on, tables are tables. */
export const DESKTOP_TABLE_QUERY = '(min-width: 768px)'
