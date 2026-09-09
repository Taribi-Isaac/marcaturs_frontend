/**
 * Business Deal desk UAT (MH-FE-P04).
 * Uses Playwright when available; exits non-zero on failure.
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../adminControl/package.json'),
)
const { chromium } = require('playwright')

const BASE = process.env.FE_BASE_URL ?? 'http://localhost:5180'
const findings = []
const note = (l, d) => {
  findings.push({ l, d })
  console.log('✓', l + ':', d)
}
const fail = (l, d) => {
  findings.push({ l, d, fail: true })
  console.error('✗', l + ':', d)
}

let browser
try {
  browser = await chromium.launch({ headless: true })
} catch (error) {
  console.error('BROWSER_ENV_UNAVAILABLE', String(error).slice(0, 400))
  process.exit(2)
}

const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
const pageErrors = []
page.on('pageerror', (err) => pageErrors.push(String(err)))

async function goto(p) {
  await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForLoadState('networkidle').catch(() => undefined)
}

try {
  await goto('/login')
  await page.getByLabel('Email').fill('business.solar@demo.marcaturshub.test')
  await page.getByLabel('Password').fill('DemoPass123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/app\/business/, { timeout: 25000 })
  note('business login', page.url())

  await goto('/app/business/deals')
  await page.getByRole('heading', { name: /^deals$/i }).waitFor({ timeout: 20000 })
  note('deal list', await page.locator('a.campaign-row').count().then(String))

  await page.locator('a.campaign-row').first().click()
  await page.waitForURL(/\/app\/business\/deals\/\d+/, { timeout: 15000 })
  await page.getByText(/deal snapshot/i).waitFor({ timeout: 15000 })
  note('deal detail', page.url())

  if (await page.getByRole('button', { name: /confirm customer payment/i }).count()) {
    await page.getByRole('button', { name: /confirm customer payment/i }).click()
    await page.getByRole('dialog').waitFor({ timeout: 10000 })
    if (await page.getByLabel(/confirmed payment amount/i).count()) {
      await page.getByLabel(/confirmed payment amount/i).fill('250000')
    }
    await page.getByRole('button', { name: /seal deal & create commission/i }).click()
    await page.getByText(/commission owed to ambassador/i).waitFor({ timeout: 20000 })
    note('confirm payment', 'sealed + commission due')
  } else {
    note('confirm payment', 'no confirm CTA on first deal (may already be sealed)')
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15000 })
  note('mobile 390', 'ok')

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.getByRole('button', { name: /sign out/i }).click()
  await page.waitForURL(/\/login/, { timeout: 15000 })
  note('logout', 'ok')

  if (pageErrors.length) fail('page errors', pageErrors.join(' | '))
  else note('page errors', 'none')
} catch (error) {
  fail('fatal', String(error))
} finally {
  await browser.close()
  const failed = findings.filter((f) => f.fail)
  console.log('\nUAT summary:', findings.length - failed.length, 'passed,', failed.length, 'failed')
  if (failed.length) process.exit(1)
}
