/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Absolute site URL without trailing slash, set in .env. */
  readonly VITE_SITE_URL?: string
}
