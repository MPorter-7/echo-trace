import { MboxAnalyzer, type EmailHistoryAnalysis, type ParsedEmailMessage } from './mbox'

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me/messages'
const GMAIL_QUERY = 'subject:(welcome OR verify OR verification OR confirm OR "password reset" OR receipt OR invoice OR "security alert" OR "new sign-in" OR "sign in" OR "two-factor" OR "two-step")'
const METADATA_HEADERS = ['From', 'Subject', 'Date', 'List-Id', 'List-Unsubscribe', 'Precedence']
const PAGE_SIZE = '100'

// The client ID is public by design (OAuth implicit/token flow) — it only
// identifies which app is asking, it is not a secret. Nothing here is
// configured unless a repo owner creates their own Google Cloud OAuth
// client and sets VITE_GOOGLE_CLIENT_ID; see SETUP.md.
export function getGoogleClientId() {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
}

export function isLiveGmailConfigured() {
  return Boolean(getGoogleClientId())
}

interface GoogleTokenClient {
  requestAccessToken: () => void
}

interface GoogleTokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: GoogleTokenResponse) => void
          }) => GoogleTokenClient
        }
      }
    }
  }
}

let googleScriptPromise: Promise<void> | null = null

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (googleScriptPromise) return googleScriptPromise
  googleScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => { googleScriptPromise = null; reject(new Error('Google sign-in could not be loaded. Check your connection and try again.')) }
    document.head.appendChild(script)
  })
  return googleScriptPromise
}

// Returns a short-lived access token held only in this function's return
// value — the caller is responsible for keeping it out of component state,
// storage, and any network call other than gmail.googleapis.com.
export async function requestGmailAccessToken(clientId: string): Promise<string> {
  await loadGoogleIdentityScript()
  if (!window.google?.accounts?.oauth2) throw new Error('Google sign-in is unavailable right now.')
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GMAIL_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error === 'access_denied' ? 'Gmail access was not granted.' : (response.error_description ?? 'Gmail access was not granted.')))
          return
        }
        resolve(response.access_token)
      },
    })
    client.requestAccessToken()
  })
}

async function gmailFetch(url: URL, accessToken: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (response.ok) return response.json()
  if (response.status === 401) throw new Error('Your Gmail session expired. Reconnect and try again.')
  if (response.status === 403) throw new Error('Gmail access was not granted, or this app is still in Google’s testing mode and your account has not been added as a tester yet.')
  if (response.status === 429) throw new Error('Gmail’s rate limit was reached. Wait a moment and try again.')
  throw new Error('Gmail could not be reached right now.')
}

async function fetchMessageMetadata(id: string, accessToken: string): Promise<ParsedEmailMessage | null> {
  const url = new URL(`${GMAIL_API_BASE}/${id}`)
  url.searchParams.set('format', 'metadata')
  for (const header of METADATA_HEADERS) url.searchParams.append('metadataHeaders', header)
  const data = await gmailFetch(url, accessToken) as { snippet?: string; payload?: { headers?: { name: string; value: string }[] } }
  const headers = new Map<string, string>()
  for (const header of data.payload?.headers ?? []) headers.set(header.name.toLowerCase(), header.value)
  if (!headers.has('from')) return null
  return {
    from: headers.get('from') ?? '',
    subject: headers.get('subject') ?? '',
    date: headers.get('date') ?? '',
    bodySample: data.snippet ?? '',
    listId: headers.get('list-id') ?? '',
    listUnsubscribe: headers.get('list-unsubscribe') ?? '',
    precedence: headers.get('precedence') ?? '',
  }
}

// Scans Gmail directly from the browser using the token's short-lived
// access — only message metadata (headers + the short snippet Gmail
// already returns with metadata) is requested, never the full body.
// Every request goes straight to gmail.googleapis.com; nothing is
// proxied through or stored on EchoTrace's own backend.
export async function analyzeGmailLive(accessToken: string, onProgress?: (scanned: number, estimatedTotal: number) => void): Promise<EmailHistoryAnalysis> {
  const analyzer = new MboxAnalyzer()
  let pageToken: string | undefined
  let scanned = 0
  let estimatedTotal = 0

  do {
    const listUrl = new URL(GMAIL_API_BASE)
    listUrl.searchParams.set('q', GMAIL_QUERY)
    listUrl.searchParams.set('maxResults', PAGE_SIZE)
    if (pageToken) listUrl.searchParams.set('pageToken', pageToken)
    const listResponse = await gmailFetch(listUrl, accessToken) as { messages?: { id: string }[]; resultSizeEstimate?: number; nextPageToken?: string }
    estimatedTotal = Math.max(estimatedTotal, listResponse.resultSizeEstimate ?? 0)

    for (const { id } of listResponse.messages ?? []) {
      const message = await fetchMessageMetadata(id, accessToken)
      if (message) analyzer.addMessage(message)
      scanned += 1
      onProgress?.(scanned, Math.max(estimatedTotal, scanned))
    }
    pageToken = listResponse.nextPageToken
  } while (pageToken)

  return analyzer.finish()
}
