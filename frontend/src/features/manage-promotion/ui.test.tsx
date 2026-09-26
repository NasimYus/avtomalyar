import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/shared/i18n'
import { renderWithProviders } from '@/shared/testing'
import { PromotionFormDrawer } from './ui'

const CITIES = [{ id: 1, name_ru: 'Душанбе', name_tg: 'Душанбе' }]
const GRADES = [{ id: 1, name_ru: 'Бронза', name_tg: 'Биринҷӣ', min_purchase_amount: 0 }]
const PRIZES = [
  { id: 10, name_ru: 'Компрессор 100 л', name_tg: 'Компрессори 100 л' },
  { id: 20, name_ru: 'Краскопульт HVLP', name_tg: 'Краскопулти HVLP' },
]

/**
 * Answers the reference lists the form loads, and records what it sends.
 * Anything not stubbed here would be a request the form should not make.
 */
function mockApi() {
  const sent: { url: string; body: unknown }[] = []

  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const respond = (body: unknown) =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'ok',
        json: () => Promise.resolve(body),
      } as Response)

    if (url.includes('/admin/cities')) return respond(CITIES)
    if (url.includes('/admin/grades')) return respond(GRADES)
    if (url.includes('/admin/prizes')) return respond(PRIZES)

    // The client always sends a JSON string body.
    sent.push({ url, body: init?.body === undefined ? undefined : JSON.parse(init.body as string) })
    if (url.includes('/prize-places')) return respond({ prize_places: [] })
    return respond({ id: 77, title_ru: 'Новая', title_tg: 'Нав', status: 'draft' })
  })

  vi.stubGlobal('fetch', fetchMock)
  return sent
}

/** The row for a given place, found by its "N-е место" label. */
function placeRow(rank: number): HTMLElement {
  const label = screen.getByText(i18n.t('promotions.place', { rank }))
  const row = label.parentElement
  if (!row) throw new Error(`no row for place ${String(rank)}`)
  return row
}

describe('PromotionFormDrawer — prize places', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ru')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('numbers added places consecutively from one', async () => {
    mockApi()
    const { user } = renderWithProviders(<PromotionFormDrawer open onClose={vi.fn()} />)

    const addPlace = await screen.findByRole('button', { name: i18n.t('promotions.addPlace') })
    await waitFor(() => {
      expect(addPlace).toBeEnabled()
    })

    await user.click(addPlace)
    await user.click(addPlace)
    await user.click(addPlace)

    expect(screen.getByText(i18n.t('promotions.place', { rank: 1 }))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('promotions.place', { rank: 3 }))).toBeInTheDocument()
  })

  it('closes the gap when a place in the middle is removed', async () => {
    mockApi()
    const { user } = renderWithProviders(<PromotionFormDrawer open onClose={vi.fn()} />)

    const addPlace = await screen.findByRole('button', { name: i18n.t('promotions.addPlace') })
    await waitFor(() => {
      expect(addPlace).toBeEnabled()
    })
    await user.click(addPlace)
    await user.click(addPlace)
    await user.click(addPlace)

    // Prizes are attached to distinct places, so removing the second of
    // three has to leave 1 and 2 behind, not 1 and 3.
    await user.click(
      within(placeRow(2)).getByRole('button', { name: i18n.t('promotions.removePlace') }),
    )

    expect(screen.getByText(i18n.t('promotions.place', { rank: 1 }))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('promotions.place', { rank: 2 }))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('promotions.place', { rank: 3 }))).not.toBeInTheDocument()
  })

  it('starts an edit from the promotion it was given', async () => {
    mockApi()
    renderWithProviders(
      <PromotionFormDrawer
        open
        promotion={{
          id: 5,
          title_ru: 'Осенний рывок',
          title_tg: 'Ҳамлаи тирамоҳӣ',
          start_date: '2026-09-10',
          end_date: '2026-11-09',
          status: 'active',
          prize_places: [
            { place_rank: 1, prize_id: 20, prize_name_ru: 'Краскопульт HVLP', prize_name_tg: '' },
          ],
        }}
        onClose={vi.fn()}
      />,
    )

    expect(await screen.findByDisplayValue('Осенний рывок')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-09-10')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('promotions.place', { rank: 1 }))).toBeInTheDocument()
  })
})
