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
const consoleErrors = []
const pageErrors = []
const failedRequests = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => pageErrors.push(String(err)))
page.on('response', (res) => {
  const url = res.url()
  if ((url.includes('/api/') || url.includes('/sanctum/')) && res.status() >= 400) {
    failedRequests.push(`${res.status()} ${url}`)
  }
})

async function softGoto(pathName) {
  await page.goto(BASE + pathName, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForLoadState('networkidle').catch(() => undefined)
  return 200
}

try {
  let status = await softGoto('/')
  status === 200 ? note('homepage status', '200') : fail('homepage status', String(status))
  note(
    'homepage hero',
    ((await page.locator('h1').first().textContent()) || '').trim().slice(0, 120),
  )
  const hasCta =
    (await page
      .getByRole('link', { name: /explore|discover|get started|create account|browse/i })
      .count()) > 0
  hasCta ? note('homepage CTAs', 'present') : fail('homepage CTAs', 'missing')

  status = await softGoto('/discover')
  note('discover status', String(status))
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 10000 })
  const listingText = await page.locator('main').innerText()
  if (/solar|campaign|opportunit|tech/i.test(listingText))
    note('discover marketplace', 'content visible')
  else fail('discover marketplace', listingText.slice(0, 200))

  const campaignHref = await page.locator('a[href*="/campaigns/"]').first().getAttribute('href')
  if (campaignHref) {
    await softGoto(campaignHref)
    await page.locator('main h1').waitFor({ timeout: 15000 })
    note('campaign detail route', page.url())
    const detail = await page.locator('main').innerText()
    if (new RegExp('commission|business|register|sign\\s*in', 'i').test(detail)) {
      note('campaign detail content', 'ok')
    } else {
      fail('campaign detail content', detail.slice(0, 240))
    }
  } else {
    fail('campaign detail', 'no campaign links')
  }

  for (const p of [
    '/how-it-works',
    '/for-businesses',
    '/for-ambassadors',
    '/about',
    '/contact',
    '/faq',
    '/terms',
    '/privacy',
    '/register',
  ]) {
    status = await softGoto(p)
    status === 200 ? note('static ' + p, '200') : fail('static ' + p, String(status))
  }

  await softGoto('/login')
  note('login heading', ((await page.locator('h1').first().textContent()) || '').trim())
  await page.getByLabel('Email').fill('business.solar@demo.marcaturshub.test')
  await page.getByLabel('Password').fill('DemoPass123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/app\/business/, { timeout: 25000 })
  note('business shell', page.url())
  const bizNav = await page.locator('aside').first().innerText()
  if (
    ['Dashboard', 'Campaigns', 'Deals', 'Messages', 'Commissions'].every((x) => bizNav.includes(x))
  ) {
    note('business nav', 'ok')
  } else {
    fail('business nav', bizNav.slice(0, 200))
  }

  await page.getByRole('button', { name: /sign out/i }).click()
  await page.getByLabel('Email').waitFor({ timeout: 15000 })

  await page.getByLabel('Email').fill('ambassador.ada@demo.marcaturshub.test')
  await page.getByLabel('Password').fill('DemoPass123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/app\/ambassador/, { timeout: 25000 })
  note('ambassador shell', page.url())
  const ambNav = await page.locator('aside').first().innerText()
  if (
    ['Discover', 'Deals', 'Earnings', 'Messages', 'Verification'].every((x) => ambNav.includes(x))
  ) {
    note('ambassador nav', 'ok')
  } else {
    fail('ambassador nav', ambNav.slice(0, 200))
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await softGoto('/')
  note('mobile 390 hero', (await page.locator('h1').first().isVisible()) ? 'visible' : 'hidden')
  await softGoto('/discover')
  note(
    'mobile discover',
    (await page.locator('main').innerText()).slice(0, 100).replace(/\n/g, ' '),
  )

  await page.setViewportSize({ width: 768, height: 1024 })
  await softGoto('/')
  note('tablet 768 hero', (await page.locator('h1').first().isVisible()) ? 'visible' : 'hidden')

  await page.setViewportSize({ width: 1280, height: 800 })
  const api = await page.request.get('http://localhost:8000/api/v1/marketplace/campaigns')
  const json = await api.json()
  const id = json?.data?.[0]?.id
  if (id) {
    await softGoto('/campaigns/' + id)
    await page.locator('main h1').waitFor({ timeout: 15000 })
    await page.reload({ waitUntil: 'networkidle' })
    await page.locator('main h1').waitFor({ timeout: 15000 })
    note('refresh campaign detail', page.url())
  }
} catch (err) {
  fail('uncaught', String(err))
} finally {
  const authMe401 = failedRequests.filter((r) => r.includes('/auth/me') && r.startsWith('401'))
  const otherFailed = [
    ...new Set(failedRequests.filter((r) => !(r.includes('/auth/me') && r.startsWith('401')))),
  ]
  console.log('\n--- Console errors (excl. expected guest 401 noise filtered below) ---')
  const meaningfulConsole = consoleErrors.filter((e) => !e.includes('401'))
  console.log(meaningfulConsole.length ? meaningfulConsole.join('\n') : '(none)')
  console.log('\n--- Page errors ---')
  console.log(pageErrors.length ? pageErrors.join('\n') : '(none)')
  console.log('\n--- Failed API (non-auth/me) ---')
  console.log(otherFailed.length ? otherFailed.join('\n') : '(none)')
  console.log(`--- Guest /auth/me 401 count: ${authMe401.length} (expected for public pages) ---`)
  const failed = findings.filter((f) => f.fail)
  console.log(`\nSummary: ${findings.length - failed.length} ok, ${failed.length} failed`)
  await browser.close()
  process.exit(failed.length ? 1 : 0)
}
