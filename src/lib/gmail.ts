import { MboxAnalyzer, type EmailHistoryAnalysis, type ParsedEmailMessage } from './mbox'

export const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
export const GMAIL_QUICK_SCAN_LIMIT = 5000

const GMAIL_API_ROOT = 'https://gmail.googleapis.com/gmail/v1/users/me'
const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client'
export const GMAIL_EVIDENCE_QUERY = '-in:spam -in:trash -in:sent -in:drafts -category:promotions {subject:"verify your email" subject:"verify your e-mail" subject:"confirm your email" subject:"confirm your registration" subject:"activate your account" subject:"account created" subject:"registration complete" subject:"password reset" subject:"reset your password" subject:"password changed" subject:"security alert" subject:"account notice" subject:"new sign-in" subject:"new login" subject:"verification code" subject:"one-time code"}'
const BODY_SAMPLE_LIMIT = 24 * 1024
const FETCH_CONCURRENCY = 8

interface GoogleTokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}

interface GoogleTokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void
}

interface GoogleOauthApi {
  initTokenClient: (config: {
    client_id: string
    scope: string
    callback: (response: GoogleTokenResponse) => void
    error_callback?: (error: { type?: string }) => void
  }) => GoogleTokenClient
  revoke: (accessToken: string, callback?: () => void) => void
}

interface GmailHeader {
  name?: string
  value?: string
}

interface GmailPart {
  mimeType?: string
  body?: { data?: string }
  parts?: GmailPart[]
  headers?: GmailHeader[]
}

interface GmailMessage {
  id?: string
  snippet?: string
  payload?: GmailPart
}

interface GmailMessageList {
  messages?: Array<{ id?: string }>
  nextPageToken?: string
}

export interface GmailScanProgress {
  percent: number
  label: string
}

export interface GmailScanResult {
  analysis: EmailHistoryAnalysis
  reachedLimit: boolean
}

function getGoogleOauth() {
  const googleWindow = window as Window & { google?: { accounts?: { oauth2?: GoogleOauthApi } } }
  return googleWindow.google?.accounts?.oauth2 ?? null
}

export async function loadGoogleIdentityServices() {
  const existing = getGoogleOauth()
  if (existing) return existing

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Google sign-in could not be loaded.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = GOOGLE_IDENTITY_SCRIPT
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google sign-in could not be loaded.'))
    document.head.append(script)
  })

  const loaded = getGoogleOauth()
  if (!loaded) throw new Error('Google sign-in did not finish loading. Refresh and try again.')
  return loaded
}

async function requestGmailToken(oauth: GoogleOauthApi, clientId: string) {
  return new Promise<string>((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: clientId,
      scope: GMAIL_READONLY_SCOPE,
      callback: (response) => {
        if (response.access_token) resolve(response.access_token)
        else reject(new Error(response.error_description ?? 'Gmail access was not approved.'))
      },
      error_callback: () => reject(new Error('The Google permission window was closed or blocked.')),
    })
    client.requestAccessToken({ prompt: 'consent' })
  })
}

async function gmailFetch<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${GMAIL_API_ROOT}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { error?: { message?: string } } | null
    if (response.status === 401) throw new Error('Gmail permission expired. Click Scan Gmail and approve access again.')
    if (response.status === 403) throw new Error('Gmail access is not available for this Google account or app configuration.')
    throw new Error(detail?.error?.message ?? 'Gmail could not be read right now.')
  }
  return response.json() as Promise<T>
}

function decodeBase64Url(value: string) {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return ''
  }
}

