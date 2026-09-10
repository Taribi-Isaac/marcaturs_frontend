import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchMarketplaceCampaigns } from '@/features/marketplace/api'
import { CampaignCard } from '@/features/marketplace/CampaignCard'
import { ButtonLink } from '@/shared/ui/Button'
import { MediaFrame } from '@/shared/ui/MediaFrame'
import { EmptyState, ErrorState, LoadingState, PageMeta, SectionHeading } from '@/shared/ui/States'
import { images } from '@/shared/content/images'

export function HomePage() {
  const preview = useQuery({
    queryKey: ['marketplace', 'preview'],
    queryFn: ({ signal }) => fetchMarketplaceCampaigns({ per_page: 3 }, signal),
  })

  return (
    <>
      <PageMeta
        title="Ambassador marketplace"
        description="Businesses publish opportunities. Ambassadors choose what fits. Real customer conversations become real Deals."
      />
      <section className="hero" aria-label="Marketplace introduction">
        <div className="hero__media" aria-hidden>
          <img src={images.hero.src} alt="" />
        </div>
        <div className="hero__scrim" />
        <div className="container hero__content reveal">
          <p className="hero__eyebrow">Distributed sales marketplace</p>
          <h1>Businesses publish opportunities. Ambassadors choose what fits.</h1>
          <p className="hero__lead">
            Real customer conversations become real Deals. Customers pay businesses directly —
            MarcatursHub coordinates the commercial record, not the money.
          </p>
          <div className="row">
            <ButtonLink to="/discover" variant="on-dark">
              Browse opportunities
            </ButtonLink>
            <ButtonLink to="/how-it-works" variant="on-dark-ghost">
              See how it works
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading eyebrow="Money flow" title="Clear boundaries. Direct payments.">
            Three parties. Two payment flows. No platform wallet for customer or commission money.
          </SectionHeading>
          <div className="money-flow">
            <div className="money-flow__item">
              <strong>Customer → Business</strong>
              <span>Customers pay the business directly for the product or service.</span>
            </div>
            <div className="money-flow__item">
              <strong>Business → Ambassador</strong>
              <span>After qualifying confirmation, the business pays commission directly.</span>
            </div>
            <div className="money-flow__item">
              <strong>MarcatursHub coordinates</strong>
              <span>Campaigns, evidence, confirmation, deadlines, and disputes — not custody.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tight surface-band">
        <div className="container">
          <div className="split-visual">
            <div>
              <SectionHeading eyebrow="How it works" title="From opportunity to Deal.">
                Track the moments that matter — not every conversation. The Deal, not the Lead.
              </SectionHeading>
              <ol className="split-list">
                <li>Business publishes a commission-based campaign.</li>
                <li>Ambassador discovers it and promotes through their own channels.</li>
                <li>Customer pays the business directly.</li>
                <li>Qualifying payment is confirmed and commission becomes due.</li>
              </ol>
              <div className="row">
                <ButtonLink to="/how-it-works">Full walkthrough</ButtonLink>
              </div>
            </div>
            <MediaFrame src={images.ambassadors.src} alt={images.ambassadors.alt} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="marketplace-preview-header">
            <SectionHeading eyebrow="Marketplace" title="Live opportunities.">
              Browse public campaigns. Sign in as an Ambassador to create Deals.
            </SectionHeading>
            <ButtonLink to="/discover" variant="secondary">
              View all
            </ButtonLink>
          </div>
          {preview.isLoading ? <LoadingState label="Loading opportunities…" /> : null}
          {preview.isError ? (
            <ErrorState title="Marketplace temporarily unavailable">
              Check back shortly, or explore how MarcatursHub works.
            </ErrorState>
          ) : null}
          {preview.data && preview.data.items.length === 0 ? (
            <EmptyState title="No public campaigns yet">
              Businesses will publish opportunities here once campaigns are active.
            </EmptyState>
          ) : null}
          {preview.data && preview.data.items.length > 0 ? (
            <div className="grid-3">
              {preview.data.items.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="section section--tight">
        <div className="container grid-2">
          <article className="card audience-card">
            <p className="eyebrow">For businesses</p>
            <h3>Publish opportunities. Confirm results. Pay ambassadors directly.</h3>
            <p>
              Set commission terms, share approved materials, confirm qualifying payments, and
              settle commissions Business → Ambassador — without platform custody.
            </p>
            <Link to="/for-businesses">Why businesses join →</Link>
          </article>
          <article className="card audience-card">
            <p className="eyebrow">For ambassadors</p>
            <h3>Choose what fits. Create Deals. Earn on confirmed results.</h3>
            <p>
              Discover campaigns, promote products you understand, create a Deal when a customer is
              ready, and track confirmation through to commission receipt.
            </p>
            <Link to="/for-ambassadors">Why ambassadors join →</Link>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="split-visual">
            <MediaFrame src={images.trust.src} alt={images.trust.alt} />
            <div>
              <SectionHeading eyebrow="Trust" title="Verification and clear commercial records.">
                Trust comes from verification, published terms, payment evidence, and accountable
                confirmation — not from holding funds.
              </SectionHeading>
              <ButtonLink to="/register">Create your account</ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <div className="cta-band">
            <h2>Ready to explore?</h2>
            <p>Browse live opportunities, or create an account as a Business or Ambassador.</p>
            <div className="row">
              <ButtonLink to="/discover" variant="on-dark">
                Discover campaigns
              </ButtonLink>
              <ButtonLink to="/register" variant="on-dark-ghost">
                Get started
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
