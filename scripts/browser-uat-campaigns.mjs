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

page.on('dialog', async (dialog) => {
  await dialog.accept()
})

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

  await goto('/app/business/campaigns')
  await page.getByRole('heading', { name: 'Campaigns' }).waitFor({ timeout: 15000 })
  note(
    'campaign list',
    await page
      .locator('main, .app-shell__main')
      .innerText()
      .then((t) => t.slice(0, 120).replace(/\n/g, ' ')),
  )

  const title = `UAT Campaign ${Date.now()}`
  await goto('/app/business/campaigns/new')
  await page.getByLabel(/Campaign title/i).fill(title)
  const cat = page.getByLabel(/Category/i)
  await cat.selectOption({ index: 1 })
  await page.getByRole('button', { name: /Create draft/i }).click()
  await page.getByRole('heading', { name: title }).waitFor({ timeout: 20000 })
  note('create campaign', page.url())

  await page.getByRole('tab', { name: /Commercial version/i }).click()
  const createVersion = page.getByRole('button', {
    name: /Create draft version|New draft version/i,
  })
  if (await createVersion.count()) {
    await createVersion.first().click()
  }
  await page.getByLabel(/Product \/ service name/i).waitFor({ timeout: 15000 })
  await page.getByLabel(/Product \/ service name/i).fill('UAT Product Kit')
  await page.getByLabel(/Pricing method/i).selectOption('fixed')
  await page.getByLabel(/Price amount/i).fill('150000')
  await page.getByLabel(/Commission type/i).selectOption('percentage')
  await page.getByLabel(/Commission rate/i).fill('12')
  await page.getByLabel(/Commission trigger/i).selectOption('payment_confirmation')
  await page.getByLabel(/Payment deadline/i).fill('14')
  await page.getByLabel(/Refund \/ cancellation/i).fill('Standard UAT refund policy.')
  await page.getByLabel(/Destination name/i).fill('Ada Solar Ventures')
  await page.getByLabel(/^Provider$/i).fill('Bank transfer')
  await page.getByLabel(/Account identifier/i).fill('0123456789')
  await page.getByLabel(/Payment instructions/i).fill('Pay to Ada Solar business account.')
  await page.getByRole('button', { name: /Save draft/i }).click()
  await page.getByText(/Draft version saved/i).waitFor({ timeout: 15000 })
  note('save draft version', 'ok')

  await page.getByRole('button', { name: /Publish version/i }).click()
  await page.getByText(/Commercial version published/i).waitFor({ timeout: 20000 })
  note('publish version', 'ok')

  await page.getByRole('tab', { name: /Overview/i }).click()
  await page.getByRole('button', { name: /Submit for review/i }).click()
  await page.getByText(/Submitted for review|waiting for MarcatursHub review/i).waitFor({
    timeout: 20000,
  })
  note('submit campaign', 'submitted')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: title }).waitFor({ timeout: 15000 })
  await page.locator('.detail-aside').waitFor({ timeout: 15000 })
  const afterRefresh = await page.locator('.detail-aside').innerText()
  if (/submitted|review/i.test(afterRefresh)) note('refresh preserves status', 'ok')
  else fail('refresh preserves status', afterRefresh.slice(0, 200))

  // Existing seed campaign for lifecycle action visibility
  await goto('/app/business/campaigns')
  const first = page.locator('a.campaign-row').first()
  if (await first.count()) {
    await first.click()
    await page.waitForURL(/\/app\/business\/campaigns\/\d+/, { timeout: 15000 })
    note('open existing detail', page.url())
    const aside = await page.locator('.detail-aside').innerText()
    note('lifecycle panel', aside.slice(0, 160).replace(/\n/g, ' '))
  } else {
    note('open existing detail', 'no list rows (only empty CTA)')
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await goto('/app/business/campaigns')
  note(
    'mobile list',
    (await page.getByRole('heading', { name: 'Campaigns' }).isVisible()) ? 'ok' : 'missing',
  )

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.getByRole('button', { name: /sign out/i }).click()
  await page.getByLabel('Email').waitFor({ timeout: 15000 })
  note('logout', 'ok')
} catch (err) {
  fail('uncaught', String(err))
} finally {
  console.log('\n--- Page errors ---')
  console.log(pageErrors.length ? pageErrors.join('\n') : '(none)')
  console.log('\n--- Failed API ---')
  console.log(failedApi.length ? [...new Set(failedApi)].join('\n') : '(none)')
  const failed = findings.filter((f) => f.fail)
  console.log(`\nSummary: ${findings.length - failed.length} ok, ${failed.length} failed`)
  await browser.close()
  process.exit(failed.length ? 1 : 0)
}
