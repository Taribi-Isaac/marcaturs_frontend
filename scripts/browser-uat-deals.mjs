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

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
const pageErrors = []
const failedApi = []
page.on('pageerror', (err) => pageErrors.push(String(err)))
page.on('response', (res) => {
  const url = res.url()
  if ((url.includes('/api/') || url.includes('/sanctum/')) && res.status() >= 400) {
    if (!(res.status() === 401 && url.includes('/auth/me'))) {
      failedApi.push(`${res.status()} ${url}`)
    }
  }
})

async function goto(p) {
  await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForLoadState('networkidle').catch(() => undefined)
}

try {
  await goto('/')
  await page.getByRole('heading', { name: /businesses publish opportunities/i }).waitFor({
    timeout: 20000,
  })
  note('guest homepage', 'ok')

  await goto('/discover')
  await page.getByRole('heading', { name: /choose an offer worth selling/i }).waitFor({
    timeout: 20000,
  })
  const cards = page.locator('a.card--link')
  await cards.first().waitFor({ timeout: 20000 })
  note('guest discover', `cards=${await cards.count()}`)

  await cards.first().click()
  await page.waitForURL(/\/campaigns\/\d+/, { timeout: 15000 })
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15000 })
  note('guest campaign', page.url())
  if (await page.getByRole('link', { name: /sign in to create a deal/i }).count()) {
    note('guest blocked from deal CTA', 'sign-in CTA visible')
  } else {
    fail('guest blocked from deal CTA', 'missing sign-in CTA')
  }

  await page.getByRole('link', { name: /sign in to create a deal/i }).click()
  await page.waitForURL(/\/login/, { timeout: 15000 })
  note('guest directed to login', page.url())

  await page.getByLabel('Email').fill('ambassador.ada@demo.marcaturshub.test')
  await page.getByLabel('Password').fill('DemoPass123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/(app\/ambassador|campaigns\/)/, { timeout: 25000 })
  note('ambassador login', page.url())

  await goto('/discover')
  await page.getByRole('heading', { name: /choose an offer worth selling/i }).waitFor({
    timeout: 15000,
  })
  await page.locator('a.card--link').first().click()
  await page.waitForURL(/\/campaigns\/\d+/, { timeout: 15000 })
  const createDeal = page.getByRole('link', { name: /^create deal$/i })
  if (!(await createDeal.count())) {
    fail('eligible create deal CTA', 'missing Create Deal link')
  } else {
    note('eligible create deal CTA', 'visible')
    await createDeal.click()
  }

  await page.waitForURL(/\/app\/ambassador\/deals\/new/, { timeout: 15000 })
  await page.getByRole('heading', { name: /choosing this opportunity to sell/i }).waitFor({
    timeout: 15000,
  })
  await page.getByRole('button', { name: /^create deal$/i }).click()
  await page.waitForURL(/\/app\/ambassador\/deals\/\d+/, { timeout: 25000 })
  note('deal created', page.url())

  await page.getByText(/official payment information/i).waitFor({ timeout: 15000 })
  const openPay = page.getByRole('link', { name: /open payment page/i })
  const href = await openPay.getAttribute('href')
  if (!href || !href.startsWith('/pay/')) fail('payment share path', String(href))
  else note('payment share path', href)

  await openPay.click()
  await page.waitForURL(/\/pay\//, { timeout: 15000 })
  await page
    .getByText(/pay the business directly/i)
    .first()
    .waitFor({ timeout: 15000 })
  const body = await page.locator('body').innerText()
  if (/marcaturshub does not receive your payment/i.test(body)) {
    note('public pay boundary', 'ok')
  } else {
    fail('public pay boundary', body.slice(0, 200))
  }
  if (/paystack/i.test(body)) fail('no paystack on pay page', 'found paystack')
  else note('no paystack on pay page', 'ok')

  const payUrl = page.url()
  await context.clearCookies()
  await page.goto(payUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page
    .getByText(/pay the business directly/i)
    .first()
    .waitFor({ timeout: 15000 })
  note('unauthenticated pay page', 'ok')

  await goto('/login')
  await page.getByLabel('Email').fill('ambassador.ada@demo.marcaturshub.test')
  await page.getByLabel('Password').fill('DemoPass123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/app\/ambassador/, { timeout: 25000 })

  await goto('/app/ambassador/deals')
  await page.locator('a.campaign-row').first().click()
  await page.waitForURL(/\/app\/ambassador\/deals\/\d+/, { timeout: 15000 })
  note('deal detail reopen', page.url())

  if (await page.getByLabel(/evidence type/i).count()) {
    await page.getByLabel(/evidence type/i).selectOption('transaction_reference')
    await page.getByLabel(/reference number/i).fill(`UAT-${Date.now()}`)
    await page.getByLabel(/^amount$/i).fill('250000')
    await page.getByRole('button', { name: /submit payment evidence/i }).click()
    await page.getByText(/ref uat-/i).waitFor({ timeout: 20000 })
    note('evidence submitted', 'still pending expected')
    const statusText = await page.locator('.badge').first().innerText()
    if (/payment pending/i.test(statusText)) note('deal remains pending', statusText)
    else fail('deal remains pending', statusText)
  } else {
    note('evidence form', 'already has evidence / form collapsed')
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15000 })
  note('mobile 390 deal detail', 'ok')

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.getByRole('button', { name: /sign out/i }).click()
  await page.waitForURL(/\/login/, { timeout: 15000 })
  note('logout', 'ok')

  if (pageErrors.length) fail('page errors', pageErrors.join(' | '))
  else note('page errors', 'none')

  const unexpected = failedApi.filter(
    (entry) => !/422|409/.test(entry) && !/official-payment-information/.test(entry),
  )
  if (unexpected.length) fail('api errors', unexpected.slice(0, 8).join(' | '))
  else note('api errors', failedApi.length ? `tolerated ${failedApi.length}` : 'none')
} catch (error) {
  fail('fatal', String(error))
} finally {
  await browser.close()
  const failed = findings.filter((f) => f.fail)
  console.log('\nUAT summary:', findings.length - failed.length, 'passed,', failed.length, 'failed')
  if (failed.length) process.exit(1)
}
