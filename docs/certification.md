# Ambassador Certification Frontend (MH-FE-CERT-01)

Optional Ambassador Professional Certification UI consuming MH-BE-CERT-01…10 APIs.

## Entry points

- Nav: **Home** (workspace) and **Discover** in Ambassador shell
- Home + Discover certification CTA banner
- Settings → Certification summary (distinct from Verification)
- Public **/for-ambassadors** teaser
- Notifications deep-links for enrollment activated / certificate available

## Journey routes

| Path | Purpose |
|------|---------|
| `/app/ambassador/certification` | Hub + status |
| `/app/ambassador/certification/programmes` | Catalogue |
| `/app/ambassador/certification/programmes/:programmeId` | Detail + Paystack purchase |
| `/app/ambassador/certification/purchase/return` | Verify payment before treating enrollment as active |
| `/app/ambassador/certification/enrollments/:enrollmentId` | Learning / Mark complete |
| `/app/ambassador/certification/enrollments/:enrollmentId/assessment` | Final assessment |
| `/app/ambassador/certification/certificates` | Certificates + PDF download |

## Authority

Server remains authoritative for fees, eligibility, scoring, Awards, and Certificates. The UI never invents certification from PDF readiness or client-only state.

## Paystack return (local)

Paystack return depends on `reference` / `trxref` query params, with `sessionStorage` fallback from initialize. Backend `PaystackReturnUrl` builds:

`{FRONTEND_URL}/app/ambassador/certification/purchase/return`

Set `FRONTEND_URL` to the browser origin you open (participant Vite: `http://localhost:5180`). Optional `PAYSTACK_CALLBACK_URL` is only a full-URL fallback when `FRONTEND_URL` is empty. Do not point returns at an unused `:3000` origin while developing on `:5180`.

Cancelled/failed return query hints (`status` / `payment_status`) are surfaced without treating enrollment as active.

## Brand assets

`logo-trans-bg.png` (2000×2000 RGBA lockup, transparent margins) is used once on the Certification hub header. `logo-white-bg.png` (2000×2000 RGB, baked white plate) is not used in-product — the white plate does not suit the soft-gray desk surfaces.

## Admin counterpart (MH-FE-CERT-03)

Programme authoring, curriculum, assessments, learner records, and certificate artifact operations
live in the Admin console, not here. See `adminControl/docs/certification.md`.

What that split means for this app:

- Ambassador-facing assessment responses may show the version-derived `pass_mark_percent` on the
  assessment payload and the attempt snapshot after start/submit. Learners cannot set or override it.
  Admin-only answer keys (`is_correct`) remain excluded from learner question options.
- Programme content is bound to a programme **version**. Published and unpublished versions are
  immutable, so a learner's bound version never changes under them; Admin authors a new draft
  version instead.
- Lesson progress is written by this app (`Mark complete`) and has no Admin read API, so Admin
  cannot inspect or override it. Progress inspection is deferred on both sides.
- Awards and certificates are server-decided. Admin cannot manually award, mark an attempt as
  passed, or revoke a certificate — so this app should never present those as pending Admin actions.

## Deferred

FR-049 certified Ambassador discovery, public verification, QR, ranking/Featured/commission changes.
Admin-side lesson-progress inspection (no backend API).
