import { useTranslation } from 'react-i18next'
import { LogoutButton } from '@/features/logout'
import { SwitchLanguage } from '@/features/switch-language'
import { useSession } from '@/entities/session'
import { Card, CardTitle } from '@/shared/ui'

/**
 * Placeholder dealer cabinet. Stage 1 only needs a dealer to be able to
 * sign in and see who they are; the real cabinet (purchases, grade,
 * promotions) is stage 2.
 */
export function DealerHomePage() {
  const { t } = useTranslation()
  const { data: principal } = useSession()

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="flex items-center justify-between border-b border-border bg-surface px-8 py-4">
        <img src="/logo.png" alt="Автомаляр" className="w-[150px]" />
        <div className="flex items-center gap-3">
          <SwitchLanguage />
          <LogoutButton className="bg-field" />
        </div>
      </header>

      <main className="mx-auto grid max-w-[720px] gap-5 px-6 py-10">
        <h1 className="text-[28px] font-black">{principal?.name ?? ''}</h1>
        <Card>
          <CardTitle>{t('dealer.cabinetSoonTitle')}</CardTitle>
          <p className="mt-2 text-[13px] leading-[1.55] text-muted">
            {t('dealer.cabinetSoonText')}
          </p>
        </Card>
      </main>
    </div>
  )
}
