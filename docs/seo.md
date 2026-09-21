# Technical SEO foundation (MH-FE-023)

Lightweight SPA SEO for **genuinely public** participant surfaces. Foundational documents do **not** prescribe SEO product behavior (no SSR mandate, no sitemap product requirement, no structured-data schema). This slice mirrors the current public vs authenticated architecture only.

## Indexability boundary

| Surface | Routes | Indexable |
| --- | --- | --- |
| Marketing | `/`, `/how-it-works`, `/for-businesses`, `/for-ambassadors`, `/about`, `/contact`, `/faq`, `/terms`, `/privacy` | Yes |
| Marketplace | `/discover`, `/campaigns/:id` (numeric) | Yes when Campaign is `active` or `expiring`; otherwise `noindex` |
| Auth flows | `/login`, `/register`, `/forgot-password`, `/reset-password` | No |
| Payment token | `/pay/:token` | No |
| Utility | `/forbidden`, `/account-blocked`, unknown/404 | No |
| Business / Ambassador app | `/app/**` (Deals, Commissions, Disputes, certification learning/assessment/certificates, settings, verification, messages, …) | No |
| Admin SPA (`adminControl`) | entire app | `noindex` in `index.html` |

Policy source: `src/shared/seo/routePolicy.ts`. Runtime sync: `SeoRouteSync` + `PageMeta`.

**Certification:** programme catalogue / learning / assessment / certificates live under `/app/ambassador/certification/**` and are **not** public or indexable.

**Category pages:** there is no dedicated public category route; filters on `/discover` use query params only (not separate stable category URLs).

## Metadata

`PageMeta` → `applyDocumentHead`:

- **Title** — page title with `· MarcatursHub` suffix (browser UX retained).
- **Description** — only on indexable pages.
- **Canonical + `og:url`** — only when indexable; built from public origin + path (+ search).
- **Open Graph** — title/description/image only when indexable.
- **Robots** — `index, follow` vs `noindex, nofollow`.
- Campaign OG image — public marketplace cover URL only (when available and Campaign is indexable).

Private routes: robots `noindex`, no canonical, no OG payload, description meta cleared (avoids leaking Deal/Commission copy into head).

## Public origin

`VITE_PUBLIC_ORIGIN` (see `.env.example` / `.env.staging.example`).

- Set on staging/production builds for stable canonical/OG URLs.
- Optional locally — falls back to `window.location.origin`.
- Do not hardcode a production domain in code.

## robots.txt

Served from `frontend/public/robots.txt`.

- Advisory only — **not** authorization.
- Disallows auth, `/app/`, `/pay/`, and utility paths.
- Does **not** list private URLs as “protected.”
- No Sitemap line (sitemap deferred).

## Sitemap

**Deferred.** A truthful Campaign sitemap needs either:

1. a public backend sitemap endpoint listing only currently public Campaigns, or  
2. a build-time generator fed by that API.

The SPA cannot invent Campaign URLs. Do not ship a static placeholder sitemap.

## Structured data (JSON-LD)

**Deferred.** Authoritative docs do not define Organization/Product/Offer facts sufficient for honest schema; marketplace commission/price fields must not be fabricated as structured offers.

## SPA crawl limitation

This is a client-rendered Vite/React Router SPA. Document head updates run in the browser after JS execution. Crawlers that do not execute JS will see `index.html` shell metadata only. Full SSR/SSG is **out of scope** for MH-FE-023 (explicit exclusion).

## Security

- `robots.txt` / `noindex` are not access control; Sanctum + route guards remain authoritative.
- Metadata for Campaigns uses the **public marketplace API** only.
- Admin SPA ships with static `noindex`.
- Do not log private metadata payloads.
