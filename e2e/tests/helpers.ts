import { expect, request, type APIRequestContext, type Page } from '@playwright/test'

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:4173'

export const ADMIN = {
  login: process.env.E2E_ADMIN_LOGIN ?? 'admin',
  password: process.env.E2E_ADMIN_PASSWORD ?? '',
}

if (ADMIN.password === '') {
  throw new Error('Set E2E_ADMIN_PASSWORD to the password of the seeded admin')
}

/** A suffix that keeps names unique between runs on the same database. */
export const uniq = () => Date.now().toString(36).slice(-5)

/** Money as the UI prints it: 1 234 567 (narrow no-break spaces from Intl). */
export const money = (somoni: number) => new Intl.NumberFormat('ru-RU').format(somoni)

/** Today in the shop's timezone, as the API wants it (YYYY-MM-DD). */
export function isoDate(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dushanbe',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Signs in through the login form. */
export async function signIn(page: Page, login: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Логин').fill(login)
  await page.getByLabel('Пароль', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Войти' }).click()
}

export async function signInAsDealer(page: Page, dealer: { login: string; password: string }) {
  await signIn(page, dealer.login, dealer.password)
  await expect(page).toHaveURL(/\/me$/)
}

export async function signInAsAdmin(page: Page) {
  await signIn(page, ADMIN.login, ADMIN.password)
  await expect(page).toHaveURL(/\/admin$/)
}

/**
 * An API client signed in as the admin — for setting up data the test is
 * not about, much faster than clicking through the forms.
 */
export async function adminApi(): Promise<APIRequestContext> {
  const api = await request.newContext({ baseURL: BASE_URL })
  const response = await api.post('/api/v1/auth/login', { data: ADMIN })
  expect(response.ok(), await response.text()).toBeTruthy()
  return api
}

export interface City {
  id: number
  name_ru: string
}

export async function firstCity(api: APIRequestContext): Promise<City> {
  const cities = (await (await api.get('/api/v1/admin/cities/')).json()) as City[]
  expect(cities.length).toBeGreaterThan(0)
  return cities[0]
}

export interface NewDealer {
  id: number
  full_name: string
  login: string
  password: string
}

/** Creates a dealer through the API; the password is only returned here. */
export async function createDealer(
  api: APIRequestContext,
  fullName: string,
  cityId?: number,
): Promise<NewDealer> {
  const city = cityId ?? (await firstCity(api)).id
  const response = await api.post('/api/v1/admin/dealers/', {
    data: { full_name: fullName, phone: '+992 92 555 01 10', city_id: city },
  })
  expect(response.ok(), await response.text()).toBeTruthy()
  return (await response.json()) as NewDealer
}

export async function addPurchase(
  api: APIRequestContext,
  dealerId: number,
  somoni: number,
  date = isoDate(),
) {
  const response = await api.post('/api/v1/admin/purchases/', {
    data: { dealer_id: dealerId, amount: somoni * 100, purchase_date: date, comment: null },
  })
  expect(response.ok(), await response.text()).toBeTruthy()
}

/** Fails if the page scrolls sideways — the most common responsive bug. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'page scrolls horizontally').toBeLessThanOrEqual(0)
}

export async function createCity(api: APIRequestContext, name: string): Promise<City> {
  const response = await api.post('/api/v1/admin/cities/', {
    data: { name_ru: name, name_tg: `${name} (tg)` },
  })
  expect(response.ok(), await response.text()).toBeTruthy()
  return (await response.json()) as City
}
