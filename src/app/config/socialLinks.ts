/**
 * Official MarcatursHub social destinations.
 *
 * URLs are optional build-time public env values. Empty / unset means the
 * destination has not been Product-confirmed — do not invent company URLs.
 */
export type SocialNetwork = {
  id: 'facebook' | 'instagram' | 'linkedin'
  label: string
  /** Absolute https URL when Product has confirmed the official profile. */
  href: string | null
}

function readOptionalUrl(value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString()
  } catch {
    return null
  }
}

export const companySocialLinks: SocialNetwork[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    href: readOptionalUrl(import.meta.env.VITE_SOCIAL_FACEBOOK_URL),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    href: readOptionalUrl(import.meta.env.VITE_SOCIAL_INSTAGRAM_URL),
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    href: readOptionalUrl(import.meta.env.VITE_SOCIAL_LINKEDIN_URL),
  },
]
