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
- The committed file has no host-specific Sitemap line.
- `vite build` appends `Sitemap: {VITE_PUBLIC_ORIGIN}/sitemap.xml` when that variable is a bare origin. A local build without it leaves the file unchanged.

## Sitemap

Generated into `dist/sitemap.xml` by the production build. It lists the fixed public marketing and marketplace routes, plus `/campaigns/{id}` for campaigns returned by the public marketplace index at build time.

The public index is the visibility rule: active or expiring, published current version, assignable category, and an active business account. The generator does not invent campaign ids and does not list `/app`, `/pay`, authentication, or payment-token URLs. Query-string filters on `/discover` are not separate URLs.

Campaign entries refresh on the next frontend production build. There is no request-time sitemap on the Pages host. A cross-host API sitemap was not added, because Google may not use a sitemap on another host until Search Console verifies that host.

A successful public index with an empty `data` array is an authoritative empty campaign list. If `VITE_API_BASE_URL` is set and the fetch fails, returns a non-200 status, or is not the public index shape, the build stops. That failure is not written out as zero campaigns. If the API base is unset, the build lists only the fixed public routes.

If `VITE_PUBLIC_ORIGIN` is missing or not a bare origin, the build does not write a sitemap and does not guess a host. `public/_headers` sets `Content-Type: application/xml; charset=utf-8` for `/sitemap.xml`.

## Structured data (JSON-LD)

The same production build adds an Organization object: name, public URL, the existing site description, and the official profile URLs already used in the footer. It does not describe a Product or Offer, and it does not invent a price or a commission.

## Crawler-visible shell

`index.html` includes the existing title, description, and a `noscript` block with the public navigation. Route-specific titles and canonical URLs still require JavaScript. Full server rendering remains out of scope.

## SPA crawl limitation

This is a client-rendered Vite/React Router SPA. Document head updates for each route run in the browser after JS execution. Crawlers that do not execute JS see the shell title, description, noscript links, and, on a production build, the Organization object. They do not see route-specific titles. Full SSR/SSG remains out of scope.

## Analytics

Product analytics is separate from this indexability work. See `docs/analytics.md`. Google Analytics loads only after consent on a production build with `VITE_GA_MEASUREMENT_ID` set. It is not part of the sitemap or the crawler shell.

## Security

- `robots.txt` / `noindex` are not access control; Sanctum + route guards remain authoritative.
- Metadata for Campaigns uses the **public marketplace API** only.
- Admin SPA ships with static `noindex`.
- Do not log private metadata payloads.
