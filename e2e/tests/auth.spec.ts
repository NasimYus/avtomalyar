import { expect, request, test } from '@playwright/test'
import { ADMIN, BASE_URL, adminApi, createDealer, signIn, signInAsAdmin, uniq } from './helpers'

test.describe('Вход и права доступа', () => {
  test('неверный пароль — понятная ошибка, остаёмся на входе', async ({ page }) => {
    await signIn(page, ADMIN.login, 'definitely-wrong')
    await expect(page.getByText('Неверный логин или пароль')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('админ входит, сессия переживает перезагрузку, выход работает', async ({ page }) => {
    await signInAsAdmin(page)
    await expect(page.getByRole('heading', { name: 'Сводка за месяц' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Сводка за месяц' })).toBeVisible()

    await page.getByRole('button', { name: 'Выйти' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('без входа админка и кабинет недоступны', async ({ page }) => {
    for (const path of ['/admin', '/admin/dealers', '/me', '/me/promotions']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login$/)
    }
  })

  test('дилер попадает в кабинет, а в админку его не пускает', async ({ page }) => {
    const api = await adminApi()
    const dealer = await createDealer(api, `E2E Вход ${uniq()}`)

    await signIn(page, dealer.login, dealer.password)
    await expect(page).toHaveURL(/\/me$/)
    await expect(page.getByRole('heading', { name: dealer.full_name })).toBeVisible()

    await page.goto('/admin/dealers')
    await expect(page).toHaveURL(/\/me$/)
  })

  test('API админки отвечает дилеру 403, гостю 401', async () => {
    const api = await adminApi()
    const dealer = await createDealer(api, `E2E API ${uniq()}`)

    const guest = await request.newContext({ baseURL: BASE_URL })
    expect((await guest.get('/api/v1/admin/dealers/')).status()).toBe(401)
    expect((await guest.get('/api/v1/me/profile')).status()).toBe(401)

    const asDealer = await request.newContext({ baseURL: BASE_URL })
    await asDealer.post('/api/v1/auth/login', {
      data: { login: dealer.login, password: dealer.password },
    })
    expect((await asDealer.get('/api/v1/me/profile')).status()).toBe(200)
    expect((await asDealer.get('/api/v1/admin/dealers/')).status()).toBe(403)
    expect((await asDealer.post('/api/v1/admin/cities/', { data: { name_ru: 'x', name_tg: 'x' } })).status()).toBe(403)
  })

  test('отключённый дилер не может войти, а его сессия сразу обрывается', async ({ page }) => {
    const api = await adminApi()
    const dealer = await createDealer(api, `E2E Отключение ${uniq()}`)

    await signIn(page, dealer.login, dealer.password)
    await expect(page).toHaveURL(/\/me$/)

    const off = await api.patch(`/api/v1/admin/dealers/${String(dealer.id)}/active`, {
      data: { is_active: false },
    })
    expect(off.ok(), await off.text()).toBeTruthy()

    // The open session ends on the next request…
    await page.reload()
    await expect(page).toHaveURL(/\/login$/)
    // …and signing in again is refused.
    await signIn(page, dealer.login, dealer.password)
    await expect(page).toHaveURL(/\/login$/)
  })

  test('подбор пароля упирается в лимит, но вход других не блокирует', async ({ page }) => {
    // The test plays two clients by setting X-Real-IP, which only works when
    // nothing rewrites it. Behind Caddy (deploy/) the header is the real
    // address and cannot be forged — exactly what production needs — and all
    // test traffic comes from one IP, so this check is done by hand there
    // (see deploy/README.md).
    test.skip(process.env.E2E_BEHIND_PROXY === '1', 'стенд за обратным прокси: X-Real-IP не подделать')
    const api = await adminApi()
    const victim = await createDealer(api, `E2E Лимит ${uniq()}`)

    // Behind the proxy each client is told apart by X-Real-IP (nginx sets
    // it in production); here the test plays two clients by setting it.
    const attackerIp = `198.51.100.${String(Math.floor(Math.random() * 200) + 20)}`
    const attacker = await request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { 'X-Real-IP': attackerIp },
    })
    const codes: number[] = []
    for (let i = 0; i < 6; i++) {
      const response = await attacker.post('/api/v1/auth/login', {
        data: { login: victim.login, password: `wrong-${String(i)}` },
      })
      codes.push(response.status())
    }
    // Five misses are allowed; the next attempt is refused outright.
    expect(codes).toEqual([401, 401, 401, 401, 401, 429])

    // The attacker's browser is told so in words, not with a raw code.
    await page.context().setExtraHTTPHeaders({ 'X-Real-IP': attackerIp })
    await signIn(page, victim.login, victim.password)
    await expect(page.getByText('Слишком много попыток')).toBeVisible()

    // Everyone else — including the real owner — signs in as usual.
    await page.context().setExtraHTTPHeaders({ 'X-Real-IP': '198.51.100.250' })
    await signIn(page, victim.login, victim.password)
    await expect(page).toHaveURL(/\/me$/)
  })
})
