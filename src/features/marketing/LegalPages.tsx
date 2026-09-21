import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { PageMeta, SectionHeading } from '@/shared/ui/States'

const TERMS_EFFECTIVE = '14 September 2026'
const PRIVACY_EFFECTIVE = '14 September 2026'

type LegalSection = {
  id: string
  title: string
  content: ReactNode
}

function LegalNotice() {
  return (
    <div className="legal-notice" role="note">
      <p>
        This document is prepared for the MarcatursHub operating model and remains{' '}
        <strong>subject to final legal review</strong> by Nigerian counsel. It is not legal advice
        and does not claim certification of compliance.
      </p>
    </div>
  )
}

function LegalLayout({
  title,
  description,
  effectiveDate,
  version,
  sections,
}: {
  title: string
  description: string
  effectiveDate: string
  version: string
  sections: LegalSection[]
}) {
  return (
    <>
      <PageMeta title={title} description={description} />
      <section className="page-hero legal-hero">
        <div className="container container--narrow">
          <SectionHeading as="h1" eyebrow="Legal" title={title}>
            Effective date: {effectiveDate}. Version {version}.
          </SectionHeading>
          <LegalNotice />
        </div>
      </section>
      <section className="section section--tight legal-doc">
        <div className="container legal-doc__grid">
          <nav className="legal-toc" aria-label={`${title} sections`}>
            <p className="legal-toc__label">On this page</p>
            <ol>
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="legal-doc__body">
            {sections.map((section) => (
              <article key={section.id} id={section.id} className="legal-section">
                <h2>{section.title}</h2>
                <div className="prose-block">{section.content}</div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export function TermsPage() {
  const sections: LegalSection[] = [
    {
      id: 'introduction',
      title: '1. Introduction',
      content: (
        <>
          <p>
            These Terms of Use (“Terms”) govern access to and use of the MarcatursHub website,
            applications and related services (the “Platform”) operated by Tarizefa Limited
            (“MarcatursHub”, “we”, “us” or “our”).
          </p>
          <p>
            By creating an account or using the Platform, you agree to these Terms and our{' '}
            <Link to="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Platform.
          </p>
          <p>
            The Platform is intended for eligible businesses and independent ambassadors
            participating in commercial promotion activity. Eligibility and capacity to contract are
            subject to applicable Nigerian law and final counsel confirmation.
          </p>
        </>
      ),
    },
    {
      id: 'definitions',
      title: '2. Definitions',
      content: (
        <>
          <ul>
            <li>
              <strong>Business</strong> — a user account and related profile publishing campaigns to
              obtain independent sales reach.
            </li>
            <li>
              <strong>Ambassador</strong> — an independent user who discovers and promotes campaigns
              without becoming an employee of the Business or of MarcatursHub.
            </li>
            <li>
              <strong>Customer</strong> — a person or entity purchasing from a Business. Customers
              are not required to create a MarcatursHub account merely to pay a Business or verify
              official payment information where the product flow permits this.
            </li>
            <li>
              <strong>Campaign</strong> — a Business opportunity published on the Platform,
              including product/service information and commercial terms.
            </li>
            <li>
              <strong>Campaign Version</strong> — a versioned snapshot of material commercial terms
              associated with a Campaign. Deals bind to the applicable Campaign Version.
            </li>
            <li>
              <strong>Deal</strong> — a Platform record that a customer is ready to transact under a
              Campaign Version.
            </li>
            <li>
              <strong>Commission</strong> — amounts payable by a Business to an Ambassador under
              published campaign terms after qualifying confirmation.
            </li>
            <li>
              <strong>Payment Evidence</strong> — materials submitted to support confirmation of
              customer payment to a Business.
            </li>
            <li>
              <strong>Verification</strong> — review of specified information or checks configured
              for an account. Verification is not a product, solvency or payment guarantee.
            </li>
            <li>
              <strong>Featured Campaign</strong> — paid visibility/placement for a Campaign.
              Featured status does not guarantee sales.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'platform-role',
      title: '3. Platform role',
      content: (
        <>
          <p>
            MarcatursHub operates a marketplace and coordination Platform. In the MVP, MarcatursHub:
          </p>
          <ul>
            <li>does not sell the products or services listed in Campaigns;</li>
            <li>does not employ Ambassadors;</li>
            <li>does not act as a Business’s sales employee;</li>
            <li>does not hold customer purchase funds;</li>
            <li>does not hold commission funds;</li>
            <li>does not act as escrow;</li>
            <li>does not guarantee sales, customer payment or commission recovery.</li>
          </ul>
          <p>
            MarcatursHub may provide discovery, enablement tools, messaging between Businesses and
            Ambassadors, Deal documentation, payment-detail trust surfaces, reputation-related
            records, reminders and dispute management consistent with the product.
          </p>
        </>
      ),
    },
    {
      id: 'business-obligations',
      title: '4. Business obligations',
      content: (
        <>
          <p>Businesses must:</p>
          <ul>
            <li>
              provide accurate Campaign information and have authority to offer listed
              products/services;
            </li>
            <li>publish lawful pricing, commission terms, claims and marketing materials;</li>
            <li>maintain accurate official payment destination information;</li>
            <li>honour qualifying campaign terms they publish;</li>
            <li>review payment evidence appropriately and confirm qualifying payments honestly;</li>
            <li>pay qualifying commissions according to published terms;</li>
            <li>
              comply with applicable Nigerian laws, including consumer, advertising and tax
              obligations where applicable.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'ambassador-obligations',
      title: '5. Ambassador obligations',
      content: (
        <>
          <p>Ambassadors must:</p>
          <ul>
            <li>
              operate independently and not present themselves as employees of a Business or of
              MarcatursHub;
            </li>
            <li>use truthful marketing and approved materials/claims;</li>
            <li>comply with campaign restrictions and brand rules;</li>
            <li>not impersonate a Business or misrepresent authority;</li>
            <li>never collect customer payments;</li>
            <li>never fabricate payment evidence;</li>
            <li>create Deals only when customers are genuinely ready to transact;</li>
            <li>comply with applicable advertising and communications laws.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'customer-relationship',
      title: '6. Customer relationship',
      content: (
        <>
          <p>
            Customer purchases are made directly from the Business. The Business remains responsible
            for product/service delivery, invoices/receipts, warranties where applicable, customer
            service and its own customer contract terms.
          </p>
          <p>
            Customers should verify official payment details before paying. MarcatursHub does not
            become the seller or provider of listed products/services.
          </p>
        </>
      ),
    },
    {
      id: 'campaigns',
      title: '7. Campaigns and Campaign Versions',
      content: (
        <>
          <p>
            Businesses publish Campaigns. Material commercial terms may be captured in Campaign
            Versions. A Deal is associated with the applicable Campaign Version so that later
            campaign changes do not rewrite the commercial terms of an existing Deal.
          </p>
        </>
      ),
    },
    {
      id: 'deals',
      title: '8. Deals',
      content: (
        <>
          <p>
            A Deal is created when a customer is ready to transact under a Campaign Version.
            Customer identity matching is not required merely to create attribution in the MVP.
            Ambassadors may submit Payment Evidence. Business confirmation of qualifying payment
            creates commission liability under the applicable terms. Deal events are recorded for
            accountability.
          </p>
        </>
      ),
    },
    {
      id: 'commission',
      title: '9. Commission',
      content: (
        <>
          <p>
            Commission terms are campaign-specific. Qualifying payment confirmation by the Business
            creates commission liability. The standard payment expectation is{' '}
            <strong>7 calendar days</strong> from confirmation unless applicable published terms
            provide otherwise.
          </p>
          <p>
            MarcatursHub may track status and issue reminders. The Business pays the Ambassador
            directly. MarcatursHub does not hold or pay commission money in the MVP and does not
            guarantee recovery of unpaid commission.
          </p>
        </>
      ),
    },
    {
      id: 'refunds',
      title: '10. Refunds and cancellations',
      content: (
        <>
          <p>
            MarcatursHub does not operate an on-platform refund-processing system in the MVP.
            Business/customer refund or cancellation rights remain governed by applicable law and
            the Business’s applicable terms. MarcatursHub does not adjudicate every refund and does
            not become a financial guarantor through dispute processes.
          </p>
        </>
      ),
    },
    {
      id: 'disputes',
      title: '11. Disputes',
      content: (
        <>
          <p>
            Participants may submit disputes where supported by the Platform. MarcatursHub may
            investigate, review evidence and apply sanctions under Platform rules. Investigation
            does not turn MarcatursHub into a financial guarantor and does not promise recovery of
            funds.
          </p>
        </>
      ),
    },
    {
      id: 'verification',
      title: '12. Verification',
      content: (
        <>
          <p>
            Verification means specified information or checks were reviewed according to configured
            requirements. It does <strong>not</strong> mean a product guarantee, financial
            guarantee, guarantee of business solvency, guarantee of commission payment, or guarantee
            of transaction success.
          </p>
        </>
      ),
    },
    {
      id: 'featured',
      title: '13. Featured campaigns',
      content: (
        <>
          <p>
            Featured Campaign visibility is a paid placement/visibility product. It does not
            guarantee sales, ambassador interest or completed Deals.
          </p>
        </>
      ),
    },
    {
      id: 'fees',
      title: '14. Fees',
      content: (
        <>
          <p>
            Registration is free. Businesses may receive an administrator-configured free listing
            period and may purchase campaign extensions. Featured products are separate paid
            visibility offerings. Platform payments for those products are processed through the
            Platform’s configured payment provider in test or live mode according to environment.
            Exact prices are administrator-configured and published in-product; these Terms do not
            invent fixed prices.
          </p>
        </>
      ),
    },
    {
      id: 'ip',
      title: '15. Intellectual property',
      content: (
        <>
          <p>
            MarcatursHub and its licensors own the Platform software, branding and related IP.
            Businesses retain ownership of their campaign materials and grant MarcatursHub a licence
            to host and display them for Platform operation. Ambassadors must not upload unlawful,
            infringing or deceptive content. Rights holders may report infringement through the
            contact channels published by Tarizefa Limited / MarcatursHub.
          </p>
        </>
      ),
    },
    {
      id: 'prohibited',
      title: '16. Prohibited conduct',
      content: (
        <>
          <p>Without limitation, users must not:</p>
          <ul>
            <li>commit fraud, impersonation or false advertising;</li>
            <li>collect customer payments as an Ambassador;</li>
            <li>submit fake payment evidence;</li>
            <li>abuse, harass or threaten other participants;</li>
            <li>list or promote unlawful products/services;</li>
            <li>manipulate Platform records, ratings or dispute processes;</li>
            <li>attempt unauthorised access to accounts, data or systems.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'sanctions',
      title: '17. Account restriction, suspension and termination',
      content: (
        <>
          <p>
            MarcatursHub may warn, restrict, suspend, ban or otherwise sanction accounts for
            violations of these Terms, fraud risk, legal compliance needs or Platform integrity,
            consistent with product capabilities. Users may lose access to Platform features while
            sanctions remain in effect.
          </p>
        </>
      ),
    },
    {
      id: 'privacy',
      title: '18. Privacy',
      content: (
        <>
          <p>
            Personal data is handled as described in our <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </>
      ),
    },
    {
      id: 'disclaimers',
      title: '19. Disclaimers',
      content: (
        <>
          <p>
            The Platform is provided on an “as available” basis for marketplace coordination. To the
            fullest extent permitted by mandatory Nigerian law, MarcatursHub disclaims warranties
            not expressly stated in these Terms, including implied warranties of uninterrupted
            availability or fitness for a particular commercial outcome. Nothing in these Terms
            excludes liability that cannot lawfully be excluded.
          </p>
        </>
      ),
    },
    {
      id: 'liability',
      title: '20. Liability',
      content: (
        <>
          <p>
            MarcatursHub’s role is limited to Platform operation. Businesses remain responsible for
            their offerings and customer relationships. Ambassadors remain responsible for their
            independent promotion. Subject to mandatory law and counsel review, MarcatursHub is not
            liable for lost sales, unpaid commissions between participants, customer disputes with
            Businesses, or losses arising from user misconduct.
          </p>
          <p className="counsel-flag">
            Counsel review item: final liability caps, exclusions and consumer-law carve-outs must
            be confirmed before public launch.
          </p>
        </>
      ),
    },
    {
      id: 'indemnity',
      title: '21. Indemnity',
      content: (
        <>
          <p>
            You agree to defend and indemnify Tarizefa Limited against claims arising from your
            Campaign content, promotion activity, misrepresentation, unlawful conduct or breach of
            these Terms, to the extent permitted by law.
          </p>
          <p className="counsel-flag">
            Counsel review item: indemnity scope and enforceability under Nigerian law.
          </p>
        </>
      ),
    },
    {
      id: 'changes',
      title: '22. Changes to Terms',
      content: (
        <>
          <p>
            We may update these Terms. Material changes will be indicated by updating the effective
            date and version. Continued use after the effective date constitutes acceptance of the
            updated Terms, except where mandatory law requires additional notice or consent.
          </p>
        </>
      ),
    },
    {
      id: 'governing-law',
      title: '23. Governing law',
      content: (
        <>
          <p>
            These Terms are intended to be governed by the laws of the Federal Republic of Nigeria,
            subject to final confirmation by company counsel. Dispute venue and jurisdiction details
            will be confirmed by counsel and published here before relying on them for enforcement.
          </p>
          <p className="counsel-flag">
            Counsel review item: governing law, venue and dispute-resolution mechanism (including
            any ADR). Do not invent a court address.
          </p>
        </>
      ),
    },
    {
      id: 'contact',
      title: '24. Contact',
      content: (
        <>
          <p>
            MarcatursHub is operated by <strong>Tarizefa Limited</strong>. For Terms-related
            enquiries, use the contact channels published on the <Link to="/contact">Contact</Link>{' '}
            page once company contact details are confirmed.
          </p>
          <p className="counsel-flag">
            Company confirmation item: public legal/support email, phone and registered address are
            not yet verified in-repository and must not be invented.
          </p>
        </>
      ),
    },
  ]

  return (
    <LegalLayout
      title="Terms of Use"
      description="Terms of Use for the MarcatursHub marketplace operated by Tarizefa Limited."
      effectiveDate={TERMS_EFFECTIVE}
      version="1.0-draft"
      sections={sections}
    />
  )
}

export function PrivacyPage() {
  const sections: LegalSection[] = [
    {
      id: 'controller',
      title: '1. Who we are',
      content: (
        <>
          <p>
            This Privacy Policy explains how Tarizefa Limited (“MarcatursHub”, “we”, “us”) processes
            personal data in connection with the MarcatursHub Platform.
          </p>
          <p className="counsel-flag">
            Company confirmation item: registered address, privacy contact email and any Data
            Protection Officer designation remain pending verification and must be added when
            confirmed.
          </p>
        </>
      ),
    },
    {
      id: 'scope',
      title: '2. Scope',
      content: (
        <>
          <p>
            This Policy covers Business and Ambassador account holders and other individuals whose
            data is processed through the Platform (for example, where verification evidence or Deal
            records include personal data). It should be read with our{' '}
            <Link to="/terms">Terms of Use</Link>.
          </p>
        </>
      ),
    },
    {
      id: 'data-we-collect',
      title: '3. Data we collect',
      content: (
        <>
          <p>Depending on how you use the Platform, we may process:</p>
          <ul>
            <li>
              <strong>Account data</strong> — name, email, password credential representation, role
              and account status; phone where provided by the product flows.
            </li>
            <li>
              <strong>Profile data</strong> — Business profile information and Ambassador profile
              information you submit.
            </li>
            <li>
              <strong>Verification data</strong> — information and supporting evidence submitted to
              meet configured verification requirements. Requirements may change; we do not claim
              collection of specific national identifiers unless actually configured and submitted.
            </li>
            <li>
              <strong>Campaign data</strong> — campaign information, marketing resources and
              commercial terms published by Businesses.
            </li>
            <li>
              <strong>Deal data</strong> — Deal records, commercial information needed for
              attribution, Payment Evidence, timestamps and related events.
            </li>
            <li>
              <strong>Chat data</strong> — Business↔Ambassador messages and related
              moderation/report metadata where those features are used.
            </li>
            <li>
              <strong>Technical/security data</strong> — such as IP address, device/browser
              information and security logs needed to operate and protect the service.
            </li>
          </ul>
          <p>
            We do not invent analytics or marketing-pixel systems in this Policy. If optional
            analytics are introduced later, this Policy will be updated.
          </p>
        </>
      ),
    },
    {
      id: 'purposes',
      title: '4. Why we use data',
      content: (
        <>
          <ul>
            <li>create and authenticate accounts;</li>
            <li>operate profiles, verification and marketplace participation;</li>
            <li>enable campaigns, Deals, payment evidence and commission tracking;</li>
            <li>support Business/Ambassador communication;</li>
            <li>investigate disputes and enforce Platform rules;</li>
            <li>send transactional notifications and reminders;</li>
            <li>secure the Platform and prevent fraud/abuse;</li>
            <li>comply with legal obligations;</li>
            <li>improve Platform reliability and user experience where legitimately applicable.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'lawful-bases',
      title: '5. Lawful bases',
      content: (
        <>
          <p>
            Under the Nigeria Data Protection Act, 2023 and applicable NDPC guidance, processing
            should rest on an appropriate lawful basis. Depending on the activity, this may include
            performance of a contract or steps at your request, compliance with legal obligations,
            legitimate interests that do not override your rights, or consent where genuinely
            required.
          </p>
          <p className="counsel-flag">
            Counsel review item: map each processing purpose to a specific NDPA lawful basis before
            launch. Do not treat “consent” as the default for all processing.
          </p>
        </>
      ),
    },
    {
      id: 'customer-minimization',
      title: '6. Customer data minimization',
      content: (
        <>
          <p>
            MarcatursHub does not require a customer to create a full Platform account merely to
            interact with an Ambassador or to verify official payment information where the product
            flow permits this. We aim to avoid collecting customer data that is not needed for the
            Platform’s commercial-event model.
          </p>
        </>
      ),
    },
    {
      id: 'sharing',
      title: '7. Sharing',
      content: (
        <>
          <p>We may share personal data with:</p>
          <ul>
            <li>
              Businesses and Ambassadors as needed to operate campaigns, Deals and communication;
            </li>
            <li>
              infrastructure and service providers (hosting, email, monitoring, payment providers
              for Platform fees);
            </li>
            <li>professional advisers;</li>
            <li>regulators or law enforcement where legally required.</li>
          </ul>
          <p>We do not sell personal data.</p>
        </>
      ),
    },
    {
      id: 'security',
      title: '8. Storage and security',
      content: (
        <>
          <p>
            We apply reasonable technical and organisational measures appropriate to the sensitivity
            of the data, including access controls and protected storage for sensitive uploads. No
            method of transmission or storage is perfectly secure.
          </p>
        </>
      ),
    },
    {
      id: 'retention',
      title: '9. Retention',
      content: (
        <>
          <p>
            We retain personal data only as long as needed for the purposes described, including
            dispute, audit, security and legal obligations. Specific retention schedules remain
            subject to operational and counsel review and will be documented as they are finalised.
          </p>
        </>
      ),
    },
    {
      id: 'transfers',
      title: '10. International transfers',
      content: (
        <>
          <p>
            Cloud and service providers may process data in or from locations outside Nigeria. Where
            international transfers occur, we will use appropriate safeguards consistent with
            applicable Nigerian data-protection requirements, subject to counsel confirmation of the
            final transfer mechanism.
          </p>
        </>
      ),
    },
    {
      id: 'rights',
      title: '11. Your rights',
      content: (
        <>
          <p>
            Subject to the Nigeria Data Protection Act, 2023 and applicable exceptions, you may have
            rights to be informed, access, rectify, object, restrict processing, data portability,
            erasure/deletion, and rights relating to automated decision-making where applicable. You
            may also have the right to lodge a complaint with the Nigeria Data Protection Commission
            or other competent authority.
          </p>
          <p>
            To exercise rights, use the contact channels published on the{' '}
            <Link to="/contact">Contact</Link> page once confirmed.
          </p>
        </>
      ),
    },
    {
      id: 'cookies',
      title: '12. Cookies and similar technologies',
      content: (
        <>
          <p>
            The Platform uses strictly necessary technical storage for authentication/session
            security and core functionality. This Policy does not claim extensive analytics or
            advertising cookies. If optional analytics or preference cookies are introduced, we will
            update this section and obtain any required consent.
          </p>
        </>
      ),
    },
    {
      id: 'communications',
      title: '13. Communications',
      content: (
        <>
          <p>
            We send transactional messages needed to operate accounts, Deals, commissions, security
            and disputes. We do not invent a promotional newsletter system in this Policy. If
            marketing communications are introduced, they will be identified and controllable as
            required by law.
          </p>
        </>
      ),
    },
    {
      id: 'children',
      title: '14. Children’s data',
      content: (
        <>
          <p>
            The Platform is directed to businesses and independent commercial participants, not to
            children. We do not knowingly collect children’s data for marketplace participation.
          </p>
          <p className="counsel-flag">
            Counsel review item: confirm any minimum age threshold and eligibility wording for
            Nigerian launch.
          </p>
        </>
      ),
    },
    {
      id: 'incidents',
      title: '15. Security incidents',
      content: (
        <>
          <p>
            Where a personal data breach occurs, we will follow appropriate incident response
            processes and make legally required notifications under applicable Nigerian law.
          </p>
        </>
      ),
    },
    {
      id: 'updates',
      title: '16. Policy updates',
      content: (
        <>
          <p>
            We may update this Privacy Policy by changing the effective date and version. Material
            changes will be communicated in a manner appropriate to the change and legal
            requirements.
          </p>
        </>
      ),
    },
    {
      id: 'contact',
      title: '17. Contact for privacy requests',
      content: (
        <>
          <p>
            Privacy requests should be directed to Tarizefa Limited / MarcatursHub through the
            channels published on the <Link to="/contact">Contact</Link> page once company contact
            details are confirmed.
          </p>
          <p className="counsel-flag">
            Company confirmation item: privacy inbox / DPO identity must not be invented.
          </p>
        </>
      ),
    },
  ]

  return (
    <LegalLayout
      title="Privacy Policy"
      description="Privacy Policy for MarcatursHub describing how Tarizefa Limited processes personal data."
      effectiveDate={PRIVACY_EFFECTIVE}
      version="1.0-draft"
      sections={sections}
    />
  )
}
