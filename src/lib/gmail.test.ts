import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MboxAnalyzer } from './mbox'
import { GMAIL_ACCOUNT_PROMPT, GMAIL_EVIDENCE_QUERY, GMAIL_QUICK_SCAN_LIMIT, GMAIL_READONLY_SCOPE, parseGmailMessage } from './gmail'

function encode(value: string) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('Quick Gmail Scan', () => {
  it('requests only read-only Gmail access and caps quick scans', () => {
    expect(GMAIL_READONLY_SCOPE).toBe('https://www.googleapis.com/auth/gmail.readonly')
    expect(GMAIL_QUICK_SCAN_LIMIT).toBe(5000)
    expect(GMAIL_EVIDENCE_QUERY).toContain('-in:spam')
    expect(GMAIL_EVIDENCE_QUERY).toContain('-in:trash')
    expect(GMAIL_EVIDENCE_QUERY).toContain('-in:sent')
    expect(GMAIL_EVIDENCE_QUERY).toContain('-in:drafts')
    expect(GMAIL_EVIDENCE_QUERY).toContain('-category:promotions')
    expect(GMAIL_EVIDENCE_QUERY).toContain('subject:"verify your email"')
    expect(GMAIL_EVIDENCE_QUERY).not.toContain('in:anywhere')
    expect(GMAIL_EVIDENCE_QUERY).not.toContain('"welcome to"')
    expect(GMAIL_EVIDENCE_QUERY).not.toMatch(/\breceipt\b|\binvoice\b/i)
  })

  it('always asks the user which Google account to scan', () => {
    expect(GMAIL_ACCOUNT_PROMPT.split(/\s+/)).toEqual(expect.arrayContaining(['select_account', 'consent']))
  })

  it('does not request or retain the connected Gmail address', () => {
    const implementation = readFileSync(new URL('./gmail.ts', import.meta.url), 'utf8')
    expect(implementation).not.toContain("gmailFetch<GmailProfile>('/profile'")
    expect(implementation).not.toContain('emailAddress:')
  })

  it('converts Gmail API messages into the existing local evidence analyzer', () => {
    const parsed = parseGmailMessage({
      payload: {
        headers: [
          { name: 'From', value: 'Example Accounts <accounts@example.com>' },
          { name: 'Subject', value: 'Welcome to Example — verify your email' },
          { name: 'Date', value: 'Sat, 2 Jan 2021 03:04:05 +0000' },
        ],
        mimeType: 'multipart/alternative',
        parts: [{ mimeType: 'text/plain', body: { data: encode('Activate your account to get started.') } }],
      },
    })
    const analyzer = new MboxAnalyzer()
    analyzer.addMessage(parsed)
    const result = analyzer.finish()

    expect(result.messagesScanned).toBe(1)
    expect(result.candidateMessages).toBe(1)
    expect(result.findings[0]).toMatchObject({
      serviceName: 'Example',
      senderDomain: 'example.com',
      firstSeen: '2021-01-02',
    })
    expect(result.findings[0].evidenceTypes).toEqual(expect.arrayContaining(['account_signup', 'email_verification']))
  })

  it('carries Gmail mailing-list headers into local cleanup without storing message content', () => {
    const parsed = parseGmailMessage({
      payload: {
        headers: [
          { name: 'List-Id', value: 'Example list <example.test>' },
          { name: 'List-Unsubscribe', value: '<https://example.com/unsubscribe>' },
          { name: 'Precedence', value: 'bulk' },
        ],
      },
    })
    expect(parsed).toMatchObject({ listId: 'Example list <example.test>', listUnsubscribe: '<https://example.com/unsubscribe>', precedence: 'bulk' })
  })

  it('uses readable text from HTML-only account messages', () => {
    const parsed = parseGmailMessage({
      payload: {
        headers: [{ name: 'Subject', value: 'Account notice' }],
        mimeType: 'text/html',
        body: { data: encode('<style>.hide{display:none}</style><p>New sign-in from a device</p>') },
      },
    })
    expect(parsed.bodySample).toBe('New sign-in from a device')
  })
})
