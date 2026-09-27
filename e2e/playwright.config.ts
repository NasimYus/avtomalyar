import { defineConfig, devices, type Project } from '@playwright/test'

/**
 * End-to-end tests against a running stack (frontend + API + database with
 * the demo seed). See README → «E2E-тесты» for how to start one.
 *
 * Functional flows run once, on desktop Chrome. The layout check runs on a
 * spread of screens, from a small Android phone to a wide desktop. With
 * E2E_ALL_BROWSERS=1 (after `npx playwright install`) Firefox and WebKit —
 * the engine of every browser on an iPhone — join in.
 */

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:4173'
// A preinstalled Chromium can be used instead of Playwright's own download.
const executablePath = process.env.E2E_CHROMIUM_PATH
// Extra Chromium flags, e.g. "--no-proxy-server" to reach a stand by IP.
const args = process.env.E2E_CHROMIUM_ARGS?.split(' ').filter(Boolean)

const chromium = { ...devices['Desktop Chrome'], launchOptions: { executablePath, args } }

const SCREENS: { name: string; use: Project['use'] }[] = [
  { name: 'phone-android-small', use: { ...devices['Galaxy S9+'], viewport: { width: 360, height: 740 } } },
  { name: 'phone-android', use: devices['Pixel 7'] },
  { name: 'phone-iphone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  { name: 'tablet-portrait', use: { ...devices['iPad Mini'], defaultBrowserType: 'chromium' } },
  { name: 'tablet-landscape', use: { ...devices['iPad Mini landscape'], defaultBrowserType: 'chromium' } },
  { name: 'laptop', use: { ...chromium, viewport: { width: 1280, height: 800 } } },
  { name: 'desktop', use: { ...chromium, viewport: { width: 1920, height: 1080 } } },
]

const allBrowsers = process.env.E2E_ALL_BROWSERS === '1'

const projects: Project[] = [
  {
    name: 'functional',
    testIgnore: /layout\.spec\.ts/,
    use: { ...chromium, viewport: { width: 1440, height: 900 } },
  },
  ...SCREENS.map((screen) => ({
    name: `layout-${screen.name}`,
    testMatch: /layout\.spec\.ts/,
    // Emulated devices run on Chromium unless the real engines are installed.
    use: { ...screen.use, launchOptions: { executablePath, args } },
  })),
]

if (allBrowsers) {
  projects.push(
    { name: 'functional-firefox', testIgnore: /layout\.spec\.ts/, use: devices['Desktop Firefox'] },
    { name: 'functional-webkit', testIgnore: /layout\.spec\.ts/, use: devices['Desktop Safari'] },
    { name: 'layout-webkit-iphone', testMatch: /layout\.spec\.ts/, use: devices['iPhone 13'] },
    { name: 'layout-firefox-desktop', testMatch: /layout\.spec\.ts/, use: devices['Desktop Firefox'] },
  )
}

export default defineConfig({
  testDir: './tests',
  // Every test shares one database, and flows build on each other.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'ru-RU',
    timezoneId: 'Asia/Dushanbe',
    trace: 'retain-on-failure',
    // A stand with a self-signed certificate (Caddy on localhost).
    ignoreHTTPSErrors: process.env.E2E_IGNORE_HTTPS_ERRORS === '1',
    screenshot: 'only-on-failure',
  },
  projects,
})
