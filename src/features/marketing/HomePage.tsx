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
        title="More reach for businesses. More opportunity for ambassadors"
        description="MarcatursHub connects businesses with independent ambassadors who discover, promote and represent products and services they believe in — with customers paying businesses directly."
      />

      <section className="hero" aria-label="MarcatursHub introduction">
        <div className="hero__media">
          <img src={images.hero.src} alt={images.hero.alt} fetchPriority="high" decoding="async" />
        </div>
        <div className="hero__scrim" />
        <div className="container hero__content reveal">
          <p className="hero__brand">MarcatursHub</p>
          <h1>More reach for businesses. More opportunities for independent ambassadors.</h1>
          <p className="hero__lead">
            Connect your business with people ready to discover, understand and promote what you
            sell  or find products and services worth representing through the network you already
            have.
          </p>
          <div className="row hero__actions">
            <ButtonLink to="/register?role=BUSINESS" variant="on-dark">
              Publish an opportunity
            </ButtonLink>
            <ButtonLink to="/register?role=AMBASSADOR" variant="on-dark-ghost">
              Become an Ambassador
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="split-visual">
            <div>
              <SectionHeading
                eyebrow="For businesses"
                title="Put more people behind your business."
              >
                Gain independent sales reach without building a traditional sales team first.
                Ambassadors choose campaigns they believe in and introduce your offer through their
                own networks and channels.
              </SectionHeading>
              <ul className="split-list benefit-list">
                <li>
                  <strong>Reach more customers:</strong>  through people who already have
                  relationships, communities and influence.
                </li>
                <li>
                  <strong>Keep control of your campaign:</strong>  you set pricing, commission
                  terms, approved materials and rules.
                </li>
                <li>
                  <strong>Reward qualifying results:</strong>  commission becomes due when you
                  confirm a qualifying payment, not empty impressions.
                </li>
              </ul>
              <div className="row">
                <ButtonLink to="/for-businesses">See the business opportunity</ButtonLink>
              </div>
            </div>
            <MediaFrame src={images.business.src} alt={images.business.alt} />
          </div>
        </div>
      </section>

      <section className="section section--tight surface-band">
        <div className="container">
          <div className="split-visual">
            <MediaFrame src={images.ambassadors.src} alt={images.ambassadors.alt} />
            <div>
              <SectionHeading
                eyebrow="For ambassadors"
                title="Earn from opportunities you believe in — while staying independent."
              >
                Your 9–5 does not have to be your only opportunity. Explore businesses and products
                you can represent independently  without becoming an employee of the business.
              </SectionHeading>
              <ul className="split-list benefit-list">
                <li>
                  <strong>Choose what fits:</strong>  promote campaigns you understand and believe
                  you can sell.
                </li>
                <li>
                  <strong>Use what you already have:</strong>  your network, knowledge,
                  relationships and channels.
                </li>
                <li>
                  <strong>Earn on qualifying completed deals:</strong>  commission follows
                  confirmation of qualifying payment under published campaign terms.
                </li>
              </ul>
              <div className="row">
                <ButtonLink to="/for-ambassadors">See the ambassador opportunity</ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="The opportunity"
            title="A marketplace that connects sales reach with independent promotion."
          >
            Businesses need more people introducing what they sell. Capable people already have
            networks that can create that reach. MarcatursHub brings both sides together, then
            records the commercial moments that matter.
          </SectionHeading>
          <div className="grid-3 feature-points">
            {[
              {
                title: 'Discover',
                body: 'Ambassadors find campaigns with clear products, terms and commission structures.',
              },
              {
                title: 'Enable',
                body: 'Businesses equip ambassadors with approved information, materials and rules.',
              },
              {
                title: 'Account',
                body: 'Deals, payment evidence, confirmation and commission status create a clear commercial record.',
              },
            ].map((item) => (
              <article key={item.title} className="feature-point">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
          <div className="row section-actions">
            <ButtonLink to="/how-it-works" variant="secondary">
              See how it works
            </ButtonLink>
            <ButtonLink to="/discover" variant="ghost">
              Browse live opportunities
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="section section--tight surface-band">
        <div className="container">
          <div className="marketplace-preview-header">
            <SectionHeading eyebrow="Marketplace" title="Opportunities waiting to be promoted.">
              Explore live campaigns. Sign in as an Ambassador when you are ready to create a Deal.
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

      <section className="section">
        <div className="container grid-2 audience-pair">
          <article className="audience-panel">
            <div className="audience-panel__media" aria-hidden>
              <img src={images.business.src} alt="" loading="lazy" decoding="async" />
            </div>
            <div className="audience-panel__body">
              <p className="eyebrow">Why businesses join</p>
              <h3>Expand without traditional recruitment alone.</h3>
              <p>
                Publish commission-based campaigns, share approved materials, confirm qualifying
                payments, and settle commissions directly with ambassadors.
              </p>
              <Link to="/for-businesses">For businesses →</Link>
            </div>
          </article>
          <article className="audience-panel">
            <div className="audience-panel__media" aria-hidden>
              <img src={images.ambassadorsSecondary.src} alt="" loading="lazy" decoding="async" />
            </div>
            <div className="audience-panel__body">
              <p className="eyebrow">Why ambassadors join</p>
              <h3>Stay independent. Promote what fits. Build a track record.</h3>
              <p>
                Choose campaigns deliberately, learn before you promote, and earn commission when
                qualifying deals are confirmed — without quitting your current path.
              </p>
              <Link to="/for-ambassadors">For ambassadors →</Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <div className="split-visual">
            <MediaFrame src={images.collaboration.src} alt={images.collaboration.alt} />
            <div>
              <SectionHeading
                eyebrow="Trust"
                title="Customers pay businesses directly. Commissions move the same way."
              >
                MarcatursHub coordinates campaigns, Deals, evidence, confirmation and disputes. In
                the MVP, it does not hold customer purchase funds or ambassador commission money.
                Trust is built through clear terms, verification, evidence and accountable records.
              </SectionHeading>
              <div className="money-flow money-flow--compact">
                <div className="money-flow__item">
                  <strong>Customer → Business</strong>
                  <span>Purchase payments go to the business.</span>
                </div>
                <div className="money-flow__item">
                  <strong>Business → Ambassador</strong>
                  <span>Qualifying commissions are paid directly.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <div className="cta-band">
            <h2>Ready to grow — or ready to earn independently?</h2>
            <p>
              Publish a campaign as a Business, or explore opportunities as an Ambassador. Either
              way, start with a clear commercial path.
            </p>
            <div className="row">
              <ButtonLink to="/register?role=BUSINESS" variant="on-dark">
                Join as a Business
              </ButtonLink>
              <ButtonLink to="/register?role=AMBASSADOR" variant="on-dark-ghost">
                Join as an Ambassador
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
