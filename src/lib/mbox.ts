export const EMAIL_EVIDENCE_KINDS = ['account_signup', 'email_verification', 'password_reset', 'receipt', 'account_notice'] as const
export const MAX_RECOMMENDED_FINDINGS = 50
export const AUTO_SELECT_CONFIDENCE_THRESHOLD = 80

export type EmailEvidenceKind = typeof EMAIL_EVIDENCE_KINDS[number]

export interface EmailHistoryFindingDraft {
  serviceName: string
  senderDomain: string
  evidenceTypes: EmailEvidenceKind[]
  evidenceCounts: Record<EmailEvidenceKind, number>
  firstSeen: string | null
  lastSeen: string | null
  messageCount: number
  confidenceScore: number
  confidenceExplanation: string
  recommended: boolean
  sampleSubjects: string[]
}

export interface EmailHistoryAnalysis {
  messagesScanned: number
  candidateMessages: number
  findings: EmailHistoryFindingDraft[]
  findingsBeforeCleanup: number
  duplicatesMerged: number
  findingsFiltered: number
}

export interface ParsedEmailMessage {
  from: string
  subject: string
  date: string
  bodySample: string
  listId?: string
  listUnsubscribe?: string
  precedence?: string
}

export function shouldAutoSelectFinding(finding: Pick<EmailHistoryFindingDraft, 'confidenceScore' | 'recommended'>) {
  return finding.recommended && finding.confidenceScore > AUTO_SELECT_CONFIDENCE_THRESHOLD
}

interface MutableFinding {
  serviceName: string
  senderDomain: string
  evidenceCounts: Record<EmailEvidenceKind, number>
  subjectEvidenceCounts: Record<EmailEvidenceKind, number>
  firstSeen: string | null
  lastSeen: string | null
  messageCount: number
  sampleSubjects: string[]
  spamMessageCount: number
  bulkMessageCount: number
}

const MAX_HEADER_CHARS = 32 * 1024
const MAX_BODY_SAMPLE_CHARS = 24 * 1024
const MAX_PENDING_LINE_CHARS = 256 * 1024

const COMPOUND_PUBLIC_SUFFIXES = new Set(['co.jp', 'co.nz', 'co.uk', 'com.au', 'com.br', 'com.mx'])

const CONSUMER_MAIL_DOMAINS = new Set(['aol.com', 'gmail.com', 'gmx.com', 'googlemail.com', 'hotmail.com', 'icloud.com', 'mail.com', 'outlook.com', 'proton.me', 'protonmail.com', 'yahoo.com'])

const DELIVERY_INFRASTRUCTURE_DOMAINS = new Set(['amazonses.com', 'campaign-archive.com', 'constantcontact.com', 'customer.io', 'mailchimpapp.net', 'mailgun.org', 'sendgrid.net', 'sparkpostmail.com'])

const CANONICAL_DOMAIN_ALIASES = new Map([
  ['facebookmail.com', 'facebook.com'],
  ['twitter.com', 'x.com'],
])

const SPAM_PATTERNS = [
  /\b(?:casino|jackpot|lottery|sweepstakes)\b/i,
  /\b(?:claim|collect|redeem)\b.{0,40}\b(?:cash|gift card|prize|reward|bonus)\b/i,
  /\b(?:winner|won)\b.{0,40}\b(?:cash|lottery|prize|reward|sweepstakes)\b/i,
  /\b(?:free money|guaranteed income|make money fast)\b/i,
  /\b(?:loan|debt)\b.{0,30}\b(?:approved|forgiven|relief offer)\b/i,
  /\b(?:activate|confirm|verify)\b.{0,35}\b(?:cash|e-?payments?|paydays?|payouts?|spins?|slots?)\b/i,
  /\b(?:cash|e-?payments?|paydays?|payouts?|spins?|slots?)\b.{0,35}\b(?:activate|approved|confirm|verify|welcome)\b/i,
  /\b(?:confirm|verify)\b.{0,30}\b(?:delivery|locate your card)\b/i,
]

