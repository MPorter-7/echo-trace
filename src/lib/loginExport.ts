import { isSuspiciousDomain, registrableDomain, serviceNameFromDomain } from './domain'

// Password-manager and browser "saved logins" exports (Chrome, Firefox, Edge, Safari,
// Bitwarden, 1Password, LastPass, Dashlane, ...) are CSVs that state outright which
// site you had an account with. This parser only ever reads the url/username/name/type
// columns it recognizes by header name; it never looks up, stores, logs, or returns a
// password/secret column, so a saved credential can never leave this module.

const MAX_FIELD_CHARS = 8 * 1024
const MAX_USERNAMES_KEPT = 8
const MAX_USERNAME_CHARS = 320

const URL_HEADER_ALIASES = new Set(['url', 'urls', 'login uri', 'origin url', 'website', 'web site', 'hostname', 'uri', 'site'])
const USERNAME_HEADER_ALIASES = new Set(['username', 'login username', 'user name', 'login', 'account', 'email'])
const TYPE_HEADER_ALIASES = new Set(['type'])
const SENSITIVE_HEADER_TOKEN = /password|pwd|secret|otp|totp|\bpin\b/

export interface LoginExportFindingDraft {
  serviceName: string
  domain: string
  usernames: string[]
  usernameCount: number
  rowCount: number
  confidenceScore: number
  confidenceExplanation: string
  recommended: boolean
}

export interface LoginExportAnalysis {
  rowsScanned: number
  candidateRows: number
  findings: LoginExportFindingDraft[]
  duplicatesMerged: number
}

interface HeaderIndex {
  url: number
  username: number
  type: number
}

interface MutableLoginFinding {
  domain: string
  usernames: Set<string>
  rowCount: number
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function buildHeaderIndex(headerRow: string[]): HeaderIndex {
  const index: HeaderIndex = { url: -1, username: -1, type: -1 }
  headerRow.forEach((rawHeader, position) => {
    const normalized = normalizeHeader(rawHeader)
    if (!normalized || SENSITIVE_HEADER_TOKEN.test(normalized)) return
    if (index.url === -1 && URL_HEADER_ALIASES.has(normalized)) index.url = position
    else if (index.username === -1 && USERNAME_HEADER_ALIASES.has(normalized)) index.username = position
    else if (index.type === -1 && TYPE_HEADER_ALIASES.has(normalized)) index.type = position
  })
  return index
}

function extractDomain(rawUrl: string) {
  const value = rawUrl.trim()
  if (!value || /^(?:android|ios|chrome|moz-proxy|data):/i.test(value)) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(withScheme)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    const host = url.hostname.toLowerCase()
    if (!host || host === 'localhost' || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return null
    return host
  } catch {
    return null
  }
}

function scoreFinding(finding: MutableLoginFinding) {
  const usernameCount = finding.usernames.size
  if (isSuspiciousDomain(finding.domain)) {
    return {
      score: 40,
      recommended: false,
      explanation: `A saved login for ${finding.domain} was found, but the domain pattern looks unusual, so this was not selected automatically.`,
    }
  }
  const score = Math.min(96, 90 + (usernameCount > 1 ? 4 : 0) + (finding.rowCount > usernameCount ? 2 : 0))
  const usernameNote = usernameCount > 1 ? ` with ${usernameCount} different saved usernames` : ''
  return {
    score,
    recommended: true,
    explanation: `A saved sign-in for ${finding.domain} was found in your export${usernameNote}. A saved credential is direct evidence you created this account; only the site and username were kept, and the saved password was never read into this summary.`,
  }
}

function mergeLoginFinding(target: MutableLoginFinding, source: MutableLoginFinding, domain: string) {
  target.domain = domain
  target.rowCount += source.rowCount
  for (const username of source.usernames) target.usernames.add(username)
}

export class LoginExportAnalyzer {
  private field = ''
  private row: string[] = []
  private inQuotes = false
  private pendingQuote = false
  private headerIndex: HeaderIndex | null = null
  private findings = new Map<string, MutableLoginFinding>()
  private rowsScanned = 0
  private candidateRows = 0

