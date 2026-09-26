import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '@/entities/session'
import { LogoutButton } from '@/features/logout'
import { SwitchLanguage } from '@/features/switch-language'
import { cn } from '@/shared/lib'
import { Avatar } from '@/shared/ui'

interface NavItem {
  to: string
  labelKey: string
}

const MAIN_NAV: NavItem[] = [
  { to: '/admin', labelKey: 'nav.dashboard' },
  { to: '/admin/dealers', labelKey: 'nav.dealers' },
  { to: '/admin/purchases', labelKey: 'nav.purchases' },
  { to: '/admin/promotions', labelKey: 'nav.promotions' },
]

const REFERENCE_NAV: NavItem[] = [
  { to: '/admin/cities', labelKey: 'nav.cities' },
  { to: '/admin/grades', labelKey: 'nav.grades' },
  { to: '/admin/prizes', labelKey: 'nav.prizes' },
]

function navItemClasses(isActive: boolean, dense: boolean): string {
  return cn(
    'rounded-field px-3.5 text-sm transition-colors',
    dense ? 'py-2.5' : 'py-[11px]',
    isActive ? 'bg-brand-red font-bold text-white' : 'font-semibold text-ink-soft hover:bg-field',
  )
}

/**
 * Left sidebar + content area — the frame every admin page renders into.
 *
 * From `lg` up the sidebar is pinned to the viewport: a long page scrolls
 * under it, so the account block and "log out" stay at the bottom of the
 * screen. Below that there is no room for it: a top bar with a menu
 * button takes its place, and the same sidebar slides in over the page.
 */
export function AdminShell() {
  const { t } = useTranslation()
  const { data: principal } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  // Opening a page closes the menu that led to it. Keyed on the path so
  // a tap on the current page's link closes it too (see onNavigate).
  const [menuPath, setMenuPath] = useState(pathname)
  if (menuPath !== pathname) {
    setMenuPath(pathname)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const closeMenu = () => {
    setMenuOpen(false)
  }

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5 lg:hidden">
        <button
          type="button"
          aria-label={t('nav.openMenu')}
          aria-expanded={menuOpen}
          aria-controls="admin-sidebar"
          onClick={() => {
            setMenuOpen(true)
          }}
          className="grid size-10 place-items-center rounded-field bg-field text-ink hover:bg-line"
        >
          <MenuIcon />
        </button>
        <img src="/logo.png" alt={t('app.name')} className="w-[130px]" />
        <SwitchLanguage />
      </header>

      {menuOpen && (
        <div aria-hidden onClick={closeMenu} className="fixed inset-0 z-40 bg-ink/40 lg:hidden" />
      )}

      <nav
        id="admin-sidebar"
        aria-label={t('nav.menu')}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col gap-1 overflow-y-auto border-r border-border bg-surface px-4 py-6.5 shadow-drawer transition-transform',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-auto lg:translate-x-0 lg:self-start lg:shadow-none',
        )}
      >
        <div className="mx-2 mb-7 flex items-center justify-between gap-2">
          <img src="/logo.png" alt={t('app.name')} className="w-[170px]" />
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={closeMenu}
            className="grid size-8 place-items-center rounded-full text-muted hover:bg-field lg:hidden"
          >
            ✕
          </button>
        </div>

        {MAIN_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            onClick={closeMenu}
            className={({ isActive }) => navItemClasses(isActive, false)}
          >
            {t(item.labelKey)}
          </NavLink>
        ))}

        <div className="px-3.5 pt-4.5 pb-1.5 text-xs font-bold tracking-[0.08em] text-faint">
          {t('nav.references')}
        </div>

        {REFERENCE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={closeMenu}
            className={({ isActive }) => navItemClasses(isActive, true)}
          >
            {t(item.labelKey)}
          </NavLink>
        ))}

        <div className="mt-auto grid gap-3 pt-6">
          <div className="flex items-center gap-2.5 px-1">
            <Avatar name={principal?.name ?? '—'} tone="dark" size="sm" />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold">{principal?.name}</div>
              <div className="text-xs text-faint">{t('auth.roleAdmin')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SwitchLanguage />
            <LogoutButton className="flex-1 bg-field" />
          </div>
        </div>
      </nav>

      <main className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <Outlet />
      </main>
    </div>
  )
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden
      className="size-5"
    >
      <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" />
    </svg>
  )
}
