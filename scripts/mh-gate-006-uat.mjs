/**
 * MH-GATE-006 browser UAT (not CI).
 * Usage: node scripts/mh-gate-006-uat.mjs
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.MH_UAT_BASE_URL ?? 'http://localhost:5180'
const EMAIL = process.env.MH_UAT_EMAIL ?? 'ambassador.ada@demo.marcaturshub.test'
const PASSWORD = process.env.MH_UAT_PASSWORD ?? 'DemoPass123!'
const ADMIN_EMAIL = process.env.MH_UAT_ADMIN_EMAIL ?? 'admin.primary@demo.marcaturshub.test'
const outDir = path.resolve('tmp/mh-gate-006-uat')
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
  await page.getByLabel(/^email$/i).waitFor({ timeout: 15000 })
  await page.getByLabel(/^email$/i).fill(email)
  await page.getByLabel(/^password$/i).fill(password)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
}

async function signOutIfPossible(page) {
  const button = page.getByRole('button', { name: /sign out/i })
  if (await button.isVisible().catch(() => false)) {
    await button.click()
    await page.getByRole('heading', { name: /^sign in$/i }).waitFor({ timeout: 15000 }).catch(() => {})
  }
}

async function registerFresh(page) {
  const stamp = Date.now()
  const email = `gate006.${stamp}@demo.marcaturshub.test`
  await goto(page, '/register?role=AMBASSADOR')
  await page.getByLabel(/full name/i).fill(`Gate006 Ambassador ${stamp}`)
  await page.getByLabel(/^email$/i).fill(email)
  await page.locator('#reg-password').fill(PASSWORD)
  await page.locator('#reg-password2').fill(PASSWORD)
  await page.getByRole('button', { name: /create account/i }).click()
  try {
    await page.getByRole('heading', { name: /verify your email to continue/i }).waitFor({
      timeout: 25000,
    })
  } catch (error) {
    await shot(page, `register-failed-${stamp}`)
    const alert = await page.locator('[role="alert"], .alert--danger, .field-error').allTextContents()
    throw new Error(
      `Email verification gate not shown after register. url=${page.url()} alerts=${JSON.stringify(alert)}`,
    )
  }
  return email
}

async function runViewport(browser, viewport, label) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()

  const freshEmail = await registerFresh(page)
  note(`${label}/register-gate`, true, freshEmail)
  await shot(page, `${label}-register-gate`)

  await goto(page, '/app/ambassador/discover')
  const stillGated = await page
    .getByRole('heading', { name: /verify your email to continue/i })
    .isVisible()
    .catch(() => false)
  note(`${label}/unverified-blocked`, stillGated, 'authenticated product remains gated')
  await shot(page, `${label}-unverified-blocked`)

  await signOutIfPossible(page)

  await login(page, EMAIL)
  await page.waitForURL(/\/app\/ambassador/, { timeout: 20000 })
  await page.getByRole('heading', { name: /welcome back/i }).waitFor({ timeout: 20000 })
  const homeOk = await page.getByRole('heading', { name: /welcome back/i }).isVisible()
  note(`${label}/verified-home`, homeOk, 'seeded ambassador home')
  await shot(page, `${label}-home`)

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  const refreshOk = await page
    .getByRole('heading', { name: /welcome back/i })
    .isVisible()
    .catch(() => false)
  note(`${label}/refresh`, refreshOk, 'session survives refresh')

  await goto(page, '/app/ambassador/discover')
  const hero = await page
    .getByRole('heading', { name: /find an offer worth promoting/i })
    .isVisible()
  note(`${label}/discover-hero`, hero, 'marketplace hero')
  await shot(page, `${label}-discover`)

  await goto(page, '/app/ambassador/messages')
  const noUserIdForm = !(await page
    .getByText(/start or reopen a conversation using user id/i)
    .isVisible()
    .catch(() => false))
  note(`${label}/messages-no-userid`, noUserIdForm, 'user-ID start form absent')
  await shot(page, `${label}-messages`)

  await goto(page, '/app/ambassador/certification')
  const cert = await page.getByRole('heading', { name: /^certification$/i }).isVisible()
  note(`${label}/certification`, cert, 'cert hub')
  await shot(page, `${label}-cert`)

  await goto(page, '/app/ambassador/verification')
  const verification = await page.getByRole('heading', { name: /^verification$/i }).isVisible()
  note(`${label}/verification`, verification, 'participant verification page')
  await shot(page, `${label}-verification`)

  await goto(page, '/app/ambassador/settings')
  const settings = await page.getByRole('heading', { name: /^settings$/i }).isVisible()
  note(`${label}/settings`, settings, 'settings')
  await shot(page, `${label}-settings`)

  await goto(page, '/for-ambassadors')
  const teaser = await page
    .getByRole('heading', { name: /ambassador professional certification/i })
    .isVisible()
  note(`${label}/public-cert-teaser`, teaser, 'for-ambassadors teaser')
  await shot(page, `${label}-public-teaser`)

  await goto(page, '/app/ambassador')
  await signOutIfPossible(page)
  await login(page, ADMIN_EMAIL)
  const loginHint = await page
    .getByText(/admin control/i)
    .waitFor({ timeout: 20000 })
    .then(() => true)
    .catch(() => false)
  const forbidden = await page
    .getByRole('heading', { name: /this app is for marketplace participants/i })
    .isVisible()
    .catch(() => false)
  note(
    `${label}/admin-on-participant`,
    forbidden || loginHint,
    `forbidden=${forbidden} loginHint=${loginHint}`,
  )
  await shot(page, `${label}-admin`)

  await context.close()
}

const browser = await chromium.launch({ headless: true })
try {
  await runViewport(browser, { width: 1280, height: 800 }, 'desktop')
  await runViewport(browser, { width: 390, height: 844 }, 'mobile')
} finally {
  await browser.close()
}

const failed = report.filter((row) => !row.ok)
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2))
console.log(`\n${report.length - failed.length}/${report.length} checks passed`)
if (failed.length) process.exit(1)
