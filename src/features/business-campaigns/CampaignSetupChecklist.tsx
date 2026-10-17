import { Button } from '@/shared/ui/Button'
import type { BusinessCampaign, CampaignVersion } from './types'
import { checkPublishable, toVersionFormValues } from './versionForm'

type SetupTab = 'overview' | 'version'

type Step = { key: string; label: string; done: boolean; optional?: boolean }

const SETUP_STATUSES = new Set(['draft', 'submitted', 'approved'])

export function CampaignSetupChecklist({
  campaign,
  versions,
  onOpenTab,
}: {
  campaign: BusinessCampaign
  versions: CampaignVersion[]
  onOpenTab: (tab: SetupTab) => void
}) {
  if (!SETUP_STATUSES.has(campaign.status)) return null

  const draft = versions.find((v) => v.status === 'draft')
  const published = campaign.current_version?.status === 'published'
  const termsComplete = draft
    ? Object.keys(checkPublishable(toVersionFormValues(draft))).length === 0
    : published

  const steps: Step[] = [
    { key: 'identity', label: 'Identity', done: Boolean(campaign.title && campaign.category) },
    {
      key: 'cover',
      label: 'Cover',
      done: Boolean(campaign.cover_image?.available),
      optional: true,
    },
    { key: 'terms', label: 'Commercial terms', done: termsComplete },
    { key: 'published', label: 'Version published', done: published },
    { key: 'submitted', label: 'Submitted for review', done: campaign.status !== 'draft' },
  ]

  const nextStep = steps.find((step) => !step.done && !step.optional)

  let next: { text: string; action?: { label: string; tab?: SetupTab; href?: string } } | null =
    null
  if (nextStep?.key === 'identity') {
    next = {
      text: 'Add a title and category.',
      action: { label: 'Open overview', tab: 'overview' },
    }
  } else if (nextStep?.key === 'terms') {
    next = {
      text: draft
        ? 'Complete the required fields in your draft commercial version.'
        : 'Create a draft commercial version with pricing, commission and official payment details.',
      action: { label: 'Open commercial version', tab: 'version' },
    }
  } else if (nextStep?.key === 'published') {
    next = {
      text: 'Publish your draft commercial version.',
      action: { label: 'Open commercial version', tab: 'version' },
    }
  } else if (nextStep?.key === 'submitted') {
    next = {
      text: 'Submit the campaign for MarcatursHub review.',
      action: { label: 'Go to lifecycle actions', href: '#campaign-lifecycle' },
    }
  }

  const action = next?.action
  const actionTab = action?.tab

  return (
    <section
      className="card stack stack--sm setup-checklist"
      aria-labelledby="setup-checklist-heading"
    >
      <h2 id="setup-checklist-heading">Campaign setup</h2>
      <ol className="setup-checklist__list">
        {steps.map((step) => (
          <li
            key={step.key}
            className={`setup-checklist__step${step.done ? ' setup-checklist__step--done' : ''}`}
          >
            <span className="setup-checklist__mark" aria-hidden="true">
              {step.done ? '✓' : ''}
            </span>
            <span>
              {step.label}
              {step.optional ? ' (optional)' : ''}
              <span className="visually-hidden">{step.done ? ': done' : ': not done yet'}</span>
            </span>
          </li>
        ))}
      </ol>
      {next ? (
        <p className="setup-checklist__next">
          <span>
            <strong>Next:</strong> {next.text}
          </span>
          {action && actionTab ? (
            <Button size="sm" variant="secondary" onClick={() => onOpenTab(actionTab)}>
              {action.label}
            </Button>
          ) : null}
          {action?.href ? <a href={action.href}>{action.label}</a> : null}
        </p>
      ) : null}
    </section>
  )
}
