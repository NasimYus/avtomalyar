import { describe, expect, it } from 'vitest'
import { initials } from './initials'

describe('initials', () => {
  it.each([
    ['ООО «КрасТех»', 'КТ'],
    ['«Рангсоз»', 'РА'],
    ['ИП Рахимов А.', 'РА'],
    ['Истаравшан-Авто', 'ИА'],
    ['ҶДММ «Шаҳристон»', 'ША'],
    ['John Smith', 'JS'],
    ['', '—'],
  ])('turns %j into %j', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})
