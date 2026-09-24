const DIRAMS_PER_SOMONI = 100

/**
 * Formats an integer amount in dirams (as stored/transmitted by the API)
 * into a human-readable somoni string, e.g. 1234567 -> "12 345,67 сомони".
 */
export function formatMoney(amountInDirams: number, locale: 'ru' | 'tg' = 'ru'): string {
  const somoni = amountInDirams / DIRAMS_PER_SOMONI
  const formatted = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'tg-TJ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(somoni)
  return `${formatted} сомони`
}
