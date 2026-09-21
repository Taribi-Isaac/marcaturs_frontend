import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchAmbassadorProfile } from '@/features/participant-settings/api'
import { settingsKeys } from '@/features/participant-settings/queryKeys'
import { images } from '@/shared/content/images'
import { ButtonLink } from '@/shared/ui/Button'
import { fetchEnrollments, fetchCurriculum } from './api'
import { ctaCopy, deriveCtaState } from './cta'
import { certificationKeys } from './queryKeys'
import type { AssessmentEligibility } from './types'

type Props = {
  compact?: boolean
}

export function CertificationCtaBanner({ compact = false }: Props) {
  const profile = useQuery({
    queryKey: settingsKeys.ambassadorProfile(),
    queryFn: ({ signal }) => fetchAmbassadorProfile(signal),
    retry: false,
  })

  const enrollments = useQuery({
    queryKey: certificationKeys.enrollments(),
    queryFn: ({ signal }) => fetchEnrollments(signal),
    retry: false,
  })

  const activeEnrollment = (enrollments.data ?? []).find((row) => row.status === 'active')

  const curriculum = useQuery({
    queryKey: certificationKeys.curriculum(activeEnrollment?.id ?? 0),
    queryFn: ({ signal }) => fetchCurriculum(activeEnrollment!.id, signal),
    enabled: Boolean(activeEnrollment?.id) && !profile.data?.certification?.is_certified,
    retry: false,
  })

  const eligibilityByEnrollmentId: Record<number, AssessmentEligibility | undefined> = {}
  if (activeEnrollment && curriculum.data) {
    eligibilityByEnrollmentId[activeEnrollment.id] = curriculum.data.assessment_eligibility
  }

  const state = deriveCtaState({
    certification: profile.data?.certification,
    enrollments: enrollments.data,
    eligibilityByEnrollmentId,
  })
  const copy = ctaCopy(state)
  const actionTo =
    state === 'continue_learning' && activeEnrollment
      ? `/app/ambassador/certification/enrollments/${activeEnrollment.id}`
      : state === 'assessment_ready' && activeEnrollment
        ? `/app/ambassador/certification/enrollments/${activeEnrollment.id}/assessment`
        : copy.to

  return (
    <section
      className={`certification-cta${compact ? ' certification-cta--compact' : ''}${compact ? '' : ' certification-cta--visual'}`}
      aria-labelledby="certification-cta-title"
    >
      {!compact ? (
        <div className="certification-cta__media" aria-hidden>
          <img src={images.graduation.src} alt="" decoding="async" />
        </div>
      ) : null}
      <div className="certification-cta__body-wrap">
        <p className="eyebrow">Get certified</p>
        <h2 id="certification-cta-title" className="certification-cta__title">
          {copy.title}
        </h2>
        <p className="certification-cta__body">{copy.body}</p>
        <p className="certification-cta__fine">
          Optional · no income guarantee · not identity verification.{' '}
          <Link to="/faq">Learn more</Link>
        </p>
        <div className="inline-actions">
          <ButtonLink to={actionTo} size="sm">
            {copy.actionLabel}
          </ButtonLink>
          {state !== 'explore' ? (
            <ButtonLink to="/app/ambassador/certification" variant="secondary" size="sm">
              Certification hub
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </section>
  )
}
