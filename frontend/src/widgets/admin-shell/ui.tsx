import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
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
 * The sidebar is pinned to the viewport: a long page scrolls under it, so
 * the account block and "log out" stay at the bottom of the screen rather
 * than at the bottom of the page. On a short screen it scrolls on its own.
 */
export function AdminShell() {
  const { t } = useTranslation()
  const { data: principal } = useSession()

  return (
    <div className="grid min-h-dvh grid-cols-[240px_1fr] bg-canvas">
      <nav className="sticky top-0 flex h-dvh flex-col gap-1 self-start overflow-y-auto border-r border-border bg-surface px-4 py-6.5">
        <img src="/logo.png" alt="Автомаляр" className="mx-2 mb-7 w-[170px]" />

        {MAIN_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
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

      <main className="grid min-w-0 content-start gap-5 px-8 py-7">
        <Outlet />
      </main>
    </div>
  )
}
