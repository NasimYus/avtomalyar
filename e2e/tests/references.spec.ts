import { expect, test, type Page } from '@playwright/test'
import { signInAsAdmin, uniq } from './helpers'

const dialog = (page: Page) => page.getByRole('dialog')
const row = (page: Page, text: string) => page.getByRole('row').filter({ hasText: text })

test.describe('Справочники', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
  })

  test('города: добавить, переименовать, удалить', async ({ page }) => {
    const name = `E2E Город ${uniq()}`
    await page.goto('/admin/cities')

    await page.getByRole('button', { name: '+ Город' }).click()
    await dialog(page).getByLabel('Название (RU)').fill(name)
    await dialog(page).getByLabel('Номи (TJ)').fill(`${name} tg`)
    await dialog(page).getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Город добавлен')).toBeVisible()
    await expect(row(page, name)).toBeVisible()

    await row(page, name).getByRole('button', { name: 'Изменить' }).click()
    await dialog(page).getByLabel('Название (RU)').fill(`${name} 2`)
    await dialog(page).getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Город сохранён')).toBeVisible()
    await expect(row(page, `${name} 2`)).toBeVisible()

    await row(page, `${name} 2`).getByRole('button', { name: 'Удалить' }).click()
    await dialog(page).getByRole('button', { name: 'Удалить' }).click()
    await expect(page.getByText('Город удалён')).toBeVisible()
    await expect(row(page, `${name} 2`)).toHaveCount(0)
  })

  test('город с дилерами удалить нельзя — объясняем почему', async ({ page }) => {
    await page.goto('/admin/cities')
    await row(page, 'Душанбе').getByRole('button', { name: 'Удалить' }).click()
    await dialog(page).getByRole('button', { name: 'Удалить' }).click()
    await expect(page.getByText('Нельзя удалить: к городу привязаны дилеры')).toBeVisible()
    await expect(row(page, 'Душанбе')).toBeVisible()
  })

  test('пустое название не сохраняется', async ({ page }) => {
    await page.goto('/admin/cities')
    await page.getByRole('button', { name: '+ Город' }).click()
    await dialog(page).getByRole('button', { name: 'Сохранить' }).click()
    await expect(dialog(page).getByText('Заполните это поле').first()).toBeVisible()
  })

  test('уровни: добавить с цветом, повтор порога, удалить', async ({ page }) => {
    const name = `E2E Уровень ${uniq()}`
    // A threshold nobody else uses, high enough to sit at the top.
    const threshold = 90_000_000 + Math.floor(Math.random() * 1_000_000)
    await page.goto('/admin/grades')

    await page.getByRole('button', { name: '+ Уровень' }).click()
    await dialog(page).getByLabel('Название (RU)').fill(name)
    await dialog(page).getByLabel('Номи (TJ)').fill(`${name} tg`)
    await dialog(page).getByLabel('Порог, сомони').fill(String(threshold))
    await dialog(page).getByText('Рубин', { exact: true }).click()
    await dialog(page).getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Уровень добавлен')).toBeVisible()

    // Its card says which level it is and that the colour was chosen.
    const card = page.locator('.rounded-card').filter({ hasText: name }).filter({ hasText: 'Рубин' })
    await expect(card).toBeVisible()

    // The entry grade of the demo seed starts at 0: a second one is refused.
    await page.getByRole('button', { name: '+ Уровень' }).click()
    await dialog(page).getByLabel('Название (RU)').fill(`${name} дубль`)
    await dialog(page).getByLabel('Номи (TJ)').fill(`${name} дубль`)
    await dialog(page).getByLabel('Порог, сомони').fill('0')
    await dialog(page).getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Уровень с таким порогом уже есть')).toBeVisible()
    await dialog(page).getByRole('button', { name: 'Закрыть' }).click()

    await card.getByRole('button', { name: 'Удалить' }).click()
    await dialog(page).getByRole('button', { name: 'Удалить' }).click()
    await expect(page.getByText('Уровень удалён')).toBeVisible()
    await expect(page.getByText(name)).toHaveCount(0)
  })

  test('призы: фото кадрируется в 4:3 и загружается 1200×900', async ({ page }) => {
    const name = `E2E Приз ${uniq()}`
    // A tall 900×1600 photo, drawn in the browser.
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 900
      canvas.height = 1600
      const context = canvas.getContext('2d')
      if (!context) throw new Error('no canvas')
      context.fillStyle = '#2a5ce0'
      context.fillRect(0, 0, 900, 1600)
      context.fillStyle = '#fcd102'
      context.fillRect(200, 600, 500, 400)
      return canvas.toDataURL('image/png').split(',')[1]
    })

    await page.goto('/admin/prizes')
    await page.getByRole('button', { name: '+ Приз' }).first().click()
    await dialog(page).getByLabel('Название (RU)').fill(name)
    await dialog(page).getByLabel('Номи (TJ)').fill(`${name} tg`)
    await page.locator('input[type=file]').setInputFiles({
      name: 'tall.png',
      mimeType: 'image/png',
      buffer: Buffer.from(png, 'base64'),
    })

    const cropper = page.getByRole('dialog', { name: 'Кадр для фото приза' })
    await expect(cropper).toBeVisible()
    await cropper.getByRole('button', { name: 'Целиком' }).click()
    await cropper.getByRole('button', { name: 'Готово' }).click()
    await expect(cropper).toBeHidden()

    await dialog(page).getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Приз добавлен')).toBeVisible()

    const card = page.locator('.rounded-card').filter({ hasText: name })
    const photo = card.locator('img')
    await expect(photo).toBeVisible()
    const size = await photo.evaluate(async (img: HTMLImageElement) => {
      await img.decode()
      return [img.naturalWidth, img.naturalHeight]
    })
    expect(size).toEqual([1200, 900])

    await card.getByRole('button', { name: 'Удалить' }).click()
    await dialog(page).getByRole('button', { name: 'Удалить' }).click()
    await expect(page.getByText('Приз удалён')).toBeVisible()
  })
})
