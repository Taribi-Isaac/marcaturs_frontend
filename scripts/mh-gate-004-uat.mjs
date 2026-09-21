/**
 * MH-GATE-004 browser UAT (not CI).
 * Usage: node scripts/mh-gate-004-uat.mjs
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.MH_UAT_BASE_URL ?? 'http://localhost:5180'
const API = process.env.MH_UAT_API_URL ?? 'http://localhost:8000'
const EMAIL = process.env.MH_UAT_EMAIL ?? 'ambassador.ada@demo.marcaturshub.test'
const PASSWORD = process.env.MH_UAT_PASSWORD ?? 'DemoPass123!'
const outDir = path.resolve('tmp/mh-gate-004-uat')
fs.mkdirSync(outDir, { recursive: true })

const report = []
const note = (section, ok, detail) => {
  report.push({ section, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${section}] ${detail}`)
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true })
}

async function goto(page, url) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
}

async function login(page, email = EMAIL, password = PASSWORD) {
  await goto(page, '/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/app\//, { timeout: 20000 })
}

async function registerFreshAmbassador(page) {
  const stamp = Date.now()
  const email = `gate004.${stamp}@demo.marcaturshub.test`
  const password = 'DemoPass123!'
  await goto(page, '/register?role=AMBASSADOR')
  await page.getByLabel(/full name/i).fill(`Gate004 Ambassador ${stamp}`)
  await page.getByLabel(/^email$/i).fill(email)
  await page.locator('#reg-password').fill(password)
  await page.locator('#reg-password2').fill(password)
  const role = page.locator('#reg-role')
  if (await role.count()) await role.selectOption('AMBASSADOR')
  await page.getByRole('button', { name: /create account|register|sign up/i }).click()
  await page.waitForURL(/\/app\//, { timeout: 25000 })
  return { email, password }
}

async function runViewport(browser, viewport, label) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const apiBodies = []
  page.on('response', async (res) => {
    const url = res.url()
    if (!url.includes('/api/v1/')) return
    if (
      url.includes('/verification/status') ||
      url.includes('/conversations') ||
      url.includes('/purchase/initialize')
    ) {
      try {
        apiBodies.push({
          url,
          status: res.status(),
          body: await res.json().catch(() => null),
        })
      } catch {
        /* ignore */
      }
    }
  })

  // Fresh registration path
  let fresh
  try {
    fresh = await registerFreshAmbassador(page)
    note(`${label}/register`, true, `registered ${fresh.email}`)
  } catch (err) {
    note(`${label}/register`, false, String(err))
    await login(page)
    fresh = null
  }
  await shot(page, `${label}-after-register`)

  await goto(page, '/app/ambassador/settings')
  const emailNotVerified = await page.getByText(/not verified/i).first().isVisible().catch(() => false)
  const resendVisible = await page
    .getByRole('button', { name: /resend verification email/i })
    .isVisible()
    .catch(() => false)
  note(
    `${label}/email-verification-ux`,
    fresh ? emailNotVerified && resendVisible : true,
    `notVerified=${emailNotVerified} resend=${resendVisible}`,
  )
  await shot(page, `${label}-settings`)

  await goto(page, '/app/ambassador/verification')
  const unavailable = await page.getByText(/verification unavailable/i).isVisible().catch(() => false)
  const emptyConfigured = await page
    .getByText(/no verification requirements configured/i)
    .isVisible()
    .catch(() => false)
  const hasRequirements = await page.getByRole('heading', { name: /requirements/i }).isVisible().catch(() => false)
  const statusHit = apiBodies.find((r) => r.url.includes('/verification/status'))
  note(
    `${label}/verification`,
    !unavailable || Boolean(statusHit?.status === 403),
    `unavailable=${unavailable} empty=${emptyConfigured} requirementsHeading=${hasRequirements} api=${statusHit?.status ?? 'n/a'} msg=${statusHit?.body?.error?.message ?? statusHit?.body?.data?.overall_status ?? 'n/a'}`,
  )
  await shot(page, `${label}-verification`)

  await goto(page, '/discover')
  const campaignHref = await page.locator('a[href*="/campaigns/"]').first().getAttribute('href')
  if (!campaignHref) {
    note(`${label}/marketplace`, false, 'no campaign links')
  } else {
    await goto(page, campaignHref.replace(BASE, ''))
    const messageBtn = page.getByRole('button', { name: /message business/i })
    const messageVisible = await messageBtn.isVisible().catch(() => false)
    note(`${label}/message-cta`, messageVisible, `href=${campaignHref} visible=${messageVisible}`)
    await shot(page, `${label}-campaign`)

    if (messageVisible) {
      await messageBtn.click()
      await page.waitForURL(/\/app\/ambassador\/messages\/\d+/, { timeout: 20000 }).catch(() => {})
      const onThread = /\/messages\/\d+/.test(page.url())
      note(`${label}/message-open`, onThread, `url=${page.url()}`)
      await shot(page, `${label}-chat`)
    }
  }

  await goto(page, '/app/ambassador/certification/programmes')
  const programmeLink = page.locator('a[href*="/certification/programmes/"]').first()
  if (await programmeLink.count()) {
    await programmeLink.click()
    await page.waitForLoadState('networkidle').catch(() => {})
    const payBtn = page.getByRole('button', { name: /pay and enroll/i })
    if (await payBtn.isVisible().catch(() => false)) {
      await payBtn.click()
      await page.waitForTimeout(1500)
      const text = await page.locator('main').innerText()
      const leak = /platform payments are not configured/i.test(text)
      const safe = /temporarily unavailable|opening paystack|already have an enrollment/i.test(text)
      note(`${label}/payment-error`, !leak && safe, leak ? 'LEAKED technical message' : text.slice(0, 180))
    } else {
      note(`${label}/payment-error`, true, 'pay button not shown (likely already enrolled)')
    }
    await shot(page, `${label}-cert-purchase`)
  } else {
    note(`${label}/payment-error`, false, 'no programmes listed')
  }

  // API sanity: payment config message when secret empty is covered by PHPUnit;
  // browser path records whatever the live env returns.
  const initHit = apiBodies.find((r) => r.url.includes('/purchase/initialize'))
  if (initHit) {
    const msg = initHit.body?.error?.message ?? ''
    note(
      `${label}/payment-api`,
      !/not configured/i.test(msg),
      `status=${initHit.status} message=${msg || 'ok'}`,
    )
  }

  await context.close()
}

const browser = await chromium.launch({ headless: true })
try {
  await runViewport(browser, { width: 1280, height: 800 }, 'desktop')
  await runViewport(browser, { width: 390, height: 844 }, 'mobile')
} finally {
  await browser.close()
}

const failed = report.filter((r) => !r.ok)
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ BASE, API, report }, null, 2))
console.log(`\nWrote ${outDir}/report.json (${failed.length} failures / ${report.length} checks)`)
process.exit(failed.length ? 1 : 0)