  addChunk(chunk: string) {
    let start = 0
    if (this.pendingQuote) {
      this.pendingQuote = false
      if (chunk[0] === '"') {
        if (this.field.length < MAX_FIELD_CHARS) this.field += '"'
        start = 1
      } else {
        this.inQuotes = false
      }
    }

    for (let position = start; position < chunk.length; position += 1) {
      const character = chunk[position]
      if (this.inQuotes) {
        if (character === '"') {
          if (position + 1 < chunk.length) {
            if (chunk[position + 1] === '"') {
              if (this.field.length < MAX_FIELD_CHARS) this.field += '"'
              position += 1
            } else {
              this.inQuotes = false
            }
          } else {
            this.pendingQuote = true
          }
        } else if (this.field.length < MAX_FIELD_CHARS) {
          this.field += character
        }
        continue
      }

      if (character === '"' && this.field === '') this.inQuotes = true
      else if (character === ',') { this.row.push(this.field); this.field = '' }
      else if (character === '\r') continue
      else if (character === '\n') { this.row.push(this.field); this.field = ''; this.commitRow() }
      else if (this.field.length < MAX_FIELD_CHARS) this.field += character
    }
  }

  private commitRow() {
    const row = this.row
    this.row = []
    if (row.length === 1 && row[0].trim() === '') return

    if (!this.headerIndex) {
      this.headerIndex = buildHeaderIndex(row)
      return
    }

    this.rowsScanned += 1
    this.processRow(row, this.headerIndex)
  }

  private processRow(row: string[], index: HeaderIndex) {
    const type = index.type >= 0 ? (row[index.type] ?? '').trim().toLowerCase() : ''
    if (type && type !== 'login') return

    const rawUrl = index.url >= 0 ? (row[index.url] ?? '').trim() : ''
    if (!rawUrl) return
    const domain = extractDomain(rawUrl)
    if (!domain) return

    const username = index.username >= 0 ? (row[index.username] ?? '').trim().slice(0, MAX_USERNAME_CHARS) : ''

    this.candidateRows += 1
    const finding = this.findings.get(domain) ?? { domain, usernames: new Set<string>(), rowCount: 0 }
    finding.rowCount += 1
    if (username) finding.usernames.add(username)
    this.findings.set(domain, finding)
  }

  finish(): LoginExportAnalysis {
    if (this.pendingQuote) {
      this.pendingQuote = false
      this.inQuotes = false
    }
    if (this.inQuotes || this.field !== '' || this.row.length > 0) {
      this.row.push(this.field)
      this.field = ''
      this.commitRow()
    }

    const findingsBeforeMerge = this.findings.size
    const merged = new Map<string, MutableLoginFinding>()
    for (const finding of this.findings.values()) {
      const domain = registrableDomain(finding.domain)
      const existing = merged.get(domain)
      if (existing) mergeLoginFinding(existing, finding, domain)
      else merged.set(domain, { domain, usernames: new Set(finding.usernames), rowCount: finding.rowCount })
    }

    const findings = [...merged.values()].map((finding): LoginExportFindingDraft => {
      const usernames = [...finding.usernames]
      const scored = scoreFinding(finding)
      return {
        serviceName: serviceNameFromDomain(finding.domain),
        domain: finding.domain,
        usernames: usernames.slice(0, MAX_USERNAMES_KEPT),
        usernameCount: usernames.length,
        rowCount: finding.rowCount,
        confidenceScore: scored.score,
        confidenceExplanation: scored.explanation,
        recommended: scored.recommended,
      }
    }).sort((a, b) => Number(b.recommended) - Number(a.recommended) || b.confidenceScore - a.confidenceScore || a.serviceName.localeCompare(b.serviceName))

    return {
      rowsScanned: this.rowsScanned,
      candidateRows: this.candidateRows,
      findings,
      duplicatesMerged: findingsBeforeMerge - merged.size,
    }
  }
}

export function validateLoginExportFile(file: Pick<File, 'name' | 'size'>) {
  if (file.size < 1) return { valid: false, error: 'Choose an exported CSV file that is not empty.' }
  if (!file.name.toLowerCase().endsWith('.csv')) return { valid: false, error: 'Export your saved logins as a .csv file, then choose it here.' }
  if (file.name.length > 180) return { valid: false, error: 'Use a CSV file name with 180 characters or fewer.' }
  return { valid: true, error: null }
}

export async function analyzeLoginExportFile(file: File, onProgress?: (progress: number) => void): Promise<LoginExportAnalysis> {
  const validation = validateLoginExportFile(file)
  if (!validation.valid) throw new Error(validation.error ?? 'Invalid saved-logins export.')

  const analyzer = new LoginExportAnalyzer()
  const reader = file.stream().getReader()
  const decoder = new TextDecoder()
  let bytesRead = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    bytesRead += value.byteLength
    analyzer.addChunk(decoder.decode(value, { stream: true }))
    onProgress?.(Math.min(99, Math.round((bytesRead / file.size) * 100)))
  }

  analyzer.addChunk(decoder.decode())
  onProgress?.(100)
  return analyzer.finish()
}
