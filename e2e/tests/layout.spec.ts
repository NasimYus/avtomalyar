import { expect, test, type Page } from '@playwright/test'
import { ADMIN, addPurchase, adminApi, createDealer, expectNoHorizontalScroll, uniq } from './helpers'

/**
 * Every screen on every device class: nothing scrolls sideways, the
 * navigation that fits the screen is the one shown, and forms open inside
 * the viewport. Runs once per screen size (see playwright.config.ts).
 */

interface Fixture {
  dealerId: number
  publishedId: number
  dealer: { login: string; password: string }
  dealerPromotionId: number
}

let fixture: Fixture

test.beforeAll(async () => {
  const api = await adminApi()
  const dealer = await createDealer(api, `E2E Вёрстка ${uniq()}`)
  await addPurchase(api, dealer.id, 420_000)

  const promotions = (await (await api.get('/api/v1/admin/promotions/')).json()) as {
    items: { id: number; status: string }[]
  }
  const published = promotions.items.find((item) => item.status === 'published')
  const running = promotions.items.find((item) => item.status === 'active')
  expect(published, 'the demo seed has a published promotion').toBeDefined()
  expect(running, 'the demo seed has a running promotion').toBeDefined()

  fixture = {
    dealerId: dealer.id,
    publishedId: published?.id ?? 0,
    dealer,
    dealerPromotionId: running?.id ?? 0,
  }
})

async function signInByApi(page: Page, login: string, password: string) {
  const response = await page.request.post('/api/v1/auth/login', { data: { login, password } })
  expect(response.ok()).toBeTruthy()
}

/** Opens a page and waits until its data is on screen. */
async function open(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('h1').first()).toBeVisible()
}

const isNarrow = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024

test('вход', async ({ page }) => {
  await open(page, '/login')
  await expectNoHorizontalScroll(page)
  await expect(page.getByRole('button', { name: 'Войти' })).toBeInViewport()
})

test('админка: все разделы', async ({ page }, info) => {
  await signInByApi(page, ADMIN.login, ADMIN.password)
  const pages = [
    '/admin',
    '/admin/dealers',
    `/admin/dealers/${String(fixture.dealerId)}`,
    '/admin/purchases',
    '/admin/promotions',
    `/admin/promotions/${String(fixture.publishedId)}/results`,
    '/admin/cities',
    '/admin/grades',
    '/admin/prizes',
  ]
  for (const path of pages) {
    await test.step(path, async () => {
      await open(page, path)
      await expectNoHorizontalScroll(page)
      if (isNarrow(page)) {
        await expect(page.getByRole('button', { name: 'Открыть меню' })).toBeVisible()
        await expect(page.locator('#admin-sidebar')).not.toBeInViewport()
      } else {
        await expect(page.locator('#admin-sidebar')).toBeInViewport()
        await expect(page.getByRole('button', { name: 'Выйти' })).toBeInViewport()
      }
      await info.attach(path, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    })
  }
})

test('админка: меню на телефоне и планшете', async ({ page }) => {
  test.skip(!isNarrow(page), 'на широком экране меню всегда открыто')
  await signInByApi(page, ADMIN.login, ADMIN.password)
  await open(page, '/admin')

  await page.getByRole('button', { name: 'Открыть меню' }).click()
  await expect(page.locator('#admin-sidebar')).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeInViewport()

  await page.getByRole('link', { name: 'Дилеры' }).click()
  await expect(page).toHaveURL(/\/admin\/dealers$/)
  await expect(page.locator('#admin-sidebar')).not.toBeInViewport()

  await page.getByRole('button', { name: 'Открыть меню' }).click()
  await page.keyboard.press('Escape')
  await expect(page.locator('#admin-sidebar')).not.toBeInViewport()
})

test('админка: форма помещается на экран', async ({ page }) => {
  await signInByApi(page, ADMIN.login, ADMIN.password)
  await open(page, '/admin/dealers')
  await page.getByRole('button', { name: '+ Новый дилер' }).click()
  const drawer = page.getByRole('dialog', { name: 'Новый дилер' })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Сохранить' })).toBeInViewport()
  const box = await drawer.boundingBox()
  const width = page.viewportSize()?.width ?? 0
  expect(box && box.x >= 0 && box.x + box.width <= width + 1).toBeTruthy()
})

test('кабинет дилера: все разделы', async ({ page }, info) => {
  await signInByApi(page, fixture.dealer.login, fixture.dealer.password)
  const pages = [
    '/me',
    '/me/purchases',
    '/me/promotions',
    `/me/promotions/${String(fixture.dealerPromotionId)}`,
  ]
  for (const path of pages) {
    await test.step(path, async () => {
      await open(page, path)
      await expectNoHorizontalScroll(page)
      // Phones get the tab bar at the bottom, wider screens a menu on top.
      const phone = (page.viewportSize()?.width ?? 0) < 640
      const tabs = page.getByRole('link', { name: 'Покупки' })
      await expect(tabs.first()).toBeVisible()
      if (phone) {
        const box = await tabs.first().boundingBox()
        expect((box?.y ?? 0) > (page.viewportSize()?.height ?? 0) / 2).toBeTruthy()
      }
      await info.attach(path, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    })
  }
})
