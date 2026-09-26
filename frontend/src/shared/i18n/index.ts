import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ru from './locales/ru.json'
import tg from './locales/tg.json'

export const SUPPORTED_LANGUAGES = ['ru', 'tg'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const STORAGE_KEY = 'avtomalyar.language'
const DEFAULT_LANGUAGE: SupportedLanguage = 'ru'

function isSupported(value: string | null): value is SupportedLanguage {
  return value !== null && SUPPORTED_LANGUAGES.includes(value as SupportedLanguage)
}

function storedLanguage(): SupportedLanguage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isSupported(stored) ? stored : DEFAULT_LANGUAGE
  } catch {
    // Private mode / blocked storage — fall back to the default.
    return DEFAULT_LANGUAGE
  }
}

/** Switches the interface language and remembers the choice. */
export function setLanguage(language: SupportedLanguage): void {
  void i18n.changeLanguage(language)
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Nothing to do — the language still applies for this session.
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    tg: { translation: tg },
  },
  lng: storedLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
})

// Screen readers and the browser's hyphenation follow <html lang>, so it
// tracks the interface language rather than staying "ru" from index.html.
const syncDocumentLanguage = (language: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = language
}
syncDocumentLanguage(i18n.language)
i18n.on('languageChanged', syncDocumentLanguage)

export default i18n
