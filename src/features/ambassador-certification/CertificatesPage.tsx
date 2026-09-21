import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDate } from '@/features/ambassador-deals/format'
import { fetchAmbassadorProfile } from '@/features/participant-settings/api'
import { settingsKeys } from '@/features/participant-settings/queryKeys'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { certificateDownloadUrl, downloadAuthenticatedFile, fetchCertificates } from './api'
import { certificationKeys } from './queryKeys'

export function CertificatesPage() {
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const profile = useQuery({
    queryKey: settingsKeys.ambassadorProfile(),
    queryFn: ({ signal }) => fetchAmbassadorProfile(signal),
    retry: false,
  })
  const certificates = useQuery({
    queryKey: certificationKeys.certificates(),
    queryFn: ({ signal }) => fetchCertificates(signal),
  })

  const download = useMutation({
    mutationFn: (certificateId: number) =>
      downloadAuthenticatedFile(
        certificateDownloadUrl(certificateId),
        `marcaturshub-certificate-${certificateId}.pdf`,
      ),
    onError: (err) => {
      setDownloadError(err instanceof Error ? err.message : 'Download unavailable.')
    },
    onSuccess: () => setDownloadError(null),
  })

  return (
    <>
      <PageMeta
        title="Certificates"
        description="Private MarcatursHub certification certificates for the signed-in Ambassador."
      />
      <div className="desk-page reveal">
        <header className="desk-header">
          <div>
            <p className="eyebrow">
              <Link to="/app/ambassador/certification">Certification</Link>
            </p>
            <h1>Certificates</h1>
            <p>
              Certification is determined by the Award. A pending or failed PDF does not mean you
              are uncertified. Public verification and QR codes are not available in this release.
            </p>
          </div>
          <ButtonLink to="/app/ambassador/settings" variant="secondary">
            Profile settings
          </ButtonLink>
        </header>

        {profile.data?.certification?.is_certified ? (
          <div className="alert alert--success" role="status">
            {profile.data.certification.label ?? 'Certified MarcatursHub Ambassador'}
          </div>
        ) : (
          <div className="alert alert--info" role="status">
            No certification Award on your profile yet.
          </div>
        )}

        {downloadError ? (
          <div className="alert alert--danger" role="alert">
            {downloadError}
          </div>
        ) : null}

        {certificates.isLoading ? <LoadingState label="Loading certificates…" /> : null}
        {certificates.isError ? (
          <ErrorState title="Could not load certificates">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => void certificates.refetch()}
            >
              Retry
            </button>
          </ErrorState>
        ) : null}
        {certificates.isSuccess && certificates.data.length === 0 ? (
          <EmptyState title="No certificates yet">
            <p>Certificates appear after a successful Award is registered by MarcatursHub.</p>
          </EmptyState>
        ) : null}

        {certificates.isSuccess && certificates.data.length > 0 ? (
          <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {certificates.data.map((certificate) => (
              <li key={certificate.id} className="card stack">
                <div>
                  <h2 style={{ fontSize: '1.15rem' }}>{certificate.programme_name}</h2>
                  <p style={{ color: 'var(--color-muted)' }}>
                    Version {certificate.programme_version_number} · Issued{' '}
                    {formatDate(certificate.issued_at)} · {certificate.issuer_name}
                  </p>
                  <p>
                    Certificate ID: <code>{certificate.certificate_number}</code>
                  </p>
                  <p style={{ color: 'var(--color-muted)' }}>
                    Artifact:{' '}
                    {certificate.artifact_available
                      ? 'PDF ready'
                      : certificate.artifact_status.replaceAll('_', ' ')}
                  </p>
                </div>
                {certificate.artifact_available ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={download.isPending}
                    onClick={() => download.mutate(certificate.id)}
                  >
                    {download.isPending ? 'Preparing…' : 'Download PDF'}
                  </Button>
                ) : (
                  <p role="status">
                    PDF is not ready yet. Your certification Award remains valid while generation
                    retries.
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  )
}
