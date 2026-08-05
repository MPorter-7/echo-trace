import { describe, expect, it } from 'vitest'
import { MboxAnalyzer, decodeEmailHeader, validateMboxFile } from './mbox'

function analyze(text: string, splitAt?: number) {
  const parser = new MboxAnalyzer()
  const chunks = splitAt ? [text.slice(0, splitAt), text.slice(splitAt)] : [text]
  let pending = ''
  for (const chunk of chunks) {
    pending += chunk
    const lines = pending.split('\n')
    pending = lines.pop() ?? ''
    for (const line of lines) parser.addLine(line.replace(/\r$/, ''))
  }
  if (pending) parser.addLine(pending)
  return parser.finish()
}

const mailbox = `From sender@example.com Sat Jan 02 03:04:05 2021
Date: Sat, 2 Jan 2021 03:04:05 +0000
From: Example Accounts <accounts@example.com>
Subject: Welcome to Example — verify your email

Activate your account to get started.
From sender@example.com Sun Jan 03 03:04:05 2021
Date: Sun, 3 Jan 2021 03:04:05 +0000
From: Example Billing <billing@example.com>
Subject: Your payment receipt

Thank you for your purchase.
From person@example.net Mon Jan 04 03:04:05 2021
Date: Mon, 4 Jan 2021 03:04:05 +0000
From: A Person <person@example.net>
Subject: Weekend plans

Nothing related to an online account.
`

describe('Google Takeout mbox analysis', () => {
  it('aggregates recognized evidence by sender domain and ignores ordinary mail', () => {
    const result = analyze(mailbox)
    expect(result.messagesScanned).toBe(3)
    expect(result.candidateMessages).toBe(2)
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({
      serviceName: 'Example',
      senderDomain: 'example.com',
      firstSeen: '2021-01-02',
      lastSeen: '2021-01-03',
      messageCount: 2,
    })
    expect(result.findings[0].evidenceTypes).toEqual(expect.arrayContaining(['account_signup', 'email_verification', 'receipt']))
    expect(result).toMatchObject({ findingsBeforeCleanup: 1, duplicatesMerged: 0, findingsFiltered: 0 })
  })

  it('merges service subdomains and uses the service domain instead of an arbitrary display name', () => {
    const result = analyze(`From first Tue Feb 01 00:00:00 2022
Date: Tue, 1 Feb 2022 00:00:00 +0000
From: Matt Porter <no-reply@accounts.example.com>
Subject: Welcome to Example

Your account was created.
From second Wed Feb 02 00:00:00 2022
Date: Wed, 2 Feb 2022 00:00:00 +0000
From: Example Security <alerts@security.example.com>
Subject: Verify your email

Confirm your email address.
`)
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({ serviceName: 'Example', senderDomain: 'example.com', messageCount: 2 })
    expect(result.duplicatesMerged).toBe(1)
  })

  it('removes one-off receipt matches and obvious prize spam', () => {
    const result = analyze(`From receipt Tue Feb 01 00:00:00 2022
Date: Tue, 1 Feb 2022 00:00:00 +0000
From: Billing <billing@unknown-store.test>
Subject: Your payment receipt

Thank you for your purchase.
From spam Wed Feb 02 00:00:00 2022
Date: Wed, 2 Feb 2022 00:00:00 +0000
From: Rewards <verify@instant-jackpot.test>
Subject: Verify your account to claim your cash prize

Welcome to the jackpot. Redeem your reward now.
`)
    expect(result.findings).toHaveLength(0)
    expect(result.findingsBeforeCleanup).toBe(2)
    expect(result.findingsFiltered).toBe(2)
  })

  it('keeps high-signal one-message evidence and repeated purchase evidence', () => {
    const result = analyze(`From verify Tue Feb 01 00:00:00 2022
Date: Tue, 1 Feb 2022 00:00:00 +0000
From: Accounts <accounts@service.test>
Subject: Verify your email

Activate your account.
From receipt1 Wed Feb 02 00:00:00 2022
Date: Wed, 2 Feb 2022 00:00:00 +0000
From: Store <billing@shop.test>
Subject: Your order confirmation receipt

Thank you for your purchase.
From receipt2 Thu Feb 03 00:00:00 2022
Date: Thu, 3 Feb 2022 00:00:00 +0000
From: Store <billing@shop.test>
Subject: Your second order confirmation

Thank you for your purchase.
`)
    expect(result.findings.map(({ senderDomain }) => senderDomain)).toEqual(expect.arrayContaining(['service.test', 'shop.test']))
  })

  it('does not turn mail from a personal mailbox provider into an account finding', () => {
    const result = analyze(`From self Tue Feb 01 00:00:00 2022
Date: Tue, 1 Feb 2022 00:00:00 +0000
From: Matt Porter <person@gmail.com>
Subject: Welcome to my project

Verify your email before testing.
`)
    expect(result.findings).toHaveLength(0)
    expect(result.findingsFiltered).toBe(1)
  })

  it('reduces a 623-result noisy scan to the credible accounts automatically', () => {
    const message = (index: number, domain: string, subject: string, body: string) => `From message${index} Tue Feb 01 00:00:00 2022
Date: Tue, 1 Feb 2022 00:00:00 +0000
From: Sender <notice@${domain}>
Subject: ${subject}

${body}
`
    const spam = Array.from({ length: 600 }, (_, index) => message(index, `jackpot-${index}.test`, 'Verify your account to claim your cash prize', 'Welcome to the jackpot. Redeem your reward now.'))
    const legitimate = Array.from({ length: 23 }, (_, index) => message(index + 600, `service-${index}.test`, 'Verify your email', 'Activate your account to get started.'))
    const result = analyze([...spam, ...legitimate].join(''))

    expect(result.findingsBeforeCleanup).toBe(623)
    expect(result.findingsFiltered).toBe(600)
    expect(result.findings).toHaveLength(23)
  })

  it('preserves messages when streamed chunks split inside a header', () => {
    const result = analyze(mailbox, 84)
    expect(result.messagesScanned).toBe(3)
    expect(result.findings[0].senderDomain).toBe('example.com')
  })

  it('recognizes password resets and security notices from subjects', () => {
    const result = analyze(`From x Tue Feb 02 00:00:00 2022
Date: Tue, 2 Feb 2022 00:00:00 +0000
From: Security <no-reply@service.test>
Subject: Password reset requested — new sign-in alert

Review your account.
`)
    expect(result.findings[0].evidenceTypes).toEqual(expect.arrayContaining(['password_reset', 'account_notice']))
  })

  it('decodes common RFC 2047 encoded subjects', () => {
    expect(decodeEmailHeader('=?UTF-8?Q?Welcome_to_Example?=')).toBe('Welcome to Example')
    expect(decodeEmailHeader('=?UTF-8?B?UmVjZWlwdA==?=')).toBe('Receipt')
  })

  it('requires a non-empty extracted .mbox file', () => {
    expect(validateMboxFile({ name: 'All mail.mbox', size: 42 }).valid).toBe(true)
    expect(validateMboxFile({ name: 'takeout.zip', size: 42 }).valid).toBe(false)
    expect(validateMboxFile({ name: 'empty.mbox', size: 0 }).valid).toBe(false)
  })
})
