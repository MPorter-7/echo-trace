import { describe, expect, it } from 'vitest'
import { AUTO_SELECT_CONFIDENCE_THRESHOLD, MAX_RECOMMENDED_FINDINGS, MboxAnalyzer, decodeEmailHeader, shouldAutoSelectFinding, validateMboxFile } from './mbox'

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

describe('automatic finding selection', () => {
  it('selects only corroborated findings above 80% confidence', () => {
    expect(AUTO_SELECT_CONFIDENCE_THRESHOLD).toBe(80)
    expect(shouldAutoSelectFinding({ recommended: true, confidenceScore: 81 })).toBe(true)
    expect(shouldAutoSelectFinding({ recommended: true, confidenceScore: 80 })).toBe(false)
    expect(shouldAutoSelectFinding({ recommended: true, confidenceScore: 79 })).toBe(false)
    expect(shouldAutoSelectFinding({ recommended: false, confidenceScore: 95 })).toBe(false)
  })
})

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
    expect(result.findings[0]).toMatchObject({ recommended: true })
    expect(result.findings[0].confidenceScore).toBeGreaterThanOrEqual(80)
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
    expect(result.findings.find(({ senderDomain }) => senderDomain === 'service.test')).toMatchObject({ recommended: false })
  })

  it('does not select one-off verification mail as a high-confidence account', () => {
    const result = analyze(`From verify Tue Feb 01 00:00:00 2022
Date: Tue, 1 Feb 2022 00:00:00 +0000
From: Accounts <accounts@one-off.test>
Subject: Verify your email

Activate your account.
`)
    expect(result.findings[0]).toMatchObject({ senderDomain: 'one-off.test', recommended: false })
    expect(result.findings[0].confidenceScore).toBeLessThan(70)
  })

  it('does not auto-select a one-off password reset without corroboration', () => {
    const result = analyze(`From reset Tue Feb 01 00:00:00 2022
Date: Tue, 1 Feb 2022 00:00:00 +0000
From: Accounts <accounts@one-reset.test>
Subject: Reset your password

Use the password reset link.
`)
    expect(result.findings[0]).toMatchObject({ senderDomain: 'one-reset.test', recommended: false })
  })

  it('caps automatic selection while preserving additional evidence as unselected possibilities', () => {
    const messages = Array.from({ length: MAX_RECOMMENDED_FINDINGS + 10 }, (_, index) => `From verify-${index}-1 Tue Feb 01 00:00:00 2022
Date: Tue, 1 Feb 2022 00:00:00 +0000
From: Accounts <accounts@service-${index}.test>
Subject: Verify your email

Confirm your account.
From verify-${index}-2 Wed Feb 02 00:00:00 2022
Date: Wed, 2 Feb 2022 00:00:00 +0000
From: Accounts <accounts@service-${index}.test>
Subject: Email verification

Confirm your account.
`).join('')
    const result = analyze(messages)
    expect(result.findings).toHaveLength(MAX_RECOMMENDED_FINDINGS + 10)
    expect(result.findings.filter(({ recommended }) => recommended)).toHaveLength(MAX_RECOMMENDED_FINDINGS)
    expect(result.findings.filter(({ recommended }) => !recommended)).toHaveLength(10)
  })

  it('removes mailing-list confirmations unless direct security evidence corroborates an account', () => {
    const result = analyze(`From newsletter Tue Feb 01 00:00:00 2022
Date: Tue, 1 Feb 2022 00:00:00 +0000
From: Newsletter <news@mailer.test>
Subject: Confirm your email
List-Id: Weekly offers <offers.mailer.test>
List-Unsubscribe: <https://mailer.test/unsubscribe>
Precedence: bulk

Welcome to this week's newsletter. Verify your email to keep receiving offers.
`)
    expect(result.findings).toHaveLength(0)
    expect(result.findingsFiltered).toBe(1)
  })

  it('rejects the exact scam, newsletter, and forwarded-subject patterns from the 708-result scan', () => {
    const result = analyze(`From cash Tue Feb 01 00:00:00 2022
Date: Tue, 1 Feb 2022 00:00:00 +0000
From: Cash Setup <notice@webtraffictoolkit.com>
Subject: Please Activate Your EMAIL-CASH Setup

Welcome to your payout. Verify your email and activate your cash account.
From delivery Tue Feb 01 00:00:00 2022
Date: Tue, 1 Feb 2022 00:00:00 +0000
From: Delivery <notice@sattape.com>
Subject: Confirm your email and locate your card

Verify your delivery now.
From forwarded Tue Feb 01 00:00:00 2022
Date: Tue, 1 Feb 2022 00:00:00 +0000
From: Forwarder <notice@aura.com>
Subject: Re: WELCOME TO WELLS FARGO BANK

Please confirm your email.
From newsletter Tue Feb 01 00:00:00 2022
Date: Tue, 1 Feb 2022 00:00:00 +0000
From: Local newsletter <notice@ccsend.com>
Subject: Pothole bandits, reading parties, and regional theater
List-Unsubscribe: <https://ccsend.com/unsubscribe>

Welcome to the newsletter. Confirm your email subscription.
From security1 Tue Feb 01 00:00:00 2022
Date: Tue, 1 Feb 2022 00:00:00 +0000
From: T-Mobile <notice@t-mobile.com>
Subject: T-Mobile ID verification code

Use this code to verify your account.
From security2 Wed Feb 02 00:00:00 2022
Date: Wed, 2 Feb 2022 00:00:00 +0000
From: T-Mobile <notice@t-mobile.com>
Subject: Your T-Mobile verification code

Use this code to sign in.
`)
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({ senderDomain: 't-mobile.com', recommended: true })
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

  it('recognizes account password-reset subjects without treating password-reset articles as account evidence', () => {
    const result = analyze(`From reset1 Tue Feb 01 00:00:00 2022
Date: Tue, 1 Feb 2022 00:00:00 +0000
From: Microsoft <no-reply@microsoft.com>
Subject: Personal Microsoft account password reset

Use the link to reset your password.
From reset2 Wed Feb 02 00:00:00 2022
Date: Wed, 2 Feb 2022 00:00:00 +0000
From: Microsoft <no-reply@microsoft.com>
Subject: Microsoft account password reset

Use the link to reset your password.
From article Thu Feb 03 00:00:00 2022
Date: Thu, 3 Feb 2022 00:00:00 +0000
From: Malwarebytes <news@malwarebytes.com>
Subject: About those Instagram password reset emails...

Read our latest security article.
`)
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({ senderDomain: 'microsoft.com', recommended: true })
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
