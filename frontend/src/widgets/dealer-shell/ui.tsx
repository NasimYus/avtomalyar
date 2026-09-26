import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
import { LogoutButton } from '@/features/logout'
import { SwitchLanguage } from '@/features/switch-language'
import { cn } from '@/shared/lib'

interface NavItem {
  to: string
  labelKey: string
}

const NAV: NavItem[] = [
  { to: '/me', labelKey: 'cabinet.navHome' },
  { to: '/me/purchases', labelKey: 'cabinet.navPurchases' },
  { to: '/me/promotions', labelKey: 'cabinet.navPromotions' },
]

/**
 * Frame of the dealer cabinet. Dealers open this on a phone far more
 * often than on a desktop, so it is a single column with a thumb-reachable
 * tab bar at the bottom; from `sm` up the bar moves into the header, and
 * from `lg` the frame widens so pages can lay out in two columns.
 */
export function DealerShell() {
  const { t } = useTranslation()

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[720px] lg:max-w-[1120px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <img src="/logo.png" alt={t('app.name')} className="w-[120px] sm:w-[150px]" />
          <div className="flex items-center gap-2">
            <SwitchLanguage />
            <LogoutButton className="bg-field" />
          </div>
        </div>

        <nav className="hidden border-t border-border sm:block">
          <div className="mx-auto flex max-w-[720px] lg:max-w-[1120px] gap-1 px-6 py-2">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/me'}
                className={({ isActive }) =>
                  cn(
                    'rounded-field px-3.5 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-brand-red font-bold text-white'
                      : 'font-semibold text-ink-soft hover:bg-field',
                  )
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      {/*
        Bottom padding keeps the last card clear of the mobile tab bar.
        The single column is minmax(0,1fr) so a long dealer name or amount
        truncates instead of widening the whole page.
      */}
      <main className="mx-auto grid max-w-[720px] lg:max-w-[1120px] grid-cols-[minmax(0,1fr)] content-start gap-4 px-4 pt-4 pb-24 sm:px-6 sm:pb-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface sm:hidden">
        <div className="grid grid-cols-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/me'}
              className={({ isActive }) =>
                cn(
                  'py-3 text-center text-[13px] transition-colors',
                  isActive ? 'font-bold text-brand-red' : 'font-semibold text-muted',
                )
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