const evidencePatterns: Record<EmailEvidenceKind, RegExp[]> = {
  account_signup: [
    /\bwelcome to\b/i,
    /\bthanks? for (?:joining|signing up|registering)\b/i,
    /\b(?:account|profile|registration|membership) (?:has been )?(?:created|opened|registered|complete|confirmed)\b/i,
    /\bgetting started with\b/i,
  ],
  email_verification: [
    /\b(?:verify|confirm|activate) (?:your )?(?:email(?: address)?|e-mail(?: address)?|account|registration)(?![-\w])/i,
    /\b(?:email|e-mail|account|registration) (?:verification|confirmation|activation)\b/i,
  ],
  password_reset: [
    /\b(?:reset|change) your password\b/i,
    /\b(?:your )?password (?:reset|change) (?:request(?:ed)?|instructions?|link|code|successful|complete|confirmation)\b/i,
    /\bpassword reset\s*[.!—:;-]*$/i,
    /\bforgot password (?:request|instructions?)\b/i,
    /\bforgot(?:ten)? your password\b/i,
    /\byour password (?:was|has been) changed\b/i,
  ],
  receipt: [
    /\b(?:receipt|invoice|order confirmation|payment confirmation|purchase confirmation|subscription confirmation)\b/i,
    /\b(?:thanks|thank you) for your (?:order|purchase|payment)\b/i,
  ],
  account_notice: [
    /\b(?:security alert|account alert|account notice|account notification)\b/i,
    /\b(?:new|unrecognized) (?:sign[- ]?in|login|device)\b/i,
    /\b(?:verification|security|one[- ]time) code\b/i,
    /\b(?:subscription|membership) (?:renewed|cancelled|canceled|expired)\b/i,
    /\b(?:two-factor|2-step|two-step) (?:authentication|verification)\b/i,
  ],
}

const evidenceLabels: Record<EmailEvidenceKind, string> = {
  account_signup: 'account signup',
  email_verification: 'email verification',
  password_reset: 'password reset',
  receipt: 'receipt or purchase',
  account_notice: 'account notice',
}

function emptyEvidenceCounts(): Record<EmailEvidenceKind, number> {
  return { account_signup: 0, email_verification: 0, password_reset: 0, receipt: 0, account_notice: 0 }
}

