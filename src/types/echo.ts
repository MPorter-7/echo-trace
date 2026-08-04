export type IdentifierType = 'username' | 'email' | 'profile_url' | 'website' | 'display_name' | 'custom'
export type VerificationStatus = 'verified_account' | 'user_supplied' | 'unverified_historical'
export type DatePrecision = 'exact' | 'month' | 'year' | 'unknown'
export type ConfidenceLevel = 'high' | 'medium' | 'low'
export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'uncertain'

export interface Identifier {
  id: string
  user_id: string
  type: IdentifierType
  value: string
  label: string | null
  verification_status: VerificationStatus
  verification_method: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TimelineEvent {
  id: string
  user_id: string
  title: string
  description: string | null
  event_date: string | null
  end_date: string | null
  date_precision: DatePrecision
  approximate_year: number | null
  approximate_month: number | null
  platform: string | null
  username_used: string | null
  event_type: string
  source_url: string | null
  confidence: ConfidenceLevel
  tags: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PossibleMatch {
  id: string
  user_id: string
  identifier_id: string | null
  platform: string
  result_title: string
  source_url: string
  public_description: string | null
  discovered_at: string
  retrieved_at: string
  earliest_date: string | null
  latest_date: string | null
  confidence_score: number
  confidence_explanation: string
  matching_signals: string[]
  conflicting_signals: string[]
  status: MatchStatus
  user_notes: string | null
  created_at: string
  updated_at: string
}

export interface ArchiveFile {
  id: string
  user_id: string
  storage_path: string
  original_name: string
  mime_type: string
  size_bytes: number
  description: string | null
  created_at: string
}

export interface EmailImport {
  id: string
  user_id: string
  original_name: string
  size_bytes: number
  messages_scanned: number
  candidate_messages: number
  findings_count: number
  processed_locally: boolean
  created_at: string
}

export interface EmailFinding {
  id: string
  user_id: string
  import_id: string
  service_name: string
  sender_domain: string
  evidence_types: string[]
  evidence_counts: Record<string, number>
  first_seen: string | null
  last_seen: string | null
  message_count: number
  confidence_score: number
  confidence_explanation: string
  status: MatchStatus
  timeline_event_id: string | null
  created_at: string
  updated_at: string
}
