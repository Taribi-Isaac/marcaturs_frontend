# MarcatursHub Primary Frontend

Participant and public marketplace SPA (`frontend/`).

## Campaign Cover (MH-FE-017)

Campaign Cover is the **primary presentation image** for a Campaign.

It is **not**:

- a Campaign Version commercial field
- a Marketing Resource
- a Featured-specific image
- part of Deal snapshots

### Marketplace

- Discover cards and Featured cards use `cover_image.available` + `cover_image.url` from `GET /api/v1/marketplace/campaigns`
- Campaign detail hero prefers Cover; otherwise ambassador marketing image (when authenticated) or a branded typographic fallback
- Public stream URL is used as supplied (normalized to same-origin `/api/v1/…` for the Vite proxy)

### Business management

- `/app/business/campaigns/:id` Overview → **Campaign Cover** panel (upload / replace / remove)
- Marketing Resources remain on the Resources tab
- Cover mutation uses `POST` / `DELETE /api/v1/campaigns/{id}/cover` with existing Sanctum cookie auth

### Fallback

When `available` is false or `url` is null, UI shows an intentional branded fallback (category + title). No remote stock photos and no broken-image placeholders.

## Staging builds (ENG-040A)

Use `.env.staging.example` as a template for staging Vite builds (`vite build --mode staging`). Point `VITE_BACKEND_ORIGIN` / API / Reverb at the staging API and WSS hosts. Do not commit filled staging env files. See `backend/docs/deployment/staging.md`.
