import type { TFunction } from 'i18next'
import { ApiError } from './client'

/**
 * What to tell the user about a failed request, in their language.
 *
 * The API's own message is English and meant for developers, so it is
 * never shown. A known reason ("city_in_use") gets its own sentence; any
 * other error falls back to one per kind of failure, and anything that is
 * not an API error at all (the request never got an answer) is a network
 * problem.
 */
export function apiErrorMessage(error: unknown, t: TFunction): string {
  if (!(error instanceof ApiError)) {
    return error instanceof TypeError ? t('errors.network') : t('errors.generic')
  }

  if (error.reason !== '') {
    const text = t(`errors.reasons.${error.reason}`, { defaultValue: '' })
    if (text !== '') return text
  }

  switch (error.status) {
    case 400:
      return t('errors.validation')
    case 403:
      return t('errors.forbidden')
    case 404:
      return t('errors.notFound')
    case 409:
      return t('errors.conflict')
    case 429:
      return t('errors.rateLimited')
    default:
      return t('errors.generic')
  }
}
