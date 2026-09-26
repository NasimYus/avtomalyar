import { expect, test, type Browser, type Locator, type Page } from '@playwright/test'
import { isoDate, money, signIn, signInAsAdmin, uniq } from './helpers'

const credential = (dialog: Locator, label: string) =>
  dialog.locator('div.bg-field').filter({ hasText: label }).locator('b')

async function asDealer(browser: Browser, login: string, password: string): Promise<Page> {
  const page = await browser.newPage()
  await signIn(page, login, password)
  await expect(page).toHaveURL(/\/me$/)
  return page
}

/** Picks an option in one of the searchable dropdowns. */
async function choose(combobox: Locator, search: string) {
  await combobox.click()
  // The list opens right under its own button, with a search box on top.
  const panel = combobox.locator('..')
  await panel.getByRole('searchbox').fill(search)
  await panel.getByRole('option', { name: new RegExp(search) }).first().click()
}

test.describe.serial('Дилер: заведение, покупки, уровень, кабинет', () => {
  const name = `E2E Дилер ${uniq()}`
  let login = ''
  let password = ''

  test('админ заводит дилера и получает логин с паролем', async ({ page }) => {
    await signInAsAdmin(page)
    await page.goto('/admin/dealers')
    await page.getByRole('button', { name: '+ Новый дилер' }).click()

    const drawer = page.getByRole('dialog', { name: 'Новый дилер' })
    await drawer.getByLabel('Название / ФИО').fill(name)
    await drawer.getByLabel('Телефон').fill('925550110')
    await choose(drawer.getByLabel('Город'), 'Худжанд')
    await drawer.getByRole('button', { name: 'Сохранить' }).click()

    const access = page.getByRole('dialog', { name: 'Доступ дилера' })
    await expect(access).toBeVisible()
    login = (await credential(access, 'Логин').textContent()) ?? ''
    password = (await credential(access, 'Пароль').textContent()) ?? ''
    expect(login).not.toBe('')
    expect(password.length).toBeGreaterThanOrEqual(8)
    await access.getByRole('button', { name: 'Закрыть' }).click()

    // Found by search, with the phone as typed and the entry grade.
    await page.getByPlaceholder('Поиск по названию, телефону, логину…').fill(name)
    const row = page.getByRole('row').filter({ hasText: name })
    await expect(row).toContainText('+992 92 555 01 10')
    await expect(row).toContainText(/бронза/i)
  })

  test('новый дилер видит кабинет: уровень, прогресс, пустую историю', async ({ browser }) => {
    const page = await asDealer(browser, login, password)
    await expect(page.getByRole('heading', { name })).toBeVisible()
    await expect(page.getByText('Уровень 1 из 5')).toBeVisible()
    await expect(page.getByText('До уровня «Серебро» осталось 300 000 сом.')).toBeVisible()
    await expect(page.getByText('Покупок пока нет')).toBeVisible()
  })

  test('покупка из будущего не принимается', async ({ page }) => {
    await signInAsAdmin(page)
    await page.goto('/admin/purchases')
    await page.getByRole('button', { name: '+ Добавить покупку' }).click()
    const drawer = page.getByRole('dialog', { name: 'Новая покупка' })
    await choose(drawer.getByLabel('Дилер'), name)
    await drawer.getByLabel('Сумма, сомони').fill('1000')
    await drawer.getByLabel('Дата покупки').fill(isoDate(3))
    await drawer.getByRole('button', { name: 'Сохранить покупку' }).click()
    await expect(page.getByText(/будущем/)).toBeVisible()
  })

  test('покупка поднимает уровень — это видно заранее и сразу после', async ({ page, browser }) => {
    await signInAsAdmin(page)
    await page.goto('/admin/purchases')
    await page.getByRole('button', { name: '+ Добавить покупку' }).click()
    const drawer = page.getByRole('dialog', { name: 'Новая покупка' })
    await choose(drawer.getByLabel('Дилер'), name)
    await drawer.getByLabel('Сумма, сомони').fill('350000')
    await drawer.getByLabel('Комментарий').fill('E2E: краска')
    // The form warns before saving that the grade will change.
    await expect(drawer.getByText('Уровень изменится на «Серебро»')).toBeVisible()
    await drawer.getByRole('button', { name: 'Сохранить покупку' }).click()
    await expect(page.getByText('Покупка добавлена')).toBeVisible()

    await page.goto('/admin/dealers')
    await page.getByPlaceholder('Поиск по названию, телефону, логину…').fill(name)
    const row = page.getByRole('row').filter({ hasText: name })
    await expect(row).toContainText(/серебро/i)
    await expect(row).toContainText(money(350_000))

    const cabinet = await asDealer(browser, login, password)
    await expect(cabinet.getByText('Уровень 2 из 5')).toBeVisible()
    await expect(cabinet.getByText(`${money(350_000)} сом.`).first()).toBeVisible()
    await expect(cabinet.getByText('E2E: краска')).toBeVisible()
  })

  test('на новом уровне дилера поздравляют один раз', async ({ browser }) => {
    // The cabinet remembers the grade it last showed. Start from a browser
    // that saw Bronze, as the dealer did before the purchase.
    const context = await browser.newContext()
    const page = await context.newPage()
    await signIn(page, login, password)
    await expect(page).toHaveURL(/\/me$/)
    const dealerId = await page.evaluate(async () => {
      const response = await fetch('/api/v1/me/profile')
      const profile = (await response.json()) as { id: number; ladder: { id: number }[] }
      localStorage.setItem(`avtomalyar.seenGrade.${String(profile.id)}`, String(profile.ladder[0].id))
      return profile.id
    })
    expect(dealerId).toBeGreaterThan(0)

    await page.reload()
    await expect(page.getByText('Новый уровень!')).toBeVisible()
    await page.getByRole('button', { name: 'Ура!' }).click()
    await expect(page.getByText('Новый уровень!')).toBeHidden()

    await page.reload()
    await expect(page.getByRole('heading', { name })).toBeVisible()
    await expect(page.getByText('Новый уровень!')).toHaveCount(0)
    await context.close()
  })

  test('кабинет целиком переводится на таджикский', async ({ browser }) => {
    const page = await asDealer(browser, login, password)
    await page.getByRole('button', { name: 'TJ' }).click()
    await expect(page.getByText('Сатҳи 2 аз 5')).toBeVisible()
    await expect(page.getByText('Роҳи дилер')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'tg')
    // The grade name comes in Tajik too.
    await expect(page.getByText('Нуқра').first()).toBeVisible()

    // The choice survives a reload.
    await page.reload()
    await expect(page.getByText('Роҳи дилер')).toBeVisible()
    await page.getByRole('button', { name: 'RU' }).click()
    await expect(page.getByText('Путь дилера')).toBeVisible()
  })

  test('удаление покупки возвращает уровень', async ({ page }) => {
    await signInAsAdmin(page)
    await page.goto('/admin/purchases')
    const row = page.getByRole('row').filter({ hasText: name })
    await row.getByRole('button', { name: 'Удалить' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Удалить' }).click()
    await expect(page.getByText('Покупка удалена')).toBeVisible()

    await page.goto('/admin/dealers')
    await page.getByPlaceholder('Поиск по названию, телефону, логину…').fill(name)
    await expect(page.getByRole('row').filter({ hasText: name })).toContainText(/бронза/i)
  })

  test('новый пароль заменяет старый', async ({ page, browser }) => {
    await signInAsAdmin(page)
    await page.goto('/admin/dealers')
    await page.getByPlaceholder('Поиск по названию, телефону, логину…').fill(name)
    await page.getByRole('row').filter({ hasText: name }).getByRole('button', { name: 'Доступ' }).click()

    const access = page.getByRole('dialog', { name: 'Доступ дилера' })
    await access.getByRole('button', { name: 'Выпустить новый пароль' }).click()
    await expect(page.getByText('Новый пароль выпущен')).toBeVisible()
    const fresh = (await credential(access, 'Пароль').textContent()) ?? ''
    expect(fresh).not.toBe(password)

    const old = await browser.newPage()
    await signIn(old, login, password)
    await expect(old.getByText('Неверный логин или пароль')).toBeVisible()

    await asDealer(browser, login, fresh)
    password = fresh
  })

  test('дилера с покупками удалить нельзя, без покупок — можно', async ({ page }) => {
    await signInAsAdmin(page)
    await page.goto('/admin/dealers')

    // A seeded dealer with purchases: the dialog explains and offers nothing to break.
    const search = page.getByPlaceholder('Поиск по названию, телефону, логину…')
    await search.fill('Рангсоз')
    const seeded = page.getByRole('row').filter({ hasText: 'ООО «Рангсоз»' })
    await seeded.getByRole('button', { name: 'Удалить' }).click()
    await expect(page.getByRole('dialog').getByText(/удалить его нельзя/)).toBeVisible()
    await page.keyboard.press('Escape')

    await page.getByPlaceholder('Поиск по названию, телефону, логину…').fill(name)
    const row = page.getByRole('row').filter({ hasText: name })
    await row.getByRole('button', { name: 'Удалить' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Удалить' }).click()
    await expect(page.getByText('Дилер удалён')).toBeVisible()
    await expect(row).toHaveCount(0)
  })
})
