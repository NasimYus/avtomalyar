import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import i18n from '@/shared/i18n'
import { useLocaleName } from './use-locale-name'

describe('useLocaleName', () => {
  it('picks the Russian variant by default', async () => {
    await i18n.changeLanguage('ru')
    const { result } = renderHook(() => useLocaleName())
    expect(result.current('Серебро', 'Нуқра')).toBe('Серебро')
  })

  it('picks the Tajik variant when the interface is Tajik', async () => {
    await i18n.changeLanguage('tg')
    const { result } = renderHook(() => useLocaleName())
    expect(result.current('Серебро', 'Нуқра')).toBe('Нуқра')
  })

  it('falls back to Russian when the Tajik variant is missing or blank', async () => {
    await i18n.changeLanguage('tg')
    const { result } = renderHook(() => useLocaleName())
    expect(result.current('Серебро', undefined)).toBe('Серебро')
    expect(result.current('Серебро', '  ')).toBe('Серебро')
    await i18n.changeLanguage('ru')
  })
})
