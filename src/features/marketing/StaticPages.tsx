import { Link } from 'react-router-dom'
import { ButtonLink } from '@/shared/ui/Button'
import { MediaFrame } from '@/shared/ui/MediaFrame'
import { PageMeta, SectionHeading } from '@/shared/ui/States'
import { images } from '@/shared/content/images'

export function HowItWorksPage() {
  return (
    <>
      <PageMeta
        title="How it works"
        description="How MarcatursHub connects businesses and independent ambassadors — from campaign to confirmed commission."
      />
      <section className="page-hero page-hero--visual">
        <div className="container">
          <div className="split-visual">
            <div>
              <SectionHeading
                as="h1"
                eyebrow="How it works"
                title="The path from opportunity to commission."
              >
                The homepage explains why people join. This page explains how the marketplace
                operates — with clear payment boundaries and a commercial record that matters.
              </SectionHeading>
            </div>
            <MediaFrame src={images.collaboration.src} alt={images.collaboration.alt} wide />
          </div>
        </div>
      </section>
      <section className="section section--tight">
        <div className="container stack stack--lg">
          {[
            {
              title: '1. A Business publishes a campaign',
              body: 'The campaign carries product or service details, pricing method, commission terms, approved claims, restrictions, marketing resources and official payment information.',
            },
            {
              title: '2. An Ambassador discovers and promotes',
              body: 'Ambassadors choose campaigns they understand, use approved materials, and promote through their own networks, conversations and channels — independently, not as employees.',
            },
            {
              title: '3. The customer pays the Business directly',
              body: 'When a customer is ready to buy, payment goes to the Business. MarcatursHub does not receive or hold customer purchase funds in the MVP.',
            },
            {
              title: '4. A Deal records the commercial moment',
              body: 'A Deal documents that a customer is ready to transact under a specific Campaign Version. Ambassadors may submit payment evidence. The Business confirms qualifying payment.',
            },
            {
              title: '5. Commission becomes due — and is paid directly',
              body: 'Once qualifying payment is confirmed, commission liability becomes due under the published campaign terms. The standard expectation is payment within 7 calendar days unless the applicable published terms provide otherwise. The Business pays the Ambassador directly. MarcatursHub tracks status and reminders; it does not hold or pay commission money in the MVP.',
            },
          ].map((step) => (
            <article key={step.title} className="how-step">
              <h2>{step.title}</h2>
              <p>{step.body}</p>
            </article>
          ))}

          <div className="prose-block legal-callout">
            <h3>What MarcatursHub coordinates — and what it does not</h3>
            <p>
              MarcatursHub supports discovery, enablement, communication, Deal documentation,
              payment-detail trust, accountability, reputation signals and dispute management. It is
              not an escrow service, payment processor, employer, recruitment agency or seller of
              the listed products and services.
            </p>
          </div>

          <div className="cta-band">
            <h2>Ready to participate?</h2>
            <p>
              Create an account as a Business or Ambassador and start with a clear commercial path.
            </p>
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
      </section>
    </>
  )
}