function plainTextFromPart(part: GmailPart): string {
  const children = part.parts ?? []
  const childText = children.map(plainTextFromPart).filter(Boolean).join('\n')
  const ownText = part.body?.data ? decodeBase64Url(part.body.data) : ''
  if (part.mimeType === 'text/plain') return `${ownText}\n${childText}`.trim()
  if (part.mimeType === 'text/html' && !childText) {
    return ownText.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  return childText || ownText
}

export function parseGmailMessage(message: GmailMessage): ParsedEmailMessage {
  const headers = new Map((message.payload?.headers ?? []).map((header) => [header.name?.toLowerCase() ?? '', header.value ?? '']))
  return {
    from: headers.get('from') ?? '',
    subject: headers.get('subject') ?? '',
    date: headers.get('date') ?? '',
    bodySample: (message.snippet ?? plainTextFromPart(message.payload ?? {})).slice(0, BODY_SAMPLE_LIMIT),
    listId: headers.get('list-id') ?? '',
    listUnsubscribe: headers.get('list-unsubscribe') ?? '',
    precedence: headers.get('precedence') ?? '',
  }
}

async function listCandidateIds(accessToken: string, onProgress?: (progress: GmailScanProgress) => void) {
  const ids: string[] = []
  let pageToken = ''

  do {
    const search = new URLSearchParams({ q: GMAIL_EVIDENCE_QUERY, maxResults: '500' })
    if (pageToken) search.set('pageToken', pageToken)
    const page = await gmailFetch<GmailMessageList>(`/messages?${search}`, accessToken)
    for (const message of page.messages ?? []) {
      if (message.id) ids.push(message.id)
      if (ids.length >= GMAIL_QUICK_SCAN_LIMIT) break
    }
    pageToken = ids.length < GMAIL_QUICK_SCAN_LIMIT ? page.nextPageToken ?? '' : ''
    onProgress?.({ percent: Math.min(15, 4 + Math.ceil(ids.length / 500)), label: 'Finding likely account emails' })
  } while (pageToken)

  return { ids, reachedLimit: ids.length >= GMAIL_QUICK_SCAN_LIMIT }
}

async function analyzeCandidateMessages(ids: string[], accessToken: string, onProgress?: (progress: GmailScanProgress) => void) {
  const analyzer = new MboxAnalyzer()
  let completed = 0

  for (let index = 0; index < ids.length; index += FETCH_CONCURRENCY) {
    const batch = ids.slice(index, index + FETCH_CONCURRENCY)
    const messages = await Promise.allSettled(batch.map((id) => gmailFetch<GmailMessage>(
      `/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=List-Id&metadataHeaders=List-Unsubscribe&metadataHeaders=Precedence`,
      accessToken,
    )))
    const successful = messages.filter((result): result is PromiseFulfilledResult<GmailMessage> => result.status === 'fulfilled')
    if (batch.length > 0 && successful.length === 0) {
      const failure = messages.find((result): result is PromiseRejectedResult => result.status === 'rejected')
      throw failure?.reason instanceof Error ? failure.reason : new Error('Gmail messages could not be checked.')
    }
    for (const result of messages) {
      if (result.status === 'fulfilled') analyzer.addMessage(parseGmailMessage(result.value))
      completed += 1
    }
    const percent = ids.length ? 15 + Math.round((completed / ids.length) * 85) : 100
    onProgress?.({ percent: Math.min(100, percent), label: 'Checking account evidence' })
  }

  return analyzer.finish()
}

export async function scanGmailOnce(clientId: string, onProgress?: (progress: GmailScanProgress) => void): Promise<GmailScanResult> {
  if (!clientId.trim()) throw new Error('Quick Gmail Scan is not configured yet.')
  const oauth = await loadGoogleIdentityServices()
  const accessToken = await requestGmailToken(oauth, clientId.trim())

  try {
    onProgress?.({ percent: 2, label: 'Connected securely' })
    const { ids, reachedLimit } = await listCandidateIds(accessToken, onProgress)
    const analysis = await analyzeCandidateMessages(ids, accessToken, onProgress)
    return {
      analysis,
      reachedLimit,
    }
  } finally {
    try {
      oauth.revoke(accessToken)
    } catch {
      // The short-lived token still expires; a revoke transport error must not discard scan results.
    }
  }
}
