import { useTranslation } from 'react-i18next'

/**
 * Returns a picker for the Russian or Tajik variant of a stored name.
 *
 * Reference data — cities, grades, prizes, promotion titles — is entered
 * in both languages, and the dealer cabinet is where that matters: a
 * dealer reading the interface in Tajik should not meet Russian prize
 * names. Falls back to Russian when the Tajik variant was left empty.
 */
export function useLocaleName(): (ru: string, tg: string | undefined) => string {
  const { i18n } = useTranslation()
  const tajik = i18n.language.startsWith('tg')

  return (ru, tg) => (tajik && tg !== undefined && tg.trim() !== '' ? tg : ru)
}