export function ForBusinessesPage() {
  return (
    <>
      <PageMeta
        title="For businesses"
        description="Expand sales reach through independent ambassadors. Publish campaigns, set your terms, and pay commissions on qualifying results."
      />
      <section className="page-hero page-hero--visual">
        <div className="container split-visual">
          <div>
            <SectionHeading
              as="h1"
              eyebrow="For businesses"
              title="Your next sales channel could be independent."
            >
              Reach people who are willing to learn, represent and promote products and services
              they believe in, without immediately hiring a conventional sales team.
            </SectionHeading>
            <ButtonLink to="/register?role=BUSINESS">Publish your first opportunity</ButtonLink>
          </div>
          <MediaFrame src={images.business.src} alt={images.business.alt} />
        </div>
      </section>

      <section className="section">
        <div className="container stack stack--lg">
          <SectionHeading title="Why businesses use MarcatursHub">
            More introductions. Clear campaign control. Commission around qualifying commercial
            results.
          </SectionHeading>
          <div className="grid-2 feature-points">
            {[
              {
                title: 'Expand your reach',
                body: 'Connect with independent ambassadors who can introduce your offer through networks and channels you may not reach alone.',
              },
              {
                title: 'Reduce dependence on advertising alone',
                body: 'Pair paid visibility with people who can explain, follow up and bring customers to a decision.',
              },
              {
                title: 'Set your own campaign terms',
                body: 'Define what you are promoting, pricing, commission structure, approved claims and campaign rules.',
              },
              {
                title: 'Equip ambassadors to sell correctly',
                body: 'Share approved resources, FAQs, claims guidance and payment information so ambassadors represent you accurately.',
              },
              {
                title: 'Track qualifying commercial activity',
                body: 'Deals, payment evidence and confirmation create a clear record of what happened — without monitoring every private conversation.',
              },
              {
                title: 'Pay commissions directly',
                body: 'After you confirm a qualifying payment, commission becomes due under your published terms. You pay the Ambassador directly. MarcatursHub does not hold commission funds in the MVP.',
              },
            ].map((item) => (
              <article key={item.title} className="feature-point">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight surface-band">
        <div className="container">
          <SectionHeading title="Reward successful sales, not empty impressions.">
            Build a sales channel around qualifying results. Commission liability is tied to
            confirmation of qualifying payment under the campaign terms you publish, not to vanity
            metrics.
          </SectionHeading>
          <div className="cta-band">
            <h2>Publish your first opportunity</h2>
            <p>
              Create a Business account, set your terms, and invite independent ambassadors to
              discover what you sell.
            </p>
            <div className="row">
              <ButtonLink to="/register?role=BUSINESS" variant="on-dark">
                Create a business account
              </ButtonLink>
              <ButtonLink to="/how-it-works" variant="on-dark-ghost">
                See the operating model
              </ButtonLink>
            </div>
          </div>
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
        description="Promote products and services you believe in. Stay independent. Earn commission when qualifying deals are completed."
      />
      <section className="page-hero page-hero--visual">
        <div className="container split-visual">
          <div>
            <SectionHeading
              as="h1"
              eyebrow="For ambassadors"
              title="Promote what you believe in. Earn when the deal is done."
            >
              Discover businesses you can represent independently, use your network and channels to
              promote what fits you, and earn commission when qualifying deals are completed.
            </SectionHeading>
            <ButtonLink to="/register?role=AMBASSADOR">Become an Ambassador</ButtonLink>
          </div>
          <MediaFrame src={images.ambassadors.src} alt={images.ambassadors.alt} />
        </div>
      </section>

      <section className="section">
        <div className="container stack stack--lg">
          <SectionHeading title="Why ambassadors join">
            Independence, choice and a clear path from promotion to qualifying commission, without
            income promises.
          </SectionHeading>
          <div className="grid-2 feature-points">
            {[
              {
                title: 'Be independent',
                body: 'You participate as an independent promoter, not as an employee of the businesses you represent or of MarcatursHub.',
              },
              {
                title: 'Choose what fits',
                body: 'Browse campaigns and select products or services you understand and believe you can promote well.',
              },
              {
                title: 'Turn your network into opportunity',
                body: 'Use relationships, communities, professional connections and social channels you already have.',
              },
              {
                title: 'Work around your existing commitments',
                body: 'Your 9–5 does not have to be your only opportunity. Explore representation independently without leaving your current job.',
              },
              {
                title: 'Learn before you promote',
                body: 'Review campaign terms, approved materials and restrictions so you can represent the offer honestly.',
              },
              {
                title: 'Earn on qualifying results',
                body: 'Commission becomes due after the Business confirms qualifying payment under the published campaign terms. Customers pay the Business directly, ambassadors must never collect customer payments.',
              },
            ].map((item) => (
              <article key={item.title} className="feature-point">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container stack stack--lg">
          <SectionHeading title="Optional professional certification">
            Structured learning, assessment, and a MarcatursHub certificate, separate from
            marketplace access and identity verification.
          </SectionHeading>
          <div className="certification-public-teaser">
            <div className="certification-public-teaser__media" aria-hidden>
              <img src={images.office.src} alt="" decoding="async" />
            </div>
            <div className="stack">
              <h3>Ambassador Professional Certification</h3>
              <p>
                Build commercial confidence with a programme journey: discover, learn, assess, and
                earn a certificate. Participation is optional and does not guarantee income or
                employment.
              </p>
              <div className="row">
                <ButtonLink to="/register?role=AMBASSADOR">Create an ambassador account</ButtonLink>
                <ButtonLink to="/faq" variant="secondary">
                  Learn more
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tight surface-band">
        <div className="container">
          <SectionHeading title="Build a commercial track record.">
            Reliable participation — clear Deals, honest evidence, and responsible promotion — can
            form part of how you are known on the marketplace over time. MarcatursHub does not
            promise income, sales volume or “easy money.”
          </SectionHeading>
          <div className="cta-band">
            <h2>Become an Ambassador</h2>
            <p>Create an account, discover campaigns that fit you, and promote with clarity.</p>
            <div className="row">
              <ButtonLink to="/register?role=AMBASSADOR" variant="on-dark">
                Create an ambassador account
              </ButtonLink>
              <ButtonLink to="/discover" variant="on-dark-ghost">
                Browse opportunities
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export function AboutPage() {
  return (
    <>
      <PageMeta
        title="About MarcatursHub"
        description="MarcatursHub exists because businesses need reach, and capable people already have networks that can create it."
      />
      <section className="page-hero page-hero--visual">
        <div className="container split-visual">
          <div>
            <SectionHeading
              as="h1"
              eyebrow="About"
              title="Businesses need reach. People already have networks."
            >
              MarcatursHub exists because businesses often need more sales reach without immediately
              building a large sales organisation, and because capable people already have
              relationships, knowledge and influence that can create that reach.
            </SectionHeading>
          </div>
          <MediaFrame src={images.about.src} alt={images.about.alt} wide />
        </div>
      </section>

      <section className="section section--tight">
        <div className="container container--narrow stack stack--lg">
          <article className="prose-block">
            <h2>What MarcatursHub is</h2>
            <p>
              MarcatursHub is a distributed sales and ambassador marketplace operated by Tarizefa
              Limited. It connects eligible businesses with independent ambassadors who choose
              products and services they want to promote.
            </p>
            <p>
              Businesses publish commission-based campaigns. Ambassadors discover those campaigns,
              promote through their own channels, and help bring customers to a decision. Customers
              pay businesses directly. Qualifying commissions are paid by businesses to ambassadors
              directly. MarcatursHub records and coordinates the commercially important moments
              without holding customer or commission money.
            </p>
          </article>

          <article className="prose-block">
            <h2>Why it exists</h2>
            <p>
              Traditional sales capacity often means recruiting, training, supervising and paying a
              team before results arrive. At the same time, many people want flexible ways to create
              income from what they already know and who they already know  without becoming
              someone else’s employee.
            </p>
            <p>MarcatursHub connects those two needs in one marketplace.</p>
          </article>

          <article className="prose-block">
            <h2>Mission</h2>
            <p>
              Make it easier for businesses to access independent sales reach, and easier for people
              to discover legitimate products and services they can represent independently.
            </p>
          </article>

          <article className="prose-block">
            <h2>Vision</h2>
            <p>
              A trusted marketplace where businesses can access distributed sales reach and
              individuals can create income opportunities by representing products and services they
              understand and believe in.
            </p>
          </article>

          <article className="prose-block">
            <h2>What we believe</h2>
            <ul>
              <li>
                Independence matters, ambassadors are not employees of the businesses they promote.
              </li>
              <li>Commercial terms should be clear before anyone promotes or confirms a Deal.</li>
              <li>Customers should know who they are paying.</li>
              <li>Ambassadors should never collect customer payments.</li>
              <li>Businesses should be accountable for their published campaign terms.</li>
              <li>
                Trust is earned through verification, evidence and behaviour, not through holding
                funds.
              </li>
              <li>
                The platform should record important commercial moments without trying to monitor
                every conversation.
              </li>
            </ul>
          </article>

          <article className="prose-block">
            <h2>What we are not</h2>
            <p>
              MarcatursHub is not an affiliate-link website, payment processor, escrow service,
              employer, recruitment agency, CRM or e-commerce fulfilment platform. It is a
              marketplace and coordination layer for independent promotion.
            </p>
          </article>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <div className="split-visual">
            <MediaFrame src={images.office.src} alt={images.office.alt} />
            <div>
              <SectionHeading title="Built for accountability, not custody.">
                Campaign Versions, Deals, payment evidence, confirmation events and dispute records
                keep commercial truth attached to what was actually agreed and confirmed, while
                money moves between the parties who owe it.
              </SectionHeading>
              <ButtonLink to="/register">Create your account</ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export function ContactPage() {
  return (
    <>
      <PageMeta
        title="Contact"
        description="Contact Tarizefa Limited / MarcatursHub. Public support channels will be confirmed by the company."
      />
      <section className="page-hero page-hero--visual">
        <div className="container split-visual">
          <div className="stack">
            <SectionHeading as="h1" eyebrow="Contact" title="Talk to MarcatursHub.">
              MarcatursHub is operated by Tarizefa Limited. For product, partnership or legal
              enquiries, use the company contact channels published by Tarizefa Limited /
              MarcatursHub operations.
            </SectionHeading>
            <div className="alert alert--info">
              <strong>Contact details pending company confirmation.</strong> A public support email,
              phone number and registered address have not been finalised in this repository. We
              will not invent contact details. When confirmed, they will appear here and in the
              Terms and Privacy pages.
            </div>
            <p className="muted-note">
              Looking for product help in the meantime? Review the <Link to="/faq">FAQ</Link>,{' '}
              <Link to="/how-it-works">How it works</Link>, or create an account to use in-app
              support paths once available.
            </p>
          </div>
          <MediaFrame src={images.support.src} alt={images.support.alt} />
        </div>
      </section>
    </>
  )
}

export function FaqPage() {
  const businessFaqs = [
    {
      q: 'What is MarcatursHub?',
      a: 'MarcatursHub is a distributed sales and ambassador marketplace. Businesses publish commission-based campaigns. Independent ambassadors discover and promote offers they choose. Customers pay businesses directly.',
    },
    {
      q: 'How can ambassadors help my business?',
      a: 'Ambassadors can introduce your products or services through their own networks, relationships and channels — helping you reach people without immediately expanding a traditional sales team.',
    },
    {
      q: 'Do I have to hire ambassadors?',
      a: 'No. Ambassadors participate independently. They are not your employees and they are not employees of MarcatursHub.',
    },
    {
      q: 'How do commissions work?',
      a: 'You publish commission terms in your campaign. When you confirm a qualifying payment under those terms, commission becomes due. The standard payment expectation is 7 calendar days unless your published terms provide otherwise.',
    },
    {
      q: 'Who pays the ambassador?',
      a: 'You do — directly. MarcatursHub tracks commission status and reminders. It does not hold or pay commission money in the MVP.',
    },
    {
      q: 'Does MarcatursHub hold customer money?',
      a: 'No. Customers pay your business directly. MarcatursHub does not receive or hold customer purchase funds in the MVP.',
    },
    {
      q: 'Can I choose my commission terms?',
      a: 'Yes. Campaign commercial terms — including commission structure — are set by the Business within the platform’s campaign model and published Campaign Version.',
    },
    {
      q: 'Can I provide marketing materials?',
      a: 'Yes. Campaigns can include approved marketing resources, claims guidance and restrictions so ambassadors represent your offer accurately.',
    },
  ]

  const ambassadorFaqs = [
    {
      q: 'What is an Ambassador?',
      a: 'An Ambassador is an independent participant who discovers campaigns, promotes products or services they choose, and may earn commission when qualifying deals are confirmed.',
    },
    {
      q: 'Am I an employee?',
      a: 'No. Ambassadors are independent. Joining MarcatursHub or promoting a campaign does not create employment with the Business or with MarcatursHub.',
    },
    {
      q: 'Can I promote multiple businesses?',
      a: 'Yes, subject to each campaign’s rules and applicable law. You choose which campaigns fit you.',
    },
    {
      q: 'Do I pay to join?',
      a: 'Registration as an Ambassador is free. Optional paid products (such as Featured visibility for businesses, or future certification programmes) are separate from basic participation.',
    },
    {
      q: 'How do I earn commission?',
      a: 'Promote a campaign, create a Deal when a customer is ready to transact, submit payment evidence where applicable, and wait for the Business to confirm qualifying payment. Commission then becomes due under the campaign terms.',
    },
    {
      q: 'Can I collect customer payments?',
      a: 'No. Customers must pay the Business directly using official payment information. Ambassadors must never collect customer funds.',
    },
    {
      q: 'When should I create a Deal?',
      a: 'Create a Deal when a customer is genuinely ready to transact under the campaign — not as a speculative lead record.',
    },
    {
      q: 'What happens if a Business does not pay?',
      a: 'MarcatursHub tracks deadlines and may support reminders, reports and dispute processes. The platform does not guarantee commission recovery and does not pay commissions from its own funds in the MVP.',
    },
  ]

  return (
    <>
      <PageMeta
        title="FAQ"
        description="Answers for businesses and ambassadors about MarcatursHub, commissions, payments and participation."
      />
      <section className="page-hero">
        <div className="container container--narrow">
          <SectionHeading as="h1" eyebrow="FAQ" title="Straight answers before you join.">
            Clear questions about reach, independence, commissions and who holds the money.
          </SectionHeading>

          <div className="faq-group">
            <h2 className="faq-group__title">For businesses</h2>
            <div className="faq-list">
              {businessFaqs.map((item) => (
                <article key={item.q} className="faq-item">
                  <h3>{item.q}</h3>
                  <p>{item.a}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="faq-group">
            <h2 className="faq-group__title">For ambassadors</h2>
            <div className="faq-list">
              {ambassadorFaqs.map((item) => (
                <article key={item.q} className="faq-item">
                  <h3>{item.q}</h3>
                  <p>{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
