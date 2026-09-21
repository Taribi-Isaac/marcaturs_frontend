/**
 * MH-GATE-005 browser UAT (not CI).
 * Usage: node scripts/mh-gate-005-uat.mjs
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.MH_UAT_BASE_URL ?? 'http://localhost:5180'
const EMAIL = process.env.MH_UAT_EMAIL ?? 'ambassador.ada@demo.marcaturshub.test'
const PASSWORD = process.env.MH_UAT_PASSWORD ?? 'DemoPass123!'
const outDir = path.resolve('tmp/mh-gate-005-uat')
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

async function login(page, email, password = PASSWORD) {
  await goto(page, '/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/app\//, { timeout: 20000 })
}

async function registerFresh(page) {
  const stamp = Date.now()
  const email = `gate005.${stamp}@demo.marcaturshub.test`
  await goto(page, '/register?role=AMBASSADOR')
  await page.getByLabel(/full name/i).fill(`Gate005 Ambassador ${stamp}`)
  await page.getByLabel(/^email$/i).fill(email)
  await page.locator('#reg-password').fill(PASSWORD)
  await page.locator('#reg-password2').fill(PASSWORD)
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL(/\/app\//, { timeout: 25000 })
  return email
}

async function runViewport(browser, viewport, label) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()

  const freshEmail = await registerFresh(page)
  note(`${label}/register`, true, freshEmail)
  await shot(page, `${label}-register`)

  await goto(page, '/app/ambassador/settings')
  const notVerified = await page.getByText(/not verified/i).first().isVisible()
  const resend = await page.getByRole('button', { name: /resend verification email/i }).isVisible()
  note(`${label}/email-unverified`, notVerified && resend, `notVerified=${notVerified} resend=${resend}`)
  await shot(page, `${label}-settings-unverified`)

  await goto(page, '/app/ambassador/verification')
  const unavailable = await page.getByText(/verification unavailable/i).isVisible().catch(() => false)
  const emptyConfigured = await page
    .getByText(/no verification requirements configured/i)
    .isVisible()
    .catch(() => false)
  const notConfiguredCopy = await page
    .getByText(/verification is not currently configured for your account/i)
    .isVisible()
    .catch(() => false)
  const hasRequirementCards = await page
    .locator('.verification-requirement')
    .first()
    .isVisible()
    .catch(() => false)
  const submitBelow = await page.getByText(/submit the required items below/i).isVisible().catch(() => false)
  const emptyOk = emptyConfigured && notConfiguredCopy && !submitBelow
  const configuredOk = hasRequirementCards && !emptyConfigured
  note(
    `${label}/verification-fresh`,
    !unavailable && (emptyOk || configuredOk),
    `unavailable=${unavailable} empty=${emptyConfigured} notConfiguredCopy=${notConfiguredCopy} cards=${hasRequirementCards} submitBelow=${submitBelow}`,
  )
  await shot(page, `${label}-verification-fresh`)

  await page.getByRole('button', { name: /sign out/i }).click()
  await page.waitForURL(/\/(login)?$/, { timeout: 15000 }).catch(() => {})
  await goto(page, '/login')
  await page.getByLabel(/email/i).fill(EMAIL)
  await page.getByLabel(/password/i).fill(PASSWORD)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/app\//, { timeout: 20000 })
  await goto(page, '/app/ambassador/verification')
  const demoReq = await page.getByText(/demo/i).first().isVisible().catch(() => false)
  const notStartedOrProgress = await page
    .getByText(/not started|pending|verified|under review|action needed|more information/i)
    .first()
    .isVisible()
    .catch(() => false)
  note(`${label}/verification-seeded`, demoReq && notStartedOrProgress, `demo=${demoReq} status=${notStartedOrProgress}`)
  await shot(page, `${label}-verification-seeded`)

  await goto(page, '/app/ambassador/settings')
  await page.waitForSelector('.desk-page, .settings-page, h1', { timeout: 15000 }).catch(() => {})
  const verifiedOrStatus = await page.locator('body').innerText()
  note(
    `${label}/settings-seeded`,
    /email verified|verification|settings/i.test(verifiedOrStatus),
    verifiedOrStatus.slice(0, 120).replace(/\s+/g, ' '),
  )

  await page.getByRole('button', { name: /sign out/i }).click()
  await page.waitForURL(/\/login/, { timeout: 15000 }).catch(async () => {
    await goto(page, '/login')
  })
  await page.getByRole('heading', { name: /sign in/i }).waitFor({ timeout: 10000 })
  await goto(page, '/login?email_verified=1')
  await page.getByRole('heading', { name: /sign in/i }).waitFor({ timeout: 10000 })
  const verifiedNotice = await page.getByText(/your email is verified/i).isVisible().catch(() => false)
  note(`${label}/email-verified-notice`, verifiedNotice, 'login banner')

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
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ BASE, report }, null, 2))
console.log(`\nWrote ${outDir}/report.json (${failed.length} failures / ${report.length} checks)`)
process.exit(failed.length ? 1 : 0)