function decodeEncodedWord(charset: string, encoding: string, value: string) {
  try {
    const binary = encoding.toLowerCase() === 'b'
      ? atob(value.replace(/\s/g, ''))
      : value.replace(/_/g, ' ').replace(/=([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return new TextDecoder(charset).decode(bytes)
  } catch {
    return value
  }
}

export function decodeEmailHeader(value: string) {
  return value.replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (_, charset: string, encoding: string, encoded: string) => (
    decodeEncodedWord(charset, encoding, encoded)
  )).replace(/\s+/g, ' ').trim()
}

function parseHeaders(rawHeaders: string) {
  const unfolded = rawHeaders.replace(/\r?\n[\t ]+/g, ' ')
  const headers = new Map<string, string>()
  for (const line of unfolded.split(/\r?\n/)) {
    const separator = line.indexOf(':')
    if (separator <= 0) continue
    const name = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()
    if (!headers.has(name)) headers.set(name, decodeEmailHeader(value))
  }
  return headers
}

function extractSender(from: string) {
  const emailMatches = [...from.matchAll(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi)]
  const match = emailMatches.at(-1)
  if (!match) return null
  const domain = match[1].toLowerCase().replace(/^www\./, '')
  const displayName = decodeEmailHeader(from.slice(0, match.index).replace(/[<>"']/g, '').trim())
  return { domain, displayName }
}

function registrableDomain(domain: string) {
  const normalized = domain.toLowerCase().replace(/^www\./, '').replace(/\.+$/, '')
  const parts = normalized.split('.').filter(Boolean)
  if (parts.length <= 2) return CANONICAL_DOMAIN_ALIASES.get(normalized) ?? normalized
  const suffixLength = COMPOUND_PUBLIC_SUFFIXES.has(parts.slice(-2).join('.')) ? 2 : 1
  const root = parts.slice(-(suffixLength + 1)).join('.')
  return CANONICAL_DOMAIN_ALIASES.get(root) ?? root
}

function serviceNameFromDomain(domain: string) {
  const parts = domain.split('.').filter(Boolean)
  const compoundSuffix = parts.length >= 3 && COMPOUND_PUBLIC_SUFFIXES.has(parts.slice(-2).join('.'))
  const brand = parts.at(compoundSuffix ? -3 : -2) ?? parts[0] ?? domain
  if (brand.toLowerCase() === 'x') return 'X'
  return brand.split(/[-_]/).filter(Boolean).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ')
}

function isLikelySpamMessage(message: ParsedEmailMessage) {
  const searchable = `${message.subject}\n${message.bodySample.slice(0, 2_000)}`
  return SPAM_PATTERNS.some((pattern) => pattern.test(searchable))
}

function isBulkMessage(message: ParsedEmailMessage) {
  return Boolean(message.listId?.trim() || message.listUnsubscribe?.trim() || /\b(?:bulk|junk|list)\b/i.test(message.precedence ?? ''))
}

function isSuspiciousDomain(domain: string) {
  const brand = domain.split('.')[0] ?? ''
  const digits = [...brand].filter((character) => /\d/.test(character)).length
  return domain.includes('xn--') || brand.length > 38 || (brand.length >= 10 && digits / brand.length >= 0.4) || (brand.match(/-/g)?.length ?? 0) >= 4
}
function classifyText(value: string) {
  return EMAIL_EVIDENCE_KINDS.filter((kind) => evidencePatterns[kind].some((pattern) => pattern.test(value)))
}

function classifyMessage(message: ParsedEmailMessage) {
  if (/^(?:\s*(?:re|fw|fwd)\s*:)+/i.test(message.subject)) return { kinds: [] as EmailEvidenceKind[], subjectKinds: [] as EmailEvidenceKind[] }
  const subjectKinds = classifyText(message.subject)
  const bodyKinds = classifyText(message.bodySample.slice(0, MAX_BODY_SAMPLE_CHARS))
  return {
    kinds: EMAIL_EVIDENCE_KINDS.filter((kind) => subjectKinds.includes(kind) || bodyKinds.includes(kind)),
    subjectKinds,
  }
}

function dateOnly(value: string) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  const year = parsed.getUTCFullYear()
  if (year < 1970 || year > new Date().getUTCFullYear() + 1) return null
  return parsed.toISOString().slice(0, 10)
}

function isRecommendedFinding(finding: MutableFinding) {
  const subject = finding.subjectEvidenceCounts
  const directEvidenceCount = subject.account_signup + subject.email_verification + subject.password_reset + subject.account_notice
  const spamRatio = finding.messageCount ? finding.spamMessageCount / finding.messageCount : 0
  const bulkRatio = finding.messageCount ? finding.bulkMessageCount / finding.messageCount : 0
  if (finding.messageCount < 2 || directEvidenceCount < 2 || spamRatio >= 0.25 || bulkRatio >= 0.5) return false
  if (subject.password_reset >= 1) return true
  if (subject.account_notice >= 2) return true
  if (subject.account_notice >= 1 && subject.email_verification + subject.account_signup >= 1) return true
  if (subject.email_verification >= 2 && finding.messageCount >= 2) return true
  return subject.email_verification >= 1 && subject.account_signup >= 1 && finding.messageCount >= 2
}

function scoreFinding(finding: MutableFinding, recommended: boolean) {
  const kinds = EMAIL_EVIDENCE_KINDS.filter((kind) => finding.evidenceCounts[kind] > 0)
  const subject = finding.subjectEvidenceCounts
  const subjectKinds = EMAIL_EVIDENCE_KINDS.filter((kind) => subject[kind] > 0)
  let score = 35 + Math.min(18, Math.floor(Math.log2(finding.messageCount + 1)) * 6)
  if (subject.password_reset > 0) score += 24
  if (subject.account_notice > 0) score += 18
  if (subject.email_verification > 0) score += 16
  if (subject.account_signup > 0) score += 8
  if (subject.receipt > 0) score += 3
  if (subjectKinds.length > 1) score += 5
  if (finding.spamMessageCount > 0) score -= Math.min(35, finding.spamMessageCount * 12)
  if (finding.bulkMessageCount > 0) score -= Math.min(25, finding.bulkMessageCount * 5)
  score = recommended ? Math.max(80, Math.min(95, score)) : Math.max(0, Math.min(69, score))
  const labels = kinds.map((kind) => evidenceLabels[kind])
  const explanation = recommended
    ? `${finding.messageCount} message${finding.messageCount === 1 ? '' : 's'} from ${finding.senderDomain} contained corroborated ${labels.join(', ')} evidence. Related sender subdomains were combined and mailing-list or spam-like signals were excluded.`
    : `${finding.messageCount} message${finding.messageCount === 1 ? '' : 's'} from ${finding.senderDomain} contained possible ${labels.join(', ')} evidence, but not enough direct corroboration to select it automatically.`
  return { score, explanation }
}

function mergeFinding(target: MutableFinding, source: MutableFinding) {
  target.messageCount += source.messageCount
  target.spamMessageCount += source.spamMessageCount
  target.bulkMessageCount += source.bulkMessageCount
  for (const kind of EMAIL_EVIDENCE_KINDS) {
    target.evidenceCounts[kind] += source.evidenceCounts[kind]
    target.subjectEvidenceCounts[kind] += source.subjectEvidenceCounts[kind]
  }
  if (source.firstSeen && (!target.firstSeen || source.firstSeen < target.firstSeen)) target.firstSeen = source.firstSeen
  if (source.lastSeen && (!target.lastSeen || source.lastSeen > target.lastSeen)) target.lastSeen = source.lastSeen
  for (const subject of source.sampleSubjects) {
    if (target.sampleSubjects.length >= 3) break
    if (!target.sampleSubjects.includes(subject)) target.sampleSubjects.push(subject)
  }
}

function shouldKeepFinding(finding: MutableFinding) {
  if (CONSUMER_MAIL_DOMAINS.has(finding.senderDomain) || DELIVERY_INFRASTRUCTURE_DOMAINS.has(finding.senderDomain)) return false
  const strongEvidenceCount = finding.evidenceCounts.account_signup + finding.evidenceCounts.email_verification + finding.evidenceCounts.password_reset
  const directStrongEvidenceCount = finding.subjectEvidenceCounts.account_signup + finding.subjectEvidenceCounts.email_verification + finding.subjectEvidenceCounts.password_reset + finding.subjectEvidenceCounts.account_notice
  const spamRatio = finding.messageCount ? finding.spamMessageCount / finding.messageCount : 0
  const bulkRatio = finding.messageCount ? finding.bulkMessageCount / finding.messageCount : 0
  if (spamRatio >= 0.5) return false
  if (bulkRatio >= 0.5 && finding.subjectEvidenceCounts.password_reset + finding.subjectEvidenceCounts.account_notice === 0) return false
  if (isSuspiciousDomain(finding.senderDomain) && directStrongEvidenceCount === 0) return false
  if (directStrongEvidenceCount > 0) return true
  if (strongEvidenceCount > 0) return true
  if (finding.evidenceCounts.account_notice >= 2 && finding.messageCount >= 2) return true
  return finding.evidenceCounts.receipt >= 2 && finding.messageCount >= 2
}

export function formatEmailEvidenceKind(kind: EmailEvidenceKind) {
  return evidenceLabels[kind]
}

export class MboxAnalyzer {
  private currentHeaders = ''
  private currentBody = ''
  private inHeaders = true
  private started = false
  private findings = new Map<string, MutableFinding>()
  private messagesScanned = 0
  private candidateMessages = 0

  addLine(line: string) {
    if (line.startsWith('From ')) {
      if (this.started) this.finishMessage()
      this.started = true
      this.inHeaders = true
      this.currentHeaders = ''
      this.currentBody = ''
      return
    }

    if (!this.started) this.started = true
    if (this.inHeaders) {
      if (line === '') {
        this.inHeaders = false
      } else if (this.currentHeaders.length < MAX_HEADER_CHARS) {
        this.currentHeaders += `${line.slice(0, MAX_HEADER_CHARS - this.currentHeaders.length)}\n`
      }
    } else if (this.currentBody.length < MAX_BODY_SAMPLE_CHARS) {
      this.currentBody += `${line.slice(0, MAX_BODY_SAMPLE_CHARS - this.currentBody.length)}\n`
    }
  }

  addMessage(message: ParsedEmailMessage) {
    this.messagesScanned += 1
    const { kinds, subjectKinds } = classifyMessage(message)
    const sender = extractSender(message.from)
    if (!kinds.length || !sender) return

    this.candidateMessages += 1
    const seen = dateOnly(message.date)
    const finding = this.findings.get(sender.domain) ?? {
      serviceName: serviceNameFromDomain(sender.domain),
      senderDomain: sender.domain,
      evidenceCounts: emptyEvidenceCounts(),
      subjectEvidenceCounts: emptyEvidenceCounts(),
      firstSeen: null,
      lastSeen: null,
      messageCount: 0,
      sampleSubjects: [],
      spamMessageCount: 0,
      bulkMessageCount: 0,
    }
    finding.messageCount += 1
    if (isLikelySpamMessage(message)) finding.spamMessageCount += 1
    if (isBulkMessage(message)) finding.bulkMessageCount += 1
    for (const kind of kinds) finding.evidenceCounts[kind] += 1
    for (const kind of subjectKinds) finding.subjectEvidenceCounts[kind] += 1
    if (seen && (!finding.firstSeen || seen < finding.firstSeen)) finding.firstSeen = seen
    if (seen && (!finding.lastSeen || seen > finding.lastSeen)) finding.lastSeen = seen
    const subject = message.subject.slice(0, 160).trim()
    if (subject && finding.sampleSubjects.length < 3 && !finding.sampleSubjects.includes(subject)) finding.sampleSubjects.push(subject)
    this.findings.set(sender.domain, finding)
  }

  finish() {
    if (this.started) this.finishMessage()
    const findingsBeforeCleanup = this.findings.size
    const mergedFindings = new Map<string, MutableFinding>()
    for (const finding of this.findings.values()) {
      const senderDomain = registrableDomain(finding.senderDomain)
      const existing = mergedFindings.get(senderDomain)
      if (existing) mergeFinding(existing, finding)
      else mergedFindings.set(senderDomain, {
        ...finding,
        serviceName: serviceNameFromDomain(senderDomain),
        senderDomain,
        evidenceCounts: { ...finding.evidenceCounts },
        subjectEvidenceCounts: { ...finding.subjectEvidenceCounts },
        sampleSubjects: [...finding.sampleSubjects],
      })
    }
    const keptFindings = [...mergedFindings.values()].filter(shouldKeepFinding)
    const scoredFindings = keptFindings.map((finding): EmailHistoryFindingDraft => {
      const recommended = isRecommendedFinding(finding)
      const scored = scoreFinding(finding, recommended)
      return {
        serviceName: finding.serviceName,
        senderDomain: finding.senderDomain,
        evidenceTypes: EMAIL_EVIDENCE_KINDS.filter((kind) => finding.evidenceCounts[kind] > 0),
        evidenceCounts: finding.evidenceCounts,
        firstSeen: finding.firstSeen,
        lastSeen: finding.lastSeen,
        messageCount: finding.messageCount,
        confidenceScore: scored.score,
        confidenceExplanation: scored.explanation,
        recommended,
        sampleSubjects: finding.sampleSubjects,
      }
    }).sort((a, b) => Number(b.recommended) - Number(a.recommended) || b.confidenceScore - a.confidenceScore || b.messageCount - a.messageCount || a.serviceName.localeCompare(b.serviceName))
    let recommendationsKept = 0
    const findings = scoredFindings.map((finding) => {
      if (!finding.recommended) return finding
      recommendationsKept += 1
      if (recommendationsKept <= MAX_RECOMMENDED_FINDINGS) return finding
      return {
        ...finding,
        recommended: false,
        confidenceScore: 69,
        confidenceExplanation: `${finding.messageCount} messages from ${finding.senderDomain} contained account evidence, but this result was held back to keep automatic selection focused on the strongest ${MAX_RECOMMENDED_FINDINGS} accounts.`,
      }
    })
    return {
      messagesScanned: this.messagesScanned,
      candidateMessages: this.candidateMessages,
      findings,
      findingsBeforeCleanup,
      duplicatesMerged: findingsBeforeCleanup - mergedFindings.size,
      findingsFiltered: mergedFindings.size - keptFindings.length,
    }
  }

  private finishMessage() {
    const headers = parseHeaders(this.currentHeaders)
    const message: ParsedEmailMessage = {
      from: headers.get('from') ?? '',
      subject: headers.get('subject') ?? '',
      date: headers.get('date') ?? '',
      bodySample: this.currentBody,
      listId: headers.get('list-id') ?? '',
      listUnsubscribe: headers.get('list-unsubscribe') ?? '',
      precedence: headers.get('precedence') ?? '',
    }
    this.addMessage(message)
  }
}

export function validateMboxFile(file: Pick<File, 'name' | 'size'>) {
  if (file.size < 1) return { valid: false, error: 'Choose a Google Takeout .mbox file that is not empty.' }
  if (!file.name.toLowerCase().endsWith('.mbox')) return { valid: false, error: 'Extract the Google Takeout archive, then choose a file ending in .mbox.' }
  if (file.name.length > 180) return { valid: false, error: 'Use an .mbox file name with 180 characters or fewer.' }
  return { valid: true, error: null }
}

export async function analyzeMboxFile(file: File, onProgress?: (progress: number) => void): Promise<EmailHistoryAnalysis> {
  const validation = validateMboxFile(file)
  if (!validation.valid) throw new Error(validation.error ?? 'Invalid mailbox file.')

  const analyzer = new MboxAnalyzer()
  const reader = file.stream().getReader()
  const decoder = new TextDecoder()
  let pending = ''
  let bytesRead = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    bytesRead += value.byteLength
    pending += decoder.decode(value, { stream: true })
    const lines = pending.split('\n')
    pending = lines.pop() ?? ''
    for (const line of lines) analyzer.addLine(line.endsWith('\r') ? line.slice(0, -1) : line)
    if (pending.length > MAX_PENDING_LINE_CHARS) {
      analyzer.addLine(pending.slice(0, MAX_PENDING_LINE_CHARS))
      pending = ''
    }
    onProgress?.(Math.min(99, Math.round((bytesRead / file.size) * 100)))
  }

  pending += decoder.decode()
  if (pending) analyzer.addLine(pending.endsWith('\r') ? pending.slice(0, -1) : pending)
  onProgress?.(100)
  return analyzer.finish()
}
