import { canonicalUrlForPath, toAbsolutePublicUrl } from './publicOrigin'

export type DocumentHeadInput = {
  title?: string
  description?: string | null
  /** When false, forces noindex even on otherwise public paths. */
  indexable?: boolean
  /** Pathname for canonical (defaults to current location when in browser). */
  pathname?: string
  search?: string
  /** Absolute or same-origin path for og:image. */
  imageUrl?: string | null
  /** Site-wide brand suffix; set false to use title as-is. */
  brandSuffix?: boolean
}

const DESCRIPTION_SELECTOR = 'meta[name="description"]'
const ROBOTS_SELECTOR = 'meta[name="robots"]'
const CANONICAL_SELECTOR = 'link[rel="canonical"]'
const OG_TITLE = 'meta[property="og:title"]'
const OG_DESCRIPTION = 'meta[property="og:description"]'
const OG_URL = 'meta[property="og:url"]'
const OG_IMAGE = 'meta[property="og:image"]'
const OG_TYPE = 'meta[property="og:type"]'

function ensureMeta(selector: string, attribute: 'name' | 'property', key: string): HTMLMetaElement {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attribute, key)
    document.head.appendChild(el)
  }
  return el
}

function ensureLink(rel: string): HTMLLinkElement {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  return el
}

function removeSelector(selector: string): void {
  document.head.querySelector(selector)?.remove()
}

export function setRobotsContent(content: string): void {
  if (typeof document === 'undefined') return
  ensureMeta(ROBOTS_SELECTOR, 'name', 'robots').setAttribute('content', content)
}

export function clearSocialPreviewTags(): void {
  if (typeof document === 'undefined') return
  removeSelector(OG_IMAGE)
  removeSelector(OG_URL)
}

/**
 * Apply document head fields for the current view.
 * Safe for SPA: only mutates head tags; does not invent page body content.
 */
export function applyDocumentHead(input: DocumentHeadInput): void {
  if (typeof document === 'undefined') return

  const brandSuffix = input.brandSuffix !== false
  if (input.title != null && input.title.trim() !== '') {
    document.title = brandSuffix ? `${input.title.trim()} · MarcatursHub` : input.title.trim()
  }

  const indexable = input.indexable !== false

  if (indexable && input.description != null && input.description.trim() !== '') {
    ensureMeta(DESCRIPTION_SELECTOR, 'name', 'description').setAttribute(
      'content',
      input.description.trim(),
    )
  } else if (!indexable) {
    // Avoid leaving public-page descriptions (or private copy) on non-indexable routes.
    removeSelector(DESCRIPTION_SELECTOR)
  }

  setRobotsContent(indexable ? 'index, follow' : 'noindex, nofollow')

  const pathname =
    input.pathname ??
    (typeof window !== 'undefined' ? window.location.pathname : undefined)
  const search =
    input.search ?? (typeof window !== 'undefined' ? window.location.search : '')

  if (indexable && pathname) {
    const canonical = canonicalUrlForPath(pathname, search)
    if (canonical) {
      ensureLink('canonical').setAttribute('href', canonical)
      ensureMeta(OG_URL, 'property', 'og:url').setAttribute('content', canonical)
    }
    const titleForOg = document.title
    ensureMeta(OG_TITLE, 'property', 'og:title').setAttribute('content', titleForOg)
    ensureMeta(OG_TYPE, 'property', 'og:type').setAttribute('content', 'website')

    const descriptionEl = document.head.querySelector(DESCRIPTION_SELECTOR) as HTMLMetaElement | null
    if (descriptionEl?.content) {
      ensureMeta(OG_DESCRIPTION, 'property', 'og:description').setAttribute(
        'content',
        descriptionEl.content,
      )
    }

    const absoluteImage = toAbsolutePublicUrl(input.imageUrl ?? null)
    if (absoluteImage) {
      ensureMeta(OG_IMAGE, 'property', 'og:image').setAttribute('content', absoluteImage)
    } else {
      removeSelector(OG_IMAGE)
    }
  } else {
    // Private / non-indexable: no canonical and no social preview payload.
    removeSelector(CANONICAL_SELECTOR)
    removeSelector(OG_URL)
    removeSelector(OG_TITLE)
    removeSelector(OG_DESCRIPTION)
    removeSelector(OG_IMAGE)
  }
}

export function applyPrivateRouteDefaults(): void {
  applyDocumentHead({
    indexable: false,
    brandSuffix: false,
  })
  // Keep whatever title the page set; only force robots/canonical policy.
  setRobotsContent('noindex, nofollow')
  if (typeof document !== 'undefined') {
    removeSelector(CANONICAL_SELECTOR)
    clearSocialPreviewTags()
  }
}
