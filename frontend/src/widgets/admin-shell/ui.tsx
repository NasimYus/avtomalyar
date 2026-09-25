import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/shared/lib'

interface NavItem {
  to: string
  labelKey: string
}

const MAIN_NAV: NavItem[] = [
  { to: '/admin', labelKey: 'nav.dashboard' },
  { to: '/admin/dealers', labelKey: 'nav.dealers' },
  { to: '/admin/purchases', labelKey: 'nav.purchases' },
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

/** Left sidebar + content area — the frame every admin page renders into. */
export function AdminShell() {
  const { t } = useTranslation()

  return (
    <div className="grid min-h-dvh grid-cols-[240px_1fr] bg-canvas">
      <nav className="flex flex-col gap-1 border-r border-border bg-surface px-4 py-6.5">
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
      </nav>

      <main className="grid content-start gap-5 px-8 py-7">
        <Outlet />
      </main>
    </div>
  )
}
