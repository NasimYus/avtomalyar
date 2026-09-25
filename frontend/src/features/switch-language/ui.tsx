import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib'
import { SUPPORTED_LANGUAGES, setLanguage, type SupportedLanguage } from '@/shared/i18n'

const LABELS: Record<SupportedLanguage, string> = { ru: 'RU', tg: 'TJ' }

/** RU / TJ toggle from the design — a segmented pill. */
export function SwitchLanguage({
  tone = 'light',
  className,
}: {
  /** "on-red" sits on the red hero block of the login screen. */
  tone?: 'light' | 'on-red'
  className?: string
}) {
  const { i18n } = useTranslation()
  const current = i18n.resolvedLanguage

  return (
    <div
      className={cn(
        'inline-flex rounded-card p-[3px] text-xs font-bold',
        tone === 'on-red' ? 'bg-black/20 text-white' : 'bg-field text-ink-soft',
        className,
      )}
    >
      {SUPPORTED_LANGUAGES.map((language) => {
        const active = current === language
        return (
          <button
            key={language}
            type="button"
            aria-pressed={active}
            onClick={() => {
              setLanguage(language)
            }}
            className={cn(
              'rounded-card px-[11px] py-1.5 transition-colors',
              active && (tone === 'on-red' ? 'bg-white text-brand-red' : 'bg-surface text-ink'),
            )}
          >
            {LABELS[language]}
          </button>
        )
      })}
    </div>
  )
}
