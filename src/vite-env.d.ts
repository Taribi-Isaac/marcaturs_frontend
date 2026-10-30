/// <reference types="vite/client" />

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.jpeg' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.webp' {
  const src: string
  export default src
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_PUBLIC_ORIGIN?: string
  /** GA4 measurement ID. Unset locally and until privacy approval. Not a secret. */
  readonly VITE_GA_MEASUREMENT_ID?: string
  readonly VITE_BACKEND_ORIGIN?: string
  /** Public Admin Control origin. Must match backend ADMIN_FRONTEND_URL. Not a secret. */
  readonly VITE_ADMIN_FRONTEND_URL?: string
  readonly VITE_REVERB_APP_KEY?: string
  readonly VITE_REVERB_HOST?: string
  readonly VITE_REVERB_PORT?: string
  readonly VITE_REVERB_SCHEME?: string
  readonly VITE_SOCIAL_FACEBOOK_URL?: string
  readonly VITE_SOCIAL_INSTAGRAM_URL?: string
  readonly VITE_SOCIAL_LINKEDIN_URL?: string
  readonly VITE_SOCIAL_TIKTOK_URL?: string
  readonly VITE_SOCIAL_X_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
