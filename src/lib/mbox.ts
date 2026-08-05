export const EMAIL_EVIDENCE_KINDS = ['account_signup', 'email_verification', 'password_reset', 'receipt', 'account_notice'] as const

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
  sampleSubjects: string[]
}

export interface EmailHistoryAnalysis {
  messagesScanned: number
  candidateMessages: number
  findings: EmailHistoryFindingDraft[]
}

export interface ParsedEmailMessage {
  from: string
  subject: string
  date: string
  bodySample: string
}

interface MutableFinding {
  serviceName: string
  senderDomain: string
  evidenceCounts: Record<EmailEvidenceKind, number>
  firstSeen: string | null
  lastSeen: string | null
  messageCount: number
  sampleSubjects: string[]
}

const MAX_HEADER_CHARS = 32 * 1024
const MAX_BODY_SAMPLE_CHARS = 24 * 1024
const MAX_PENDING_LINE_CHARS = 256 * 1024

const evidencePatterns: Record<EmailEvidenceKind, RegExp[]> = {
  account_signup: [
    /\bwelcome to\b/i,
    /\bthanks? for (?:joining|signing up|registering)\b/i,
    /\b(?:account|profile|registration|membership) (?:has been )?(?:created|opened|registered|complete|confirmed)\b/i,
    /\bgetting started with\b/i,
  ],
  email_verification: [
    /\b(?:verify|confirm|activate) (?:your )?(?:email|e-mail|email address|account|registration)\b/i,
    /\b(?:email|e-mail|account|registration) (?:verification|confirmation|activation)\b/i,
  ],
  password_reset: [
    /\b(?:password reset|reset your password|forgot(?:ten)? your password|change your password)\b/i,
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

function serviceNameFromDomain(domain: string) {
  const parts = domain.split('.').filter(Boolean)
  const compoundSuffix = parts.length >= 3 && ['co.uk', 'com.au', 'co.nz', 'co.jp', 'com.br'].includes(parts.slice(-2).join('.'))
  const brand = parts.at(compoundSuffix ? -3 : -2) ?? parts[0] ?? domain
  return brand.split(/[-_]/).filter(Boolean).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ')
}

function chooseServiceName(displayName: string, domain: string) {
  const cleaned = displayName
    .replace(/\b(?:no[- ]?reply|do not reply|notifications?|support|accounts?|security|billing|receipts?|team)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}&.+ -]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned && cleaned.length >= 2 && cleaned.length <= 80 ? cleaned : serviceNameFromDomain(domain)
}

function classifyMessage(message: ParsedEmailMessage) {
  const searchable = `${message.subject}\n${message.bodySample.slice(0, MAX_BODY_SAMPLE_CHARS)}`
  return EMAIL_EVIDENCE_KINDS.filter((kind) => evidencePatterns[kind].some((pattern) => pattern.test(searchable)))
}

function dateOnly(value: string) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  const year = parsed.getUTCFullYear()
  if (year < 1970 || year > new Date().getUTCFullYear() + 1) return null
  return parsed.toISOString().slice(0, 10)
}

function scoreFinding(finding: MutableFinding) {
  const kinds = EMAIL_EVIDENCE_KINDS.filter((kind) => finding.evidenceCounts[kind] > 0)
  let score = 40 + Math.min(20, finding.messageCount * 4)
  if (finding.evidenceCounts.account_signup > 0) score += 15
  if (finding.evidenceCounts.email_verification > 0) score += 10
  if (kinds.length > 1) score += 5
  score = Math.min(90, score)
  const labels = kinds.map((kind) => evidenceLabels[kind])
  const explanation = `${finding.messageCount} message${finding.messageCount === 1 ? '' : 's'} from ${finding.senderDomain} contained ${labels.join(', ')} evidence. This suggests a service relationship, but forwarded mail and shared inboxes are possible, so you must review it.`
  return { score, explanation }
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
    const kinds = classifyMessage(message)
    const sender = extractSender(message.from)
    if (!kinds.length || !sender) return

    this.candidateMessages += 1
    const seen = dateOnly(message.date)
    const finding = this.findings.get(sender.domain) ?? {
      serviceName: chooseServiceName(sender.displayName, sender.domain),
      senderDomain: sender.domain,
      evidenceCounts: emptyEvidenceCounts(),
      firstSeen: null,
      lastSeen: null,
      messageCount: 0,
      sampleSubjects: [],
    }
    finding.messageCount += 1
    for (const kind of kinds) finding.evidenceCounts[kind] += 1
    if (seen && (!finding.firstSeen || seen < finding.firstSeen)) finding.firstSeen = seen
    if (seen && (!finding.lastSeen || seen > finding.lastSeen)) finding.lastSeen = seen
    const subject = message.subject.slice(0, 160).trim()
    if (subject && finding.sampleSubjects.length < 3 && !finding.sampleSubjects.includes(subject)) finding.sampleSubjects.push(subject)
    this.findings.set(sender.domain, finding)
  }

  finish() {
    if (this.started) this.finishMessage()
    const findings = [...this.findings.values()].map((finding): EmailHistoryFindingDraft => {
      const scored = scoreFinding(finding)
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
        sampleSubjects: finding.sampleSubjects,
      }
    }).sort((a, b) => b.confidenceScore - a.confidenceScore || b.messageCount - a.messageCount || a.serviceName.localeCompare(b.serviceName))
    return { messagesScanned: this.messagesScanned, candidateMessages: this.candidateMessages, findings }
  }

  private finishMessage() {
    const headers = parseHeaders(this.currentHeaders)
    const message: ParsedEmailMessage = {
      from: headers.get('from') ?? '',
      subject: headers.get('subject') ?? '',
      date: headers.get('date') ?? '',
      bodySample: this.currentBody,
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
