import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  addPurchase,
  adminApi,
  createCity,
  createDealer,
  isoDate,
  signInAsAdmin,
  signInAsDealer,
  uniq,
  type NewDealer,
} from './helpers'

/**
 * The whole life of a promotion, the acceptance criterion of stage 2:
 * create → start → period ends → calculate → review and adjust → publish →
 * hand prizes over → archive, with the dealers' side checked along the way.
 *
 * The promotion is limited to a city of its own with three fresh dealers,
 * so the ranking is known in advance:
 *   A — 500 000 in the period → 1st, prize 1
 *   B — 300 000, reached first → 2nd, prize 2 (a tie is won by who got there earlier)
 *   C — 300 000, reached later → 3rd, no prize
 */

async function choose(combobox: Locator, search: string) {
  await combobox.click()
  const panel = combobox.locator('..')
  await panel.getByRole('searchbox').fill(search)
  await panel.getByRole('option', { name: new RegExp(search) }).first().click()
}

const row = (page: Page, text: string) => page.getByRole('row').filter({ hasText: text })

test.describe.serial('Полный цикл акции', () => {
  const tag = uniq()
  const title = `E2E Акция ${tag}`
  const cityName = `E2E Город акции ${tag}`
  let a: NewDealer
  let b: NewDealer
  let c: NewDealer

  test.beforeAll(async () => {
    const api = await adminApi()
    const city = await createCity(api, cityName)
    a = await createDealer(api, `E2E Альфа ${tag}`, city.id)
    b = await createDealer(api, `E2E Бета ${tag}`, city.id)
    c = await createDealer(api, `E2E Гамма ${tag}`, city.id)

    await addPurchase(api, a.id, 500_000, isoDate(-30))
    await addPurchase(api, b.id, 300_000, isoDate(-25))
    await addPurchase(api, c.id, 200_000, isoDate(-20))
    await addPurchase(api, c.id, 100_000, isoDate(-10))
    // Outside the period: counts for the grade, not for the ranking.
    await addPurchase(api, c.id, 900_000, isoDate(-60))
  })

  test('админ создаёт акцию: период, город, призы по местам', async ({ page }) => {
    await signInAsAdmin(page)
    await page.goto('/admin/promotions')
    await page.getByRole('button', { name: '+ Акция' }).click()

    const drawer = page.getByRole('dialog', { name: 'Новая акция' })
    await drawer.getByLabel('Название (RU)').fill(title)
    await drawer.getByLabel('Ном (TJ)').fill(`${title} tg`)
    await drawer.getByLabel('Начало').fill(isoDate(-40))
    await drawer.getByLabel('Окончание').fill(isoDate(-1))
    await choose(drawer.getByLabel('Город'), cityName)

    await drawer.getByRole('button', { name: '+ Место' }).click()
    await drawer.getByRole('button', { name: '+ Место' }).click()
    const places = drawer.getByRole('combobox').filter({ hasText: /Выберите приз|Компрессор|Краскопульт|Полировальный|Набор|Автомобиль/ })
    await choose(places.nth(0), 'Компрессор')
    await choose(places.nth(1), 'Краскопульт')

    await drawer.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Акция создана')).toBeVisible()
    await expect(row(page, title)).toContainText('Черновик')
  })

  test('дилер не видит черновик', async ({ page }) => {
    await signInAsDealer(page, a)
    await page.goto('/me/promotions')
    await expect(page.getByRole('heading', { name: 'Акции', exact: true })).toBeVisible()
    await expect(page.getByText(title)).toHaveCount(0)
  })

  test('запуск: акция активна, период прошёл — можно подводить итоги', async ({ page }) => {
    await signInAsAdmin(page)
    await page.goto('/admin/promotions')
    await row(page, title).getByRole('button', { name: 'Запустить' }).click()
    await expect(page.getByText('Акция запущена')).toBeVisible()
    await expect(row(page, title)).toContainText('Активна')

    await row(page, title).getByRole('button', { name: 'Подвести итоги' }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
  })

  test('расчёт: порядок по сумме, при равенстве — кто раньше', async ({ page }) => {
    await signInAsAdmin(page)
    await page.goto('/admin/promotions')
    await row(page, title).getByRole('button', { name: 'Подвести итоги' }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await page.getByRole('button', { name: 'Рассчитать итоги' }).first().click()
    await expect(page.getByText('Итоги рассчитаны: участников — 3')).toBeVisible()

    const rows = page.getByRole('row').filter({ hasText: tag })
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0)).toContainText(a.full_name)
    await expect(rows.nth(0)).toContainText('Компрессор 100 л')
    await expect(rows.nth(1)).toContainText(b.full_name)
    await expect(rows.nth(1)).toContainText('Краскопульт HVLP')
    await expect(rows.nth(2)).toContainText(c.full_name)
    // The purchase outside the period does not count.
    await expect(rows.nth(2)).toContainText('300 000')
  })

  test('до публикации дилер итогов не видит', async ({ page }) => {
    await signInAsDealer(page, a)
    await page.goto('/me/promotions')
    await page.getByText(title).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByText('Рейтинг пока закрыт')).toBeVisible()
    await expect(page.getByText(b.full_name)).toHaveCount(0)
  })

  test('корректировка: третьему месту — поощрительный приз', async ({ page }) => {
    await signInAsAdmin(page)
    await page.goto('/admin/promotions')
    await row(page, title).getByRole('button', { name: 'Итоги' }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    await row(page, c.full_name).getByRole('button', { name: 'Скорректировать' }).click()
    const modal = page.getByRole('dialog', { name: c.full_name })
    await modal.getByLabel('Место').fill('3')
    await choose(modal.getByLabel('Приз'), 'Полировальный')
    await modal.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Изменение сохранено')).toBeVisible()
    await expect(row(page, c.full_name)).toContainText('Полировальный набор')
    await expect(row(page, c.full_name)).toContainText('правка')
  })

  test('публикация замораживает итоги; выдачу приза можно отметить', async ({ page }) => {
    await signInAsAdmin(page)
    await page.goto('/admin/promotions')
    await row(page, title).getByRole('button', { name: 'Итоги' }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    await page.getByRole('button', { name: 'Опубликовать итоги' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Опубликовать итоги' }).click()
    await expect(page.getByText('Итоги опубликованы')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Рассчитать итоги' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Скорректировать' })).toHaveCount(0)

    // The box follows the server, so it ticks once the change is saved.
    const handedOver = row(page, a.full_name).getByRole('checkbox')
    await handedOver.click()
    await expect(page.getByText('Отмечено: приз выдан')).toBeVisible()
    await expect(handedOver).toBeChecked()
  })

  test('победитель видит место и приз, рейтинг открыт и окончательный', async ({ page }) => {
    await signInAsDealer(page, a)
    await page.goto('/me/promotions')
    await expect(page.getByRole('heading', { name: 'Архив', exact: true })).toBeVisible()
    await page.getByText(title).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    await expect(page.getByText('Итоги объявлены')).toBeVisible()
    await expect(page.getByText('Ваш приз')).toBeVisible()
    await expect(page.getByText('Компрессор 100 л').first()).toBeVisible()
    await expect(page.getByText('окончательный')).toBeVisible()
    for (const dealer of [a, b, c]) {
      await expect(page.getByText(dealer.full_name)).toBeVisible()
    }
  })

  test('третий участник видит свой поощрительный приз — на таджикском тоже', async ({ page }) => {
    await signInAsDealer(page, c)
    await page.goto('/me/promotions')
    await page.getByText(title).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByText('Полировальный набор').first()).toBeVisible()

    await page.getByRole('button', { name: 'TJ' }).click()
    await expect(page.getByText('Маҷмӯи сайқалдиҳӣ').first()).toBeVisible()
    await expect(page.getByText(`${title} tg`)).toBeVisible()
    await page.getByRole('button', { name: 'RU' }).click()
  })

  test('архив: акция уходит из работы, но остаётся у дилеров с итогами', async ({ page, browser }) => {
    await signInAsAdmin(page)
    await page.goto('/admin/promotions')
    await row(page, title).getByRole('button', { name: 'Итоги' }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await page.getByRole('button', { name: 'В архив' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'В архив' }).click()
    await expect(page.getByText('Акция отправлена в архив')).toBeVisible()

    const dealer = await browser.newPage()
    await signInAsDealer(dealer, b)
    await dealer.goto('/me/promotions')
    await dealer.getByText(title).click()
    await expect(dealer.getByRole('heading', { name: title })).toBeVisible()
    await expect(dealer.getByText('В архиве')).toBeVisible()
    await expect(dealer.getByText('Краскопульт HVLP').first()).toBeVisible()
  })
})
