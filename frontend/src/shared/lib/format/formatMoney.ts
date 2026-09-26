import { useTranslation } from 'react-i18next'

const DIRAMS_PER_SOMONI = 100

/**
 * Formats an integer amount in dirams (as stored and transmitted by the
 * API) as somoni: "142 000", or "142 000,50" when there are dirams.
 * The design shows whole somoni in tables, so trailing ",00" is dropped.
 */
export function formatMoney(amountInDirams: number): string {
  const whole = Math.trunc(amountInDirams / DIRAMS_PER_SOMONI)
  const dirams = Math.abs(amountInDirams % DIRAMS_PER_SOMONI)

  const formattedWhole = new Intl.NumberFormat('ru-RU').format(whole)
  return dirams === 0 ? formattedWhole : `${formattedWhole},${String(dirams).padStart(2, '0')}`
}

/**
 * Same as formatMoney, with the somoni unit the design uses in summaries.
 * A hook because the unit is a translated word — "сом." in Russian,
 * "сомонӣ" in Tajik — and it moves with the interface language.
 */
export function useMoneyWithUnit(): (amountInDirams: number) => string {
  const { t } = useTranslation()
  return (amountInDirams) => t('common.amountWithUnit', { amount: formatMoney(amountInDirams) })
}

/**
 * Parses what an admin typed into a money field ("120 000", "120000,50")
 * into an integer number of dirams. Returns null when the input isn't a
 * valid amount, so callers can show a validation message.
 */
export function parseMoneyInput(input: string): number | null {
  const normalized = input.replace(/\s/g, '').replace(',', '.')
  if (normalized === '' || !/^\d+(\.\d{1,2})?$/.test(normalized)) return null

  const [whole, fraction = ''] = normalized.split('.')
  const dirams = Number(fraction.padEnd(2, '0'))
  return Number(whole) * DIRAMS_PER_SOMONI + dirams
}
