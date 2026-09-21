import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { formatDate, formatDateTime } from '@/features/ambassador-deals/format'
import { useAuth } from '@/features/auth/authContext'
import { fetchVerificationStatus } from '@/features/participant-verification/api'
import { verificationKeys } from '@/features/participant-verification/queryKeys'
import {
  overallStatusBadgeClass,
  overallStatusLabel,
} from '@/features/participant-verification/status'
import type { UserRole } from '@/shared/types/auth'
import { ButtonLink } from '@/shared/ui/Button'
import { PageMeta } from '@/shared/ui/States'
import { fetchAmbassadorProfile } from './api'
import { ChangePasswordForm } from './ChangePasswordForm'
import { EmailVerificationActions } from './EmailVerificationActions'
import {
  accountStatusBadgeClass,
  accountStatusExplanation,
  accountStatusLabel,
  roleLabel,
} from './presentation'
import { AmbassadorProfileSection, BusinessProfileSection } from './ProfileForms'
import { settingsKeys } from './queryKeys'

type ParticipantRole = Extract<UserRole, 'BUSINESS' | 'AMBASSADOR'>

export function ParticipantSettingsPage({ role }: { role: ParticipantRole }) {
  const { user } = useAuth()
  const restricted = user?.status === 'restricted'
  const verificationPath =
    role === 'BUSINESS' ? '/app/business/verification' : '/app/ambassador/verification'

  const verification = useQuery({
    queryKey: verificationKeys.status(),
    queryFn: ({ signal }) => fetchVerificationStatus(signal),
    enabled: Boolean(user && user.status === 'active' && !restricted),
    retry: false,
  })

  const ambassadorProfile = useQuery({
    queryKey: settingsKeys.ambassadorProfile(),
    queryFn: ({ signal }) => fetchAmbassadorProfile(signal),
    enabled: role === 'AMBASSADOR' && Boolean(user && !restricted),
    retry: false,
  })

  if (!user) {
    return null
  }

  const certification = ambassadorProfile.data?.certification

  return (
    <>
      <PageMeta
        title="Settings"
        description="Manage your MarcatursHub account, profile, and password."
      />
      <div className="desk-page reveal settings-page">
        <header className="desk-header">
          <div>
            <h1>Settings</h1>
            <p>Account identity, profile, email verification, and security.</p>
          </div>
        </header>

        <section className="card stack settings-section" aria-labelledby="settings-account">
          <div>
            <h2 id="settings-account">Account</h2>
            <p className="form-section__lead">
              Identity from authentication. Profile details below are separate marketplace
              information.
            </p>
          </div>
          <dl className="settings-dl">
            <div>
              <dt>Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{roleLabel(user.role)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={accountStatusBadgeClass(user.status)}>
                  {accountStatusLabel(user.status)}
                </span>
              </dd>
            </div>
            <div>
              <dt>Email verified</dt>
              <dd>
                {user.email_verified_at ? formatDateTime(user.email_verified_at) : 'Not verified'}
              </dd>
            </div>
            <div>
              <dt>Last login</dt>
              <dd>{formatDateTime(user.last_login_at)}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{formatDateTime(user.created_at)}</dd>
            </div>
          </dl>
          <EmailVerificationActions />
          <p className="settings-status-note" role="status">
            {accountStatusExplanation(user.status)}
          </p>
        </section>

        <section className="card stack settings-section" aria-labelledby="settings-profile">
          <div>
            <h2 id="settings-profile">Profile</h2>
          </div>
          {role === 'BUSINESS' ? (
            <BusinessProfileSection restricted={restricted} />
          ) : (
            <AmbassadorProfileSection restricted={restricted} />
          )}
        </section>

        {role === 'AMBASSADOR' ? (
          <section className="card stack settings-section" aria-labelledby="settings-certification">
            <div>
              <h2 id="settings-certification">Certification</h2>
              <p className="form-section__lead">
                Optional professional development — distinct from participant Verification.{' '}
                <Link to="/faq">Learn more</Link>
              </p>
            </div>
            {restricted ? (
              <p className="form-section__lead" role="status">
                Certification details may be limited while your account is restricted.{' '}
                <Link to="/app/ambassador/certification">Open certification</Link>
              </p>
            ) : ambassadorProfile.isSuccess && certification?.is_certified ? (
              <div className="stack">
                <span className="badge badge--success">
                  {certification.label ?? 'Certified MarcatursHub Ambassador'}
                </span>
                <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                  {certification.awards.map((award) => (
                    <li key={award.id}>
                      {award.programme_name ?? 'Programme'} · Version{' '}
                      {award.programme_version_number ?? '—'}
                      {award.awarded_at ? ` · ${formatDate(award.awarded_at)}` : ''}
                    </li>
                  ))}
                </ul>
                <ButtonLink to="/app/ambassador/certification/certificates" variant="secondary" size="sm">
                  View certificates
                </ButtonLink>
              </div>
            ) : ambassadorProfile.isSuccess ? (
              <div className="settings-verification-summary">
                <span className="badge">Not certified</span>
                <ButtonLink to="/app/ambassador/certification" variant="secondary" size="sm">
                  Explore certification
                </ButtonLink>
              </div>
            ) : ambassadorProfile.isError ? (
              <p className="form-section__lead">
                Certification status could not be loaded.{' '}
                <Link to="/app/ambassador/certification">Open certification</Link>
              </p>
            ) : (
              <p className="form-section__lead">
                <Link to="/app/ambassador/certification">Open certification</Link>
              </p>
            )}
          </section>
        ) : null}

        <section className="card stack settings-section" aria-labelledby="settings-security">
          <div>
            <h2 id="settings-security">Security</h2>
          </div>
          <ChangePasswordForm />
        </section>

        <section className="card stack settings-section" aria-labelledby="settings-verification">
          <div>
            <h2 id="settings-verification">Verification</h2>
            <p className="form-section__lead">
              A short summary of your verification status. Full requirements and submissions live on
              the Verification page. Verification is not the same as certification.
            </p>
          </div>
          {verification.isSuccess ? (
            <div className="settings-verification-summary">
              <span className={overallStatusBadgeClass(verification.data.overall_status)}>
                {overallStatusLabel(verification.data.overall_status)}
              </span>
              <ButtonLink to={verificationPath} variant="secondary" size="sm">
                Open verification
              </ButtonLink>
            </div>
          ) : restricted ? (
            <p className="form-section__lead" role="status">
              Verification details may be limited while your account is restricted.{' '}
              <Link to={verificationPath}>Open verification</Link>
            </p>
          ) : verification.isError ? (
            <p className="form-section__lead">
              Verification status could not be loaded.{' '}
              <Link to={verificationPath}>Open verification</Link>
            </p>
          ) : (
            <p className="form-section__lead">
              <Link to={verificationPath}>Open verification</Link>
            </p>
          )}
        </section>
      </div>
    </>
  )
}
