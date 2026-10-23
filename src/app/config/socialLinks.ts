/**
 * Official MarcatursHub social destinations.
 *
 * Product-confirmed profiles are the defaults, so local development shows them
 * without extra environment variables. A build-time VITE_SOCIAL_* value may
 * override one profile when it is an absolute http(s) URL.
 */
export type SocialNetwork = {
  id: 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'x' | 'YouTube'
  label: string
  /** Absolute http(s) URL for the official profile. */
  href: string | null
}

const officialSocialUrls = {
  facebook: 'https://www.facebook.com/marcaturshub',
  instagram: 'https://www.instagram.com/marcaturshub',
  linkedin: 'https://www.linkedin.com/company/marcaturshub',
  tiktok: 'https://www.tiktok.com/@marcaturshub',
  x: 'https://x.com/MarcatursHub',
  YouTube: 'https://www.youtube.com/channel/UCfY4uW6OeOoZNMF1TOkaTBw',
} as const

function readSocialUrl(value: string | undefined, officialUrl: string): string {
  const trimmed = value?.trim()
  if (!trimmed) return officialUrl
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return officialUrl
    return url.toString()
  } catch {
    return officialUrl
  }
}

export const companySocialLinks: SocialNetwork[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    href: readSocialUrl(import.meta.env.VITE_SOCIAL_FACEBOOK_URL, officialSocialUrls.facebook),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    href: readSocialUrl(import.meta.env.VITE_SOCIAL_INSTAGRAM_URL, officialSocialUrls.instagram),
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    href: readSocialUrl(import.meta.env.VITE_SOCIAL_LINKEDIN_URL, officialSocialUrls.linkedin),
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    href: readSocialUrl(import.meta.env.VITE_SOCIAL_TIKTOK_URL, officialSocialUrls.tiktok),
  },
  {
    id: 'x',
    label: 'X',
    href: readSocialUrl(import.meta.env.VITE_SOCIAL_X_URL, officialSocialUrls.x),
  },
  {
    id: 'YouTube',
    label: 'YouTube',
    href: readSocialUrl(import.meta.env.VITE_SOCIAL_YOUTUBE_URL, officialSocialUrls.YouTube),
  },
]
