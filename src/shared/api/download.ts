import { ensureCsrfCookie, readXsrfToken } from '@/shared/api/csrf'

/** Authenticated blob download — never exposes storage keys. */
export async function downloadAuthenticatedFile(url: string, fallbackName: string) {
  await ensureCsrfCookie()
  const headers: Record<string, string> = {
    Accept: '*/*',
    'X-Requested-With': 'XMLHttpRequest',
  }
  const xsrf = readXsrfToken()
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf

  const response = await fetch(url, { credentials: 'include', headers })
  if (!response.ok) {
    const err = new Error(
      response.status === 409
        ? 'The file is not ready yet. Please try again shortly.'
        : 'Download failed.',
    )
    ;(err as Error & { status?: number }).status = response.status
    throw err
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="?([^"]+)"?/i)
  const filename = match?.[1] || fallbackName
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
