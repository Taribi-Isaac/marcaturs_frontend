import { DiscoverPage } from '@/features/marketplace/DiscoverPage'
import { CertificationCtaBanner } from '@/features/ambassador-certification/CertificationCtaBanner'

/** Ambassador Discover — marketplace browse with optional certification CTA. */
export function AmbassadorDiscoverPage() {
  return (
    <div className="ambassador-discover desk-page reveal">
      <div className="stack" style={{ marginBottom: '1.25rem' }}>
        <CertificationCtaBanner compact />
      </div>
      <DiscoverPage variant="ambassador" />
    </div>
  )
}
