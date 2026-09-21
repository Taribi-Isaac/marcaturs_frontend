import { formatMoneyMinor as formatBusinessMoneyMinor } from '@/features/business-campaigns/format'
import type {
  AssessmentEligibility,
  CertificationCtaState,
  CertificationEnrollment,
  ProfileCertification,
} from './types'

export function formatFeeMinor(
  amountMinor: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (amountMinor == null || !currency) return '—'
  return formatBusinessMoneyMinor(amountMinor, currency)
}

export function deriveCtaState(input: {
  certification?: ProfileCertification | null
  enrollments?: CertificationEnrollment[] | null
  eligibilityByEnrollmentId?: Record<number, AssessmentEligibility | undefined>
}): CertificationCtaState {
  if (input.certification?.is_certified) {
    return 'certified'
  }

  const active = (input.enrollments ?? []).filter((row) => row.status === 'active')
  if (active.length === 0) {
    return 'explore'
  }

  const ready = active.some((row) => input.eligibilityByEnrollmentId?.[row.id]?.eligible)
  return ready ? 'assessment_ready' : 'continue_learning'
}

export function ctaCopy(state: CertificationCtaState): {
  title: string
  body: string
  actionLabel: string
  to: string
} {
  switch (state) {
    case 'certified':
      return {
        title: 'You are a Certified MarcatursHub Ambassador',
        body: 'Certification is optional professional recognition. It is separate from identity verification and does not change Deal or commission rules.',
        actionLabel: 'View certificate',
        to: '/app/ambassador/certification/certificates',
      }
    case 'assessment_ready':
      return {
        title: 'Assessment ready',
        body: 'Required lessons are complete. Take the final assessment when you are ready — retakes do not require another payment.',
        actionLabel: 'Continue to assessment',
        to: '/app/ambassador/certification',
      }
    case 'continue_learning':
      return {
        title: 'Continue certification learning',
        body: 'Pick up where you left off. Opening a lesson does not mark it complete — use Mark complete when you have finished.',
        actionLabel: 'Open learning',
        to: '/app/ambassador/certification',
      }
    default:
      return {
        title: 'Ambassador Professional Certification',
        body: 'Equip yourself with the skills and knowledge to become a successful Ambassador.',
        actionLabel: 'Explore certification',
        to: '/app/ambassador/certification/programmes',
      }
  }
}
