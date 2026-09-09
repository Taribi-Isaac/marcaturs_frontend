export type BusinessProfile = {
  id: number
  legal_name: string
  trading_name: string | null
  description: string | null
  category: string | null
  address: string | null
  operating_location: string | null
  contact_email: string | null
  contact_phone: string | null
  website: string | null
  social_links: Record<string, string> | unknown[] | Record<string, never>
  created_at: string | null
  updated_at: string | null
}

export type AmbassadorProfile = {
  id: number
  display_name: string
  profile_description: string | null
  location: string | null
  skills: string[]
  marketing_interests: string[]
  experience: string | null
  created_at: string | null
  updated_at: string | null
}

export type BusinessProfileInput = {
  legal_name: string
  trading_name?: string | null
  description?: string | null
  category?: string | null
  address?: string | null
  operating_location?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  website?: string | null
  social_links?: Record<string, string> | null
}

export type AmbassadorProfileInput = {
  display_name: string
  profile_description?: string | null
  location?: string | null
  skills?: string[] | null
  marketing_interests?: string[] | null
  experience?: string | null
}

export type ChangePasswordInput = {
  current_password: string
  password: string
  password_confirmation: string
}

export type ChangePasswordResult = {
  message: string
}
