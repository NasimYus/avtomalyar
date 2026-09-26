import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/shared/i18n'
import { renderWithProviders } from '@/shared/testing'
import { LoginForm } from './ui'

/** Stands in for the network, so the form is tested and not the API. */
function mockFetch(response: { status: number; body?: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.status < 400,
    status: response.status,
    statusText: 'mocked',
    json: () => Promise.resolve(response.body ?? {}),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('LoginForm', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ru')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('refuses to submit an empty form', async () => {
    const fetchMock = mockFetch({ status: 200 })
    const { user } = renderWithProviders(<LoginForm />)

    await user.click(screen.getByRole('button', { name: i18n.t('auth.signIn') }))

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  it('sends the credentials and reports success to its caller', async () => {
    const fetchMock = mockFetch({
      status: 200,
      body: { id: 1, role: 'dealer', name: 'ООО «Рангсоз»' },
    })
    const onSuccess = vi.fn()
    const { user } = renderWithProviders(<LoginForm onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText(i18n.t('auth.login')), 'rangsoz')
    await user.type(screen.getByLabelText(i18n.t('auth.password')), 'secret123')
    await user.click(screen.getByRole('button', { name: i18n.t('auth.signIn') }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce()
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    // The client always sends a JSON string body.
    expect(JSON.parse(init.body as string)).toEqual({ login: 'rangsoz', password: 'secret123' })
  })

  it('explains a rejected login instead of failing silently', async () => {
    mockFetch({ status: 401, body: { error: { code: 'unauthorized' } } })
    const { user } = renderWithProviders(<LoginForm />)

    await user.type(screen.getByLabelText(i18n.t('auth.login')), 'rangsoz')
    await user.type(screen.getByLabelText(i18n.t('auth.password')), 'wrong')
    await user.click(screen.getByRole('button', { name: i18n.t('auth.signIn') }))

    expect(await screen.findByText(i18n.t('auth.invalidCredentials'))).toBeInTheDocument()
  })

  it('keeps the password hidden until asked', async () => {
    mockFetch({ status: 200 })
    const { user } = renderWithProviders(<LoginForm />)

    const password = screen.getByLabelText(i18n.t('auth.password'))
    expect(password).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: i18n.t('auth.show') }))
    expect(password).toHaveAttribute('type', 'text')
  })
})
