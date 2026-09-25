import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LoginForm } from '@/features/auth-by-login'
import { SwitchLanguage } from '@/features/switch-language'

/**
 * Sign-in screen: the red hero block from the design on the left, the
 * form on the right. Both roles sign in here — the router sends admins to
 * the admin panel and dealers to their own cabinet.
 */
export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas p-6">
      <div className="grid w-full max-w-[880px] overflow-hidden rounded-card bg-surface shadow-modal md:grid-cols-2">
        <div className="relative overflow-hidden bg-brand-red px-9 py-10 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -bottom-36 size-[340px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgb(255 255 255 / 0.3), rgb(255 255 255 / 0) 65%)',
            }}
          />
          <div className="relative">
            <img src="/logo.png" alt="Автомаляр" className="w-[220px] brightness-0 invert" />
            <h1 className="mt-7 text-[30px] leading-[1.1] font-black">{t('auth.heroTitle')}</h1>
            <p className="mt-2.5 text-sm font-medium opacity-90">{t('auth.heroSubtitle')}</p>
          </div>
        </div>

        <div className="grid content-start gap-5 px-9 py-10">
          <div className="flex justify-end">
            <SwitchLanguage />
          </div>

          <LoginForm
            onSuccess={() => {
              void navigate('/', { replace: true })
            }}
          />

          <p className="text-center text-[13px] leading-[1.5] text-muted">{t('auth.helpHint')}</p>
        </div>
      </div>
    </div>
  )
}
