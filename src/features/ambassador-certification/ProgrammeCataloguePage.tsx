import { useQuery } from '@tanstack/react-query'
import { ButtonLink } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { fetchProgrammes } from './api'
import { formatFeeMinor } from './cta'
import { certificationKeys } from './queryKeys'

export function ProgrammeCataloguePage() {
  const programmes = useQuery({
    queryKey: certificationKeys.programmes(),
    queryFn: ({ signal }) => fetchProgrammes(signal),
  })

  return (
    <>
      <PageMeta
        title="Certification programmes"
        description="Browse optional MarcatursHub Ambassador Professional Certification programmes."
      />
      <div className="desk-page reveal">
        <header className="desk-header">
          <div>
            <h1>Programmes</h1>
            <p>
              Server-published programmes only. Fees and versions come from MarcatursHub — the
              client never sets the price. Certification remains optional.
            </p>
          </div>
          <ButtonLink to="/app/ambassador/certification" variant="secondary">
            Certification hub
          </ButtonLink>
        </header>

        {programmes.isLoading ? <LoadingState label="Loading programmes…" /> : null}
        {programmes.isError ? (
          <ErrorState title="Could not load programmes">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => void programmes.refetch()}
            >
              Retry
            </button>
          </ErrorState>
        ) : null}
        {programmes.isSuccess && programmes.data.length === 0 ? (
          <EmptyState title="No programmes available">
            <p>There is no published certification programme to enroll in right now.</p>
          </EmptyState>
        ) : null}
        {programmes.isSuccess && programmes.data.length > 0 ? (
          <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {programmes.data.map((programme) => {
              const version = programme.current_published_version
              return (
                <li key={programme.id} className="card stack">
                  <div>
                    <h2 style={{ fontSize: '1.15rem' }}>{programme.name}</h2>
                    {programme.description ? (
                      <p style={{ color: 'var(--color-muted)' }}>{programme.description}</p>
                    ) : null}
                    <p style={{ color: 'var(--color-muted)', marginTop: '0.5rem' }}>
                      {version
                        ? `Version ${version.version_number} · ${formatFeeMinor(version.fee_amount_minor, version.fee_currency)}`
                        : 'No published version'}
                    </p>
                  </div>
                  <ButtonLink
                    to={`/app/ambassador/certification/programmes/${programme.id}`}
                    size="sm"
                  >
                    View programme
                  </ButtonLink>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </>
  )
}
