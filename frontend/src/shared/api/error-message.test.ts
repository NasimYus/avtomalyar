import { describe, expect, it } from 'vitest'
import i18n from '@/shared/i18n'
import { ApiError } from './client'
import { apiErrorMessage } from './error-message'

const t = i18n.getFixedT('ru')
const tg = i18n.getFixedT('tg')

describe('apiErrorMessage', () => {
  it('translates a known reason instead of echoing the English message', () => {
    const error = new ApiError(
      409,
      'conflict',
      'conflict: city is still assigned',
      {},
      'city_in_use',
    )
    expect(apiErrorMessage(error, t)).toBe(
      'В этом городе есть дилеры — сначала перенесите их в другой город',
    )
    expect(apiErrorMessage(error, tg)).toMatch(/^Дар ин шаҳр дилерон ҳастанд/)
  })

  it('falls back to the kind of failure for an unknown reason', () => {
    const error = new ApiError(409, 'conflict', 'conflict: something new', {}, 'brand_new_rule')
    expect(apiErrorMessage(error, t)).toBe(t('errors.conflict'))
  })

  it('never shows the raw message', () => {
    const error = new ApiError(400, 'validation_error', 'invalid JSON body')
    expect(apiErrorMessage(error, t)).toBe(t('errors.validation'))
  })

  it('reports a request that got no answer as a network problem', () => {
    expect(apiErrorMessage(new TypeError('Failed to fetch'), t)).toBe(t('errors.network'))
    expect(apiErrorMessage(new Error('?'), t)).toBe(t('errors.generic'))
  })
})
