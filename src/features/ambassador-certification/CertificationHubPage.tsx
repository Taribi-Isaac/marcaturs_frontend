import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { formatDate } from '@/features/ambassador-deals/format'
import { fetchAmbassadorProfile } from '@/features/participant-settings/api'
import { settingsKeys } from '@/features/participant-settings/queryKeys'
import { ButtonLink } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import logoTransBg from '@/assets/images/logo-trans-bg.png'
import { fetchCertificates, fetchEnrollments } from './api'
import { certificationKeys } from './queryKeys'

export function CertificationHubPage() {
  const profile = useQuery({
    queryKey: settingsKeys.ambassadorProfile(),
    queryFn: ({ signal }) => fetchAmbassadorProfile(signal),
    retry: false,
  })
  const enrollments = useQuery({
    queryKey: certificationKeys.enrollments(),
    queryFn: ({ signal }) => fetchEnrollments(signal),
  })
  const certificates = useQuery({
    queryKey: certificationKeys.certificates(),
    queryFn: ({ signal }) => fetchCertificates(signal),
  })

  return (
    <>
      <PageMeta
        title="Certification"
        description="Optional Ambassador Professional Certification for MarcatursHub."
      />
      <div className="desk-page reveal">
        <header className="desk-header">
          <div>
            <img
              className="certification-brand-mark"
              src={logoTransBg}
              alt="MarcatursHub"
              width={200}
              height={53}
            />
            <h1>Certification</h1>
            <p>
              Optional professional development and recognition. Certification is not required to
              browse campaigns, promote, create Deals, or earn commissions. It is separate from
              identity verification.
            </p>
          </div>
          <ButtonLink to="/app/ambassador/certification/programmes" variant="secondary">
            Browse programmes
          </ButtonLink>
        </header>

        <section className="card stack" aria-labelledby="cert-status-heading">
          <h2 id="cert-status-heading" style={{ fontSize: '1.15rem' }}>
            Your status
          </h2>
          {profile.isLoading ? <LoadingState label="Loading certification status…" /> : null}
          {profile.isError ? (
            <ErrorState title="Could not load profile certification">
              <p>Try again from Settings, or refresh this page.</p>
            </ErrorState>
          ) : null}
          {profile.isSuccess ? (
            profile.data.certification?.is_certified ? (
              <div className="stack">
                <p>
                  <span className="badge badge--success">
                    {profile.data.certification.label ?? 'Certified'}
                  </span>
                </p>
                <ul className="cert-row-list">
                  {profile.data.certification.awards.map((award) => (
                    <li key={award.id} className="cert-row">
                      <strong>{award.programme_name ?? 'Programme'}</strong>
                      <p className="cert-row__meta">
                        Version {award.programme_version_number ?? '—'}
                        {award.awarded_at ? ` · Awarded ${formatDate(award.awarded_at)}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
                <ButtonLink to="/app/ambassador/certification/certificates" size="sm">
                  Open certificates
                </ButtonLink>
              </div>
            ) : (
              <p style={{ color: 'var(--color-muted)' }}>
                You are not certified yet. Exploring certification is optional.
              </p>
            )
          ) : null}
        </section>

        <section className="card stack" aria-labelledby="cert-enrollments-heading">
          <h2 id="cert-enrollments-heading" style={{ fontSize: '1.15rem' }}>
            Enrollments
          </h2>
          {enrollments.isLoading ? <LoadingState label="Loading enrollments…" /> : null}
          {enrollments.isError ? (
            <ErrorState title="Could not load enrollments">
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => void enrollments.refetch()}>
                Retry
              </button>
            </ErrorState>
          ) : null}
          {enrollments.isSuccess && enrollments.data.length === 0 ? (
            <EmptyState title="No enrollments yet">
              <p>
                <Link to="/app/ambassador/certification/programmes">Browse available programmes</Link>{' '}
                to get started after reviewing the fee shown by the server.
              </p>
            </EmptyState>
          ) : null}
          {enrollments.isSuccess && enrollments.data.length > 0 ? (
            <ul className="cert-row-list">
              {enrollments.data.map((enrollment) => (
                <li key={enrollment.id} className="cert-row cert-row--actions">
                  <div>
                    <strong>{enrollment.programme?.name ?? `Programme #${enrollment.programme_id}`}</strong>
                    <p className="cert-row__meta">
                      Version {enrollment.programme_version?.version_number ?? '—'} ·{' '}
                      <span className="badge badge--neutral">{enrollment.status}</span>
                    </p>
                  </div>
                  <ButtonLink
                    to={`/app/ambassador/certification/enrollments/${enrollment.id}`}
                    size="sm"
                    variant="secondary"
                  >
                    Open learning
                  </ButtonLink>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {certificates.isSuccess && certificates.data.length > 0 ? (
          <section className="card stack" aria-labelledby="cert-certs-heading">
            <h2 id="cert-certs-heading" style={{ fontSize: '1.15rem' }}>
              Certificates
            </h2>
            <p style={{ color: 'var(--color-muted)' }}>
              Award = qualification. Certificate = evidence record. PDF = downloadable artifact.
            </p>
            <ButtonLink to="/app/ambassador/certification/certificates" size="sm">
              Manage certificates
            </ButtonLink>
          </section>
        ) : null}
      </div>
    </>
  )
}
