/**
 * MH-FE-022 password reset browser UAT (not CI).
 * Prerequisites: API :8000, FE :5180, Redis, queue worker drained by this script.
 * Usage: node scripts/mh-fe-022-password-reset-uat.mjs
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FE = process.env.MH_UAT_BASE_URL ?? 'http://localhost:5180'
const API = process.env.MH_UAT_API_URL ?? 'http://localhost:8000'
const PASSWORD = process.env.MH_UAT_PASSWORD ?? 'DemoPass123!'
const NEW_PASSWORD = process.env.MH_UAT_NEW_PASSWORD ?? 'DemoPass789!'
const BACKEND = path.resolve(__dirname, '../../backend')
const mailLog = path.join(BACKEND, 'storage/logs/mail.log')
const outDir = path.resolve(__dirname, '../tmp/mh-fe-022-uat')
fs.mkdirSync(outDir, { recursive: true })

const report = []
const note = (section, ok, detail) => {
  report.push({ section, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${section}] ${detail}`)
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: BACKEND, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', (d) => {
      out += d.toString()
    })
    child.stderr.on('data', (d) => {
      out += d.toString()
    })
    child.on('close', (code) => {
      if (code === 0) resolve(out)
      else reject(new Error(`${cmd} ${args.join(' ')} failed (${code}): ${out}`))
    })
  })
}

async function clearQueue() {
  return run('php', ['artisan', 'queue:clear', 'redis', '--force'])
}

async function queueOnce() {
  return run('php', ['artisan', 'queue:work', 'redis', '--once', '--queue=default'])
}

async function drainUntil(beforeSize, subjectRe, recipientEmail, maxJobs = 40) {
  const recipientRe = new RegExp(
    `To:.*${recipientEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'i',
  )
  for (let i = 0; i < maxJobs; i++) {
    const out = await queueOnce()
    const after = fs.existsSync(mailLog) ? fs.readFileSync(mailLog, 'utf8') : ''
    const slice = after.slice(beforeSize)
    if (subjectRe.test(slice) && recipientRe.test(slice)) {
      return { slice, matched: true, jobs: i + 1 }
    }
    if (/No jobs/i.test(out)) break
  }
  const after = fs.existsSync(mailLog) ? fs.readFileSync(mailLog, 'utf8') : ''
  return { slice: after.slice(beforeSize), matched: false, jobs: maxJobs }
}

async function goto(page, url) {
  await page.goto(`${FE}${url}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
}

async function registerVerified(page, email) {
  await clearQueue()
  const before = fs.existsSync(mailLog) ? fs.statSync(mailLog).size : 0
  await goto(page, '/register?role=AMBASSADOR')
  await page.getByLabel(/full name/i).fill(`Fe022 ${Date.now()}`)
  await page.getByLabel(/^email$/i).fill(email)
  await page.locator('#reg-password').fill(PASSWORD)
  await page.locator('#reg-password2').fill(PASSWORD)
  await page.getByRole('button', { name: /create account/i }).click()
  await page.getByRole('heading', { name: /verify your email to continue/i }).waitFor({
    timeout: 25000,
  })
  const drain = await drainUntil(before, /Verify your MarcatursHub email address/i, email)
  const block = drain.slice.includes(`To: ${email}`)
    ? drain.slice.slice(drain.slice.lastIndexOf(`To: ${email}`))
    : drain.slice
  const link = block.match(/https?:\/\/[^\s"'<>]+\/api\/v1\/auth\/email\/verify\/[^\s"'<>]+/i)
  if (!link) throw new Error('verify link missing')
  await page.goto(link[0].replace(/&amp;/g, '&'), { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  await goto(page, '/app/ambassador')
  if (
    await page
      .getByRole('heading', { name: /verify your email/i })
      .isVisible()
      .catch(() => false)
  ) {
    await page.getByRole('button', { name: /i have verified/i }).click()
    await page.waitForTimeout(1000)
    await goto(page, '/app/ambassador')
  }
  const home = await page
    .getByRole('heading', { name: /welcome back/i })
    .isVisible()
    .catch(() => false)
  if (!home) throw new Error('could not verify account for UAT')
}

async function runViewport(browser, viewport, label) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const stamp = Date.now()
  const email = `fe022.${stamp}@demo.marcaturshub.test`

  await registerVerified(page, email)
  note(`${label}/register-verify`, true, email)

  await page.evaluate(async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      /* ignore */
    }
  })

  await goto(page, '/forgot-password')
  await page.getByLabel(/^email$/i).fill(email)
  const resetBefore = fs.existsSync(mailLog) ? fs.statSync(mailLog).size : 0
  await page.getByRole('button', { name: /send reset link/i }).click()
  await page.getByText(/if that email address is registered/i).waitFor({ timeout: 15000 })
  note(`${label}/forgot-submitted`, true, 'anti-enumeration success shown')

  const resetDrain = await drainUntil(resetBefore, /Reset your MarcatursHub password/i, email)
  note(`${label}/mail-log-reset`, resetDrain.matched, `jobs=${resetDrain.jobs}`)
  const resetBlock = resetDrain.slice.includes(`To: ${email}`)
    ? resetDrain.slice.slice(resetDrain.slice.lastIndexOf(`To: ${email}`))
    : resetDrain.slice
  const resetMatch = resetBlock.match(/https?:\/\/[^\s"'<>]*\/reset-password\?[^\s"'<>]+/i)
  note(`${label}/reset-link`, Boolean(resetMatch), resetMatch ? 'link found' : 'missing')

  if (resetMatch) {
    const resetUrl = resetMatch[0].replace(/&amp;/g, '&')
    const parsed = new URL(resetUrl)
    const pathWithQuery = `${parsed.pathname}${parsed.search}`
    await goto(page, pathWithQuery)
    await page.getByRole('heading', { name: /choose a new password/i }).waitFor({ timeout: 15000 })
    await page.locator('#reset-password').fill(NEW_PASSWORD)
    await page.locator('#reset-password2').fill(NEW_PASSWORD)
    await page.getByRole('button', { name: /^reset password$/i }).click()
    await page.getByRole('heading', { name: /password updated/i }).waitFor({ timeout: 15000 })
    note(`${label}/reset-success`, true, 'success state')
    await page
      .locator('#main')
      .getByRole('link', { name: /^sign in$/i })
      .click()
    await page.waitForTimeout(1000)

    // Password reset keeps the SPA cookie session; GuestOnly may already land on /app.
    let home = await page
      .getByRole('heading', { name: /welcome back/i })
      .isVisible()
      .catch(() => false)

    if (
      !home &&
      (await page
        .locator('#login-email')
        .isVisible()
        .catch(() => false))
    ) {
      await page.locator('#login-email').fill(email)
      await page.locator('#login-password').fill(NEW_PASSWORD)
      await page.getByRole('button', { name: /sign in/i }).click()
      await page.waitForURL(/\/app\//, { timeout: 20000 }).catch(() => {})
    }

    if (!home) {
      await goto(page, '/app/ambassador')
      await page
        .getByRole('heading', { name: /welcome back/i })
        .waitFor({ timeout: 20000 })
        .catch(() => {})
      home = await page
        .getByRole('heading', { name: /welcome back/i })
        .isVisible()
        .catch(() => false)
    }

    // Prove new password works via API (authoritative for MH-FE-022 credential check).
    const loginRes = await fetch(`${API}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password: NEW_PASSWORD }),
    })
    let loginOk = false
    try {
      const body = await loginRes.json()
      loginOk = Boolean(loginRes.ok && body?.data?.user?.email === email)
    } catch {
      loginOk = false
    }
    note(
      `${label}/login-new-password`,
      home && loginOk,
      `home=${home} apiLogin=${loginOk} url=${page.url()}`,
    )
  }

  await goto(page, '/reset-password')
  const missing = await page
    .getByRole('heading', { name: /reset link incomplete/i })
    .isVisible()
    .catch(() => false)
  note(`${label}/missing-params`, missing, 'missing token/email state')

  await goto(page, '/reset-password?token=not-real&email=nobody@example.com')
  await page.locator('#reset-password').fill(NEW_PASSWORD)
  await page.locator('#reset-password2').fill('DifferentPass1!')
  await page.getByRole('button', { name: /^reset password$/i }).click()
  const mismatch = await page
    .getByText(/passwords must match/i)
    .isVisible()
    .catch(() => false)
  note(`${label}/mismatch`, mismatch, 'client mismatch validation')

  // Fresh navigation so client validation state cannot block the invalid-token submit.
  await goto(page, '/reset-password?token=not-real&email=nobody@example.com')
  await page.locator('#reset-password').fill(NEW_PASSWORD)
  await page.locator('#reset-password2').fill(NEW_PASSWORD)
  await page.locator('form.stack').evaluate((form) => {
    if (form instanceof HTMLFormElement) form.requestSubmit()
  })
  await page
    .getByRole('heading', { name: /reset link unavailable/i })
    .waitFor({ timeout: 15000 })
    .catch(() => {})
  const invalid = await page
    .getByRole('heading', { name: /reset link unavailable/i })
    .isVisible()
    .catch(() => false)
  note(`${label}/invalid-token`, invalid, 'invalid token recovery')

  await page.screenshot({ path: path.join(outDir, `${label}-end.png`), fullPage: true })
  await context.close()
}

const browser = await chromium.launch({ headless: true })
try {
  await runViewport(browser, { width: 1280, height: 800 }, 'desktop')
  await new Promise((r) => setTimeout(r, 65000))
  await runViewport(browser, { width: 390, height: 844 }, 'mobile')
} finally {
  await browser.close()
}

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2))
const failed = report.filter((r) => !r.ok)
console.log(`\n${report.length - failed.length}/${report.length} checks passed`)
process.exit(failed.length ? 1 : 0)
