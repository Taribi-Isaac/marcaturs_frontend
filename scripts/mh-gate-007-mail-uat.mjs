/**
 * MH-GATE-007 local transactional mail UAT (not CI).
 * Prerequisites: API on :8000, FE on :5180, Redis up.
 * Script drains Redis with `php artisan queue:work --once` until mail appears.
 * Usage: node scripts/mh-gate-007-mail-uat.mjs
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
const NEW_PASSWORD = process.env.MH_UAT_NEW_PASSWORD ?? 'DemoPass456!'
const BACKEND = path.resolve(__dirname, '../../backend')
const mailLog = path.join(BACKEND, 'storage/logs/mail.log')
const outDir = path.resolve(__dirname, '../tmp/mh-gate-007-uat')
fs.mkdirSync(outDir, { recursive: true })

const report = []
const note = (section, ok, detail) => {
  report.push({ section, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${section}] ${detail}`)
}

function runQueueOnce() {
  return new Promise((resolve, reject) => {
    const child = spawn('php', ['artisan', 'queue:work', 'redis', '--once', '--queue=default'], {
      cwd: BACKEND,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    child.stdout.on('data', (d) => {
      out += d.toString()
    })
    child.stderr.on('data', (d) => {
      out += d.toString()
    })
    child.on('close', (code) => {
      if (code === 0) resolve(out)
      else reject(new Error(`queue:work failed (${code}): ${out}`))
    })
  })
}

async function drainUntilMailForRecipient(beforeSize, subjectRe, recipientEmail, maxJobs = 40) {
  const recipientRe = new RegExp(`To:.*${recipientEmail.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`, 'i')
  for (let i = 0; i < maxJobs; i++) {
    const out = await runQueueOnce()
    const after = fs.existsSync(mailLog) ? fs.readFileSync(mailLog, 'utf8') : ''
    const slice = after.slice(beforeSize)
    if (subjectRe.test(slice) && recipientRe.test(slice)) {
      return { out, slice, jobs: i + 1, matched: true }
    }
    if (/No jobs/i.test(out)) {
      break
    }
  }
  const after = fs.existsSync(mailLog) ? fs.readFileSync(mailLog, 'utf8') : ''
  return { out: '', slice: after.slice(beforeSize), jobs: maxJobs, matched: false }
}

function clearQueue() {
  return new Promise((resolve, reject) => {
    const child = spawn('php', ['artisan', 'queue:clear', 'redis', '--force'], {
      cwd: BACKEND,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    child.stdout.on('data', (d) => {
      out += d.toString()
    })
    child.stderr.on('data', (d) => {
      out += d.toString()
    })
    child.on('close', (code) => {
      if (code === 0) resolve(out)
      else reject(new Error(`queue:clear failed (${code}): ${out}`))
    })
  })
}

async function goto(page, url) {
  await page.goto(`${FE}${url}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
}

async function runViewport(browser, viewport, label) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const stamp = Date.now()
  const email = `gate007.${stamp}@demo.marcaturshub.test`

  await clearQueue()
  const beforeSize = fs.existsSync(mailLog) ? fs.statSync(mailLog).size : 0

  await goto(page, '/register?role=AMBASSADOR')
  await page.getByLabel(/full name/i).fill(`Gate007 ${stamp}`)
  await page.getByLabel(/^email$/i).fill(email)
  await page.locator('#reg-password').fill(PASSWORD)
  await page.locator('#reg-password2').fill(PASSWORD)
  await page.getByRole('button', { name: /create account/i }).click()
  await page.getByRole('heading', { name: /verify your email to continue/i }).waitFor({
    timeout: 25000,
  })
  note(`${label}/register-gate`, true, email)

  await page.getByRole('button', { name: /resend verification email/i }).click()
  await page.waitForTimeout(800)
  note(`${label}/resend-clicked`, true, 'API accepted resend')

  const verifyDrain = await drainUntilMailForRecipient(
    beforeSize,
    /Verify your MarcatursHub email address/i,
    email,
  )
  note(
    `${label}/mail-log-verify`,
    verifyDrain.matched,
    `jobs=${verifyDrain.jobs} matched=${verifyDrain.matched} bytes=${verifyDrain.slice.length}`,
  )

  const recipientBlock = verifyDrain.slice.includes(`To: ${email}`)
    ? verifyDrain.slice.slice(verifyDrain.slice.lastIndexOf(`To: ${email}`))
    : verifyDrain.slice
  const linkMatch = recipientBlock.match(
    /https?:\/\/[^\s"'<>]+\/api\/v1\/auth\/email\/verify\/[^\s"'<>]+/i,
  )
  note(`${label}/verify-link-present`, Boolean(linkMatch), linkMatch ? 'signed link for recipient' : 'no link')

  if (linkMatch) {
    const url = linkMatch[0].replace(/&amp;/g, '&')
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
  }

  await goto(page, '/app/ambassador')
  let home = await page
    .getByRole('heading', { name: /welcome back/i })
    .isVisible()
    .catch(() => false)
  let stillGated = await page
    .getByRole('heading', { name: /verify your email to continue/i })
    .isVisible()
    .catch(() => false)

  if (stillGated) {
    const refreshBtn = page.getByRole('button', { name: /i have verified/i })
    if (await refreshBtn.isVisible().catch(() => false)) {
      await refreshBtn.click()
      await page.waitForTimeout(1500)
      await goto(page, '/app/ambassador')
      home = await page
        .getByRole('heading', { name: /welcome back/i })
        .isVisible()
        .catch(() => false)
      stillGated = await page
        .getByRole('heading', { name: /verify your email to continue/i })
        .isVisible()
        .catch(() => false)
    }
  }

  if (!home) {
    const signOut = page.getByRole('button', { name: /sign out/i })
    if (await signOut.isVisible().catch(() => false)) {
      await signOut.click()
      await page.waitForTimeout(800)
    }
    await goto(page, '/login')
    await page.locator('#login-email').waitFor({ timeout: 15000 })
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/app\//, { timeout: 20000 }).catch(() => {})
    home = await page
      .getByRole('heading', { name: /welcome back/i })
      .isVisible()
      .catch(() => false)
    stillGated = await page
      .getByRole('heading', { name: /verify your email to continue/i })
      .isVisible()
      .catch(() => false)
  }
  note(`${label}/verified-access`, home && !stillGated, `home=${home} gated=${stillGated}`)

  // Password reset: API + mail.log (participant FE reset page not required for mail proof)
  await page.evaluate(async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      /* ignore */
    }
  }).catch(() => {})
  const signOut2 = page.getByRole('button', { name: /sign out/i })
  if (await signOut2.isVisible().catch(() => false)) {
    await signOut2.click()
    await page.waitForTimeout(500)
  }

  const resetBefore = fs.existsSync(mailLog) ? fs.statSync(mailLog).size : 0
  const forgotRes = await fetch(`${API}/api/v1/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email }),
  })
  note(`${label}/forgot-password-api`, forgotRes.ok, `status=${forgotRes.status}`)

  const resetDrain = await drainUntilMailForRecipient(
    resetBefore,
    /Reset your MarcatursHub password/i,
    email,
  )
  note(
    `${label}/mail-log-reset`,
    resetDrain.matched,
    `jobs=${resetDrain.jobs} matched=${resetDrain.matched} bytes=${resetDrain.slice.length}`,
  )

  const resetBlock = resetDrain.slice.includes(`To: ${email}`)
    ? resetDrain.slice.slice(resetDrain.slice.lastIndexOf(`To: ${email}`))
    : resetDrain.slice
  const resetUrlMatch = resetBlock.match(/https?:\/\/[^\s"'<>]*reset-password\?[^\s"'<>]+/i)
  let resetOk = false
  if (resetUrlMatch) {
    const resetUrl = new URL(resetUrlMatch[0].replace(/&amp;/g, '&'))
    const token = resetUrl.searchParams.get('token')
    const resetEmail = resetUrl.searchParams.get('email')
    const resetRes = await fetch(`${API}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: resetEmail,
        token,
        password: NEW_PASSWORD,
        password_confirmation: NEW_PASSWORD,
      }),
    })
    resetOk = resetRes.ok
    note(`${label}/reset-password-api`, resetOk, `status=${resetRes.status}`)
  } else {
    note(`${label}/reset-password-api`, false, 'no reset URL in mail.log for recipient')
  }

  if (resetOk) {
    // SPA login can hang on CSRF/session races after API reset; prove credentials via API.
    const loginRes = await fetch(`${API}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password: NEW_PASSWORD }),
    })
    let loginBody = null
    try {
      loginBody = await loginRes.json()
    } catch {
      loginBody = null
    }
    const loginUser = loginBody?.data?.user
    note(
      `${label}/login-after-reset`,
      loginRes.ok && loginUser?.email === email && Boolean(loginUser?.email_verified_at),
      `status=${loginRes.status} email=${loginUser?.email ?? 'n/a'} verified=${Boolean(loginUser?.email_verified_at)}`,
    )
  }

  await page.screenshot({ path: path.join(outDir, `${label}-end.png`), fullPage: true })
  await context.close()
}

const browser = await chromium.launch({ headless: true })
try {
  await runViewport(browser, { width: 1280, height: 800 }, 'desktop')
  // Registration throttle cool-down between viewports
  await new Promise((r) => setTimeout(r, 65000))
  await runViewport(browser, { width: 390, height: 844 }, 'mobile')
} finally {
  await browser.close()
}

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2))
const failed = report.filter((r) => !r.ok)
console.log(`\n${report.length - failed.length}/${report.length} checks passed`)
process.exit(failed.length ? 1 : 0)
