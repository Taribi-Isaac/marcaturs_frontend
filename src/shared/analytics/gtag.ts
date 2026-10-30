const SCRIPT_ATTR = 'data-mh-ga'

const DENIED_CONSENT = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
} as const

type Gtag = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

export function installGtag(measurementId: string): void {
  window.dataLayer = window.dataLayer ?? []
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args)
    }
  }
  if (document.querySelector(`script[${SCRIPT_ATTR}="${measurementId}"]`)) {
    window.gtag('consent', 'update', { ...DENIED_CONSENT, analytics_storage: 'granted' })
    return
  }
  window.gtag('consent', 'default', DENIED_CONSENT)
  window.gtag('consent', 'update', { ...DENIED_CONSENT, analytics_storage: 'granted' })
  window.gtag('js', new Date())
  window.gtag('config', measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  script.setAttribute(SCRIPT_ATTR, measurementId)
  script.addEventListener('error', () => {
    // A blocked analytics script must not affect the application.
  })
  document.head.appendChild(script)
}

export function disableGtag(): void {
  try {
    window.gtag?.('consent', 'update', DENIED_CONSENT)
  } catch {
    // Stopping analytics must not interrupt the page.
  }
}

export function sendGtagEvent(name: string, params: Record<string, string>): void {
  try {
    window.gtag?.('event', name, params)
  } catch {
    // A broken analytics callback must not interrupt the page.
  }
}
