import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { getAnalyticsConsent, setAnalyticsConsent, subscribeAnalyticsConsent } from './consent'
import { isAnalyticsConfigured } from './runtime'

function useConsent() {
  return useSyncExternalStore(subscribeAnalyticsConsent, getAnalyticsConsent, () => 'unknown' as const)
}

export function AnalyticsConsentBanner() {
  if (!isAnalyticsConfigured()) return null
  return <AnalyticsConsentBannerNotice />
}

function AnalyticsConsentBannerNotice() {
  const consent = useConsent()
  if (consent !== 'unknown') return null

  return (
    <div className="analytics-consent" role="dialog" aria-labelledby="analytics-consent-title">
      <div className="analytics-consent__copy">
        <h2 id="analytics-consent-title">Optional analytics</h2>
        <p>
          Allow Google Analytics to measure page visits and a few product actions on this site. It
          does not receive your name, email, phone number, or payment details.{' '}
          <Link to="/privacy">Privacy Policy</Link>
        </p>
      </div>
      <div className="analytics-consent__actions">
        <Button type="button" variant="secondary" onClick={() => setAnalyticsConsent('denied')}>
          Don&apos;t allow
        </Button>
        <Button type="button" onClick={() => setAnalyticsConsent('granted')}>
          Allow
        </Button>
      </div>
    </div>
  )
}

export function AnalyticsConsentChoice() {
  const consent = useConsent()
  const configured = isAnalyticsConfigured()

  return (
    <div className="analytics-choice">
      <p>
        Your current choice:{' '}
        {consent === 'granted' ? 'allowed' : consent === 'denied' ? 'not allowed' : 'not set'}.
        {configured
          ? ' Allowing analytics loads Google Analytics on this production site.'
          : ' Analytics stays off until this production site is configured and you allow it.'}
      </p>
      <div className="analytics-consent__actions">
        <Button type="button" variant="secondary" onClick={() => setAnalyticsConsent('denied')}>
          Don&apos;t allow
        </Button>
        <Button type="button" onClick={() => setAnalyticsConsent('granted')}>
          Allow
        </Button>
      </div>
    </div>
  )
}
