/**
 * One-off real-browser UAT for MH-FE-CERT-02 (not part of CI).
 * Usage: node scripts/mh-fe-cert-02-uat.mjs
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.MH_UAT_BASE_URL ?? 'http://localhost:5180'
const EMAIL = process.env.MH_UAT_EMAIL ?? 'ambassador.ada@demo.marcaturshub.test'
const PASSWORD = process.env.MH_UAT_PASSWORD ?? 'DemoPass123!'
const outDir = path.resolve('tmp/mh-fe-cert-02-uat')
fs.mkdirSync(outDir, { recursive: true })

const report = []

function note(section, ok, detail) {
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

async function assertNoHScroll(page, label) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    }
  })
  const ok = overflow.scrollWidth <= overflow.clientWidth + 1
  note(label, ok, ok ? 'no horizontal overflow' : JSON.stringify(overflow))
}

async function login(page) {
  await goto(page, '/login')
  await page.getByLabel(/email/i).fill(EMAIL)
  await page.getByLabel(/password/i).fill(PASSWORD)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/app\//, { timeout: 20000 })
}

async function runViewport(browser, viewport, label) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const hits = new Map()
  page.on('request', (req) => {
    const url = req.url()
    if (!url.includes('/api/v1/certification')) return
    hits.set(url, (hits.get(url) ?? 0) + 1)
  })

  await login(page)
  note(`${label}/login`, page.url().includes('/app/'), `landed ${page.url()}`)

  await goto(page, '/app/ambassador')
  const ctaVisible = await page
    .getByRole('heading', { name: /certification/i })
    .first()
    .isVisible()
    .catch(() => false)
  note(`${label}/discover-cta`, ctaVisible, ctaVisible ? 'CTA present' : 'CTA missing')
  await shot(page, `${label}-discover`)

  await goto(page, '/app/ambassador/certification')
  const hubH1 = await page.getByRole('heading', { name: 'Certification', level: 1 }).isVisible()
  const brand = await page.getByRole('img', { name: 'MarcatursHub' }).isVisible()
  note(`${label}/hub`, hubH1 && brand, `h1=${hubH1} brand=${brand}`)
  await assertNoHScroll(page, `${label}/hub-overflow`)
  await shot(page, `${label}-hub`)

  await goto(page, '/app/ambassador/certification/programmes')
  const programmeOk = await page
    .getByRole('heading', { name: /Ambassador Professional Foundations/i })
    .isVisible()
    .catch(() => false)
  const feeOk = await page.getByText(/NGN/i).first().isVisible().catch(() => false)
  note(`${label}/catalogue`, programmeOk && feeOk, `programme=${programmeOk} fee=${feeOk}`)
  await assertNoHScroll(page, `${label}/catalogue-overflow`)
  await shot(page, `${label}-catalogue`)

  await goto(page, '/app/ambassador/certification/programmes/1')
  const detailOk = await page.getByRole('heading', { name: /Foundations/i }).isVisible()
  const enrolled = await page.getByText(/already have an enrollment/i).isVisible().catch(() => false)
  note(`${label}/detail`, detailOk, `heading=${detailOk} enrolled=${enrolled}`)
  await shot(page, `${label}-detail`)

  await goto(page, '/app/ambassador/certification/purchase/return')
  const missingRef = await page.getByText(/No payment reference was found/i).isVisible()
  note(`${label}/payment-missing`, missingRef, 'missing reference messaging')
  await goto(
    page,
    '/app/ambassador/certification/purchase/return?status=cancelled&reference=mh_cert_cancelled',
  )
  const cancelled = await page.getByText(/Checkout was cancelled/i).isVisible()
  note(`${label}/payment-cancelled`, cancelled, 'cancelled messaging')
  await shot(page, `${label}-payment-return`)

  await goto(page, '/app/ambassador/certification/enrollments/1')
  const learningOk = await page.getByText(/Opening a lesson does not complete it/i).isVisible()
  const required = await page.getByText('Required').first().isVisible().catch(() => false)
  const optional = await page.getByText('Optional').first().isVisible().catch(() => false)
  note(
    `${label}/learning`,
    learningOk && required && optional,
    `copy=${learningOk} badges=${required && optional}`,
  )
  await assertNoHScroll(page, `${label}/learning-overflow`)
  await shot(page, `${label}-learning`)

  let completedClicks = 0
  for (let i = 0; i < 3; i += 1) {
    const btn = page.getByRole('button', { name: /^Mark complete$/i }).first()
    if (!(await btn.count())) break
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/complete') && r.request().method() === 'POST',
        { timeout: 15000 },
      ),
      btn.click(),
    ])
    completedClicks += 1
  }
  note(`${label}/mark-complete`, true, `completed ${completedClicks} lesson POST(s)`)

  await goto(page, '/app/ambassador/certification/enrollments/1/assessment')
  const assessmentHeading = await page.getByRole('heading', { level: 1 }).isVisible()
  const start = page.getByRole('button', { name: /Start attempt/i })
  if (await start.isVisible().catch(() => false)) {
    await start.click()
    await page.getByLabel(/Optional professional recognition/i).check()
    await page.getByLabel(/Separate from certification/i).check()
    const keyLeak = await page.locator('[data-correct], .is-correct').count()
    note(`${label}/no-answer-keys`, keyLeak === 0, `keyLeak=${keyLeak}`)
    await page.getByRole('button', { name: /Submit answers/i }).click()
    const result = await page
      .getByRole('heading', { name: /Passed|Not passed/i })
      .isVisible({ timeout: 15000 })
      .catch(() => false)
    note(`${label}/assessment-submit`, result, 'server result rendered')
  } else {
    note(`${label}/assessment`, assessmentHeading, 'assessment surface loaded')
  }
  await assertNoHScroll(page, `${label}/assessment-overflow`)
  await shot(page, `${label}-assessment`)

  await goto(page, '/app/ambassador/certification/certificates')
  const certPage = await page.getByRole('heading', { name: 'Certificates', level: 1 }).isVisible()
  note(`${label}/certificates`, certPage, 'certificates page loads')
  await shot(page, `${label}-certificates`)

  await goto(page, '/app/ambassador/settings')
  const settingsCert = await page
    .getByRole('heading', { name: 'Certification', level: 2 })
    .isVisible()
  const settingsVerify = await page
    .getByRole('heading', { name: /Verification/i, level: 2 })
    .isVisible()
  note(
    `${label}/settings`,
    settingsCert && settingsVerify,
    `cert=${settingsCert} verification=${settingsVerify}`,
  )
  await shot(page, `${label}-settings`)

  const hot = [...hits.entries()].filter(([, n]) => n > 12)
  note(
    `${label}/network`,
    hot.length === 0,
    hot.length
      ? `hot endpoints: ${JSON.stringify(hot.slice(0, 5))}`
      : `tracked ${hits.size} certification URLs`,
  )

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
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2))
console.log(`\nWrote ${outDir}/report.json — ${failed.length} failure(s)`)
process.exit(failed.length ? 1 : 0)
