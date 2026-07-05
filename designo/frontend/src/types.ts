export interface Photo {
  id: string
  project_id: string
  filename: string
  original_name: string
  tag: string
  caption: string
  width: number | null
  height: number | null
  size_bytes: number
  edit_status: 'editing' | 'done' | 'error' | null
  edit_error: string | null
  original_filename: string | null
  created_at: number
}

export interface Video {
  id: string
  project_id: string
  filename: string
  model: string
  prompt: string
  status: 'pending' | 'generating' | 'ready' | 'error'
  error: string | null
  created_at: number
}

export interface Brief {
  business_name: string
  tagline: string
  industry: string
  audience: string
  tone: string
  mood: string
  brand_colors: string
  sections: string[]
  key_points: string
  services: string
  contact_email: string
  contact_phone: string
  address: string
  socials: string
  style_references: string
  motion_intensity: 'subtle' | 'balanced' | 'cinematic'
  extra_notes: string
}

export interface Project {
  id: string
  name: string
  status: 'draft' | 'generating' | 'ready' | 'error'
  brief: Partial<Brief>
  phase: string | null
  error: string | null
  site_generated_at: number | null
  created_at: number
  updated_at: number
  photos: Photo[]
  videos: Video[]
  has_site: boolean
  has_shadow: boolean
}

export interface AppConfig {
  video_enabled: boolean
  retouch_enabled: boolean
  apify_enabled: boolean
  companies_house_enabled: boolean
  outreach_enabled: boolean
  payments_enabled: boolean
  price_build: string
  price_monthly: string
  public_url: string
  video_models: { draft: string; final: string }
  llm_model: string
  photo_tags: string[]
  max_photo_bytes: number
}

export interface MailMessage {
  id: string
  lead_id: string | null
  direction: 'in' | 'out'
  counterpart: string
  subject: string
  body_text: string
  body_html: string
  message_id: string | null
  in_reply_to: string | null
  read: number
  created_at: number
}

export interface MailThread extends MailMessage {
  unread: number
  business_name: string | null
  lead_status: string | null
}

export interface MailboxStatus {
  imap_configured: boolean
  imap_host: string
  imap_user: string
  send_enabled: boolean
  last_poll: number | null
  last_error: string | null
  unread: number
}

export interface MailboxSettings {
  imap_host: string
  imap_port: string
  imap_user: string
  imap_password_set: boolean
}

export type LeadStatus =
  | 'new' | 'researching' | 'generating' | 'drafting' | 'review'
  | 'sending' | 'sent' | 'opened' | 'logged_in'
  | 'won' | 'lost' | 'skipped' | 'error'

export const LEAD_TRANSIENT: LeadStatus[] = ['researching', 'generating', 'drafting', 'sending']

export interface ProspectAccess {
  lead_id: string
  slug: string
  username: string
  password: string
  created_at: number
}

export interface OutreachEmail {
  id: string
  lead_id: string
  subject: string
  body_html: string
  body_text: string
  status: 'draft' | 'sending' | 'sent' | 'error'
  resend_id: string | null
  error: string | null
  created_at: number
  sent_at: number | null
}

export interface LeadEvent {
  id: number
  lead_id: string
  kind: string
  data: Record<string, unknown>
  created_at: number
}

export interface Lead {
  id: string
  source: string
  business_name: string
  category: string
  description: string
  address: string
  postcode: string
  town: string
  phone: string
  email: string
  website: string
  socials: Record<string, unknown>
  raw: Record<string, unknown>
  rating: number | null
  reviews_count: number | null
  status: LeadStatus
  status_detail: string | null
  project_id: string | null
  created_at: number
  updated_at: number
  access: ProspectAccess | null
  outreach_email: OutreachEmail | null
  has_site: boolean
  events?: LeadEvent[]
  project?: Project | null
  preview_media?: { hero: boolean; gif: boolean }
}

export interface DiscoveryJob {
  id: string
  kind: string
  label: string
  status: 'running' | 'done' | 'error'
  found: number
  imported: number
  skipped: number
  error: string | null
  started_at: number
}

export const EMPTY_BRIEF: Brief = {
  business_name: '',
  tagline: '',
  industry: '',
  audience: '',
  tone: '',
  mood: '',
  brand_colors: '',
  sections: ['hero', 'about', 'services', 'gallery', 'contact'],
  key_points: '',
  services: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  socials: '',
  style_references: '',
  motion_intensity: 'balanced',
  extra_notes: '',
}
