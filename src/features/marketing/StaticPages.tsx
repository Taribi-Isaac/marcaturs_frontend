import { ButtonLink } from '@/shared/ui/Button'
import { MediaFrame } from '@/shared/ui/MediaFrame'
import { PageMeta, SectionHeading } from '@/shared/ui/States'
import { images } from '@/shared/content/images'

export function HowItWorksPage() {
  return (
    <>
      <PageMeta
        title="How it works"
        description="Business publishes, Ambassador promotes, Customer pays Business, commission follows confirmation."
      />
      <section className="page-hero">
        <div className="container">
          <SectionHeading as="h1" eyebrow="Model" title="How MarcatursHub works.">
            A marketplace for independent promotion — with clear payment boundaries.
          </SectionHeading>
        </div>
      </section>
      <section className="section section--tight">
        <div className="container stack stack--lg">
          {[
            {
              title: '1. Business publishes an opportunity',
              body: 'Campaigns include product details, commission terms, approved claims, and marketing resources.',
            },
            {
              title: '2. Ambassador discovers and promotes',
              body: 'Ambassadors choose campaigns they understand and promote through their own networks and channels.',
            },
            {
              title: '3. Customer pays the Business directly',
              body: 'MarcatursHub does not receive or hold customer payments. Payment goes to the business.',
            },
            {
              title: '4. Qualifying payment is confirmed',
              body: 'Ambassadors submit evidence. Businesses confirm. Commission liability becomes due according to campaign terms.',
            },
            {
              title: '5. Business pays the Ambassador',
              body: 'Commission is settled directly Business → Ambassador within the published deadline.',
            },
          ].map((step) => (
            <article key={step.title} className="card">
              <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>{step.title}</h2>
              <p style={{ color: 'var(--color-muted)' }}>{step.body}</p>
            </article>
          ))}
          <div className="split-visual">
            <MediaFrame src={images.business.src} alt={images.business.alt} />
            <div className="cta-band">
              <h2>Choose your path</h2>
              <p>Create an account as a Business or Ambassador to participate.</p>
              <div className="row">
                <ButtonLink to="/register?role=BUSINESS" variant="on-dark">
                  Join as Business
                </ButtonLink>
                <ButtonLink to="/register?role=AMBASSADOR" variant="on-dark-ghost">
                  Join as Ambassador
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export function ForBusinessesPage() {
  return (
    <>
      <PageMeta
        title="For businesses"
        description="Publish commission campaigns and expand sales reach."
      />
      <section className="page-hero">
        <div className="container split-visual">
          <div>
            <SectionHeading
              as="h1"
              eyebrow="Businesses"
              title="Publish opportunities. Confirm results. Pay commissions directly."
            >
              Access a distributed ambassador network without hiring a full sales force. You keep
              control of payment confirmation and commission settlement.
            </SectionHeading>
            <ButtonLink to="/register?role=BUSINESS">Create a business account</ButtonLink>
          </div>
          <MediaFrame src={images.business.src} alt={images.business.alt} />
        </div>
      </section>
      <section className="section">
        <div className="container grid-3">
          {[
            'Define commission terms and approved marketing materials',
            'Review payment evidence and confirm qualifying transactions',
            'Track commission due dates without platform custody of funds',
          ].map((item) => (
            <article key={item} className="card">
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

export function ForAmbassadorsPage() {
  return (
    <>
      <PageMeta
        title="For ambassadors"
        description="Discover commission campaigns and promote products independently."
      />
      <section className="page-hero">
        <div className="container split-visual">
          <div>
            <SectionHeading
              as="h1"
              eyebrow="Ambassadors"
              title="Promote what you understand. Earn on confirmed results."
            >
              Browse live campaigns, use approved resources, create Deals when customers are ready,
              and track commission from due through received.
            </SectionHeading>
            <ButtonLink to="/register?role=AMBASSADOR">Create an ambassador account</ButtonLink>
          </div>
          <MediaFrame src={images.ambassadors.src} alt={images.ambassadors.alt} />
        </div>
      </section>
      <section className="section">
        <div className="container grid-3">
          {[
            'Discover campaigns with clear commission economics',
            'Promote through your own channels and relationships',
            'Record evidence and follow confirmation to commission receipt',
          ].map((item) => (
            <article key={item} className="card">
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

export function AboutPage() {
  return (
    <>
      <PageMeta
        title="About"
        description="MarcatursHub is a distributed sales ambassador marketplace."
      />
      <section className="page-hero">
        <div className="container container--narrow">
          <SectionHeading
            as="h1"
            eyebrow="About"
            title="A marketplace for independent ambassador selling."
          >
            MarcatursHub connects businesses seeking sales reach with independent ambassadors who
            choose products to promote. The platform records commercially material events —
            campaigns, Deals, evidence, confirmation, commissions, and disputes — without holding
            customer or commission funds in MVP.
          </SectionHeading>
        </div>
      </section>
    </>
  )
}

export function ContactPage() {
  return (
    <>
      <PageMeta title="Contact" description="Contact MarcatursHub." />
      <section className="page-hero">
        <div className="container container--narrow stack">
          <SectionHeading as="h1" eyebrow="Contact" title="Get in touch.">
            For product or partnership enquiries, use the channels published by Tarizefa Limited /
            MarcatursHub operations. This foundation build does not invent unsupported phone numbers
            or addresses.
          </SectionHeading>
          <div className="alert alert--info">
            Prefer emailing through your existing MarcatursHub operations contact. A public support
            inbox can be configured when company contact details are confirmed.
          </div>
        </div>
      </section>
    </>
  )
}

export function FaqPage() {
  const faqs = [
    {
      q: 'Does MarcatursHub hold customer payments?',
      a: 'No. Customers pay businesses directly. MarcatursHub does not receive or hold customer money in MVP.',
    },
    {
      q: 'Does MarcatursHub pay ambassadors?',
      a: 'No. After qualifying confirmation, businesses pay ambassadors directly. The platform tracks commission liability and status.',
    },
    {
      q: 'Do customers need an account?',
      a: 'No. Customers do not need a MarcatursHub account in MVP to pay a business or verify official payment information.',
    },
    {
      q: 'What is a Deal?',
      a: 'A Deal records that a customer is ready to transact under a campaign version. It anchors evidence, confirmation, and commission.',
    },
    {
      q: 'Is MarcatursHub an employer of ambassadors?',
      a: 'No. Ambassadors participate independently and choose which campaigns to promote.',
    },
  ]

  return (
    <>
      <PageMeta title="FAQ" description="Answers about the MarcatursHub marketplace model." />
      <section className="page-hero">
        <div className="container container--narrow">
          <SectionHeading as="h1" eyebrow="FAQ" title="Common questions." />
          <div className="stack">
            {faqs.map((item) => (
              <article key={item.q} className="card">
                <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{item.q}</h2>
                <p style={{ color: 'var(--color-muted)' }}>{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export function LegalPlaceholderPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const title = kind === 'terms' ? 'Terms of use' : 'Privacy policy'
  return (
    <>
      <PageMeta title={title} />
      <section className="page-hero">
        <div className="container container--narrow">
          <SectionHeading as="h1" title={title}>
            Legal copy will be published here after counsel review. This route is reserved so the
            public experience can link consistently.
          </SectionHeading>
        </div>
      </section>
    </>
  )
}
