import { describe, expect, it } from 'vitest'
import { LoginExportAnalyzer, validateLoginExportFile } from './loginExport'

function analyze(text: string, splitAt?: number) {
  const analyzer = new LoginExportAnalyzer()
  if (splitAt == null) analyzer.addChunk(text)
  else {
    analyzer.addChunk(text.slice(0, splitAt))
    analyzer.addChunk(text.slice(splitAt))
  }
  return analyzer.finish()
}

const SECRET = 'correct-horse-battery-staple'

describe('Chrome-style saved-logins export', () => {
  it('extracts service, domain, and username while discarding the password column', () => {
    const csv = `name,url,username,password\nExample,https://accounts.example.com/login,alice@example.com,${SECRET}\n`
    const result = analyze(csv)
    expect(result.rowsScanned).toBe(1)
    expect(result.candidateRows).toBe(1)
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({ serviceName: 'Example', domain: 'example.com', usernames: ['alice@example.com'], recommended: true })
    expect(result.findings[0].confidenceScore).toBeGreaterThanOrEqual(80)
    expect(JSON.stringify(result)).not.toContain(SECRET)
  })

  it('merges subdomains into the same registrable-domain finding', () => {
    const csv = `name,url,username,password\nExample,https://accounts.example.com,alice,${SECRET}\nExample,https://www.example.com,bob,${SECRET}\n`
    const result = analyze(csv)
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({ domain: 'example.com', usernameCount: 2 })
    expect(result.duplicatesMerged).toBe(1)
    expect(result.findings[0].usernames).toEqual(expect.arrayContaining(['alice', 'bob']))
  })
})

describe('Firefox-style saved-logins export', () => {
  it('recognizes the url/username header names Firefox uses', () => {
    const csv = `url,username,password,httpRealm,formActionOrigin,guid,timeCreated,timeLastUsed,timePasswordChanged\nhttps://example.net,carol,${SECRET},,https://example.net,abc123,0,0,0\n`
    const result = analyze(csv)
    expect(result.findings).toMatchObject([{ domain: 'example.net', usernames: ['carol'] }])
  })
})

describe('Bitwarden-style saved-logins export', () => {
  const header = 'folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp'

  it('keeps login rows and drops secure notes, cards, and identities', () => {
    const csv = [
      header,
      `Personal,0,login,Example Service,,,0,https://example.org,dana,${SECRET},`,
      'Personal,0,note,Wifi password,"some note text",,0,,,,',
      'Personal,0,card,My Visa,,,0,,,,',
    ].join('\n') + '\n'
    const result = analyze(csv)
    expect(result.rowsScanned).toBe(3)
    expect(result.candidateRows).toBe(1)
    expect(result.findings).toMatchObject([{ domain: 'example.org', usernames: ['dana'] }])
  })

  it('preserves rows when a quoted field contains commas and embedded newlines', () => {
    const csv = `${header}\nPersonal,0,login,Example Service,"line one, with a comma\nline two",,0,https://example.org,dana,${SECRET},\n`
    const result = analyze(csv)
    expect(result.findings).toMatchObject([{ domain: 'example.org', usernames: ['dana'] }])
    expect(JSON.stringify(result)).not.toContain(SECRET)
  })

  it('still parses correctly when a streamed chunk splits inside a quoted field', () => {
    const csv = `${header}\nPersonal,0,login,Example Service,"line one, with a comma\nline two",,0,https://example.org,dana,${SECRET},\n`
    const splitPoint = csv.indexOf('with a comma')
    const result = analyze(csv, splitPoint)
    expect(result.findings).toMatchObject([{ domain: 'example.org', usernames: ['dana'] }])
  })

  it('does not corrupt following rows when a chunk splits between the two characters of an escaped quote', () => {
    const row1 = `Personal,0,login,Escaped,"Quote""here",,0,https://example.org,dana,${SECRET},`
    const row2 = `Personal,0,login,Second,,,0,https://second.example,erin,${SECRET},`
    const csv = `${header}\n${row1}\n${row2}\n`
    const splitPoint = csv.indexOf('""here') + 1
    const result = analyze(csv, splitPoint)
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ domain: 'example.org', usernames: ['dana'] }),
      expect.objectContaining({ domain: 'second.example', usernames: ['erin'] }),
    ]))
    expect(result.findings).toHaveLength(2)
  })
})

describe('non-web and low-signal rows', () => {
  it('ignores Android app origins and rows without a usable URL', () => {
    const csv = `url,username,password\nandroid://abc123@com.example.app/,frank,${SECRET}\n,gina,${SECRET}\n`
    const result = analyze(csv)
    expect(result.rowsScanned).toBe(2)
    expect(result.candidateRows).toBe(0)
    expect(result.findings).toHaveLength(0)
  })

  it('downgrades suspicious-looking domains instead of recommending them automatically', () => {
    const csv = `url,username,password\nhttps://xn--exmple-cua.com,heidi,${SECRET}\n`
    const result = analyze(csv)
    expect(result.findings[0].recommended).toBe(false)
    expect(result.findings[0].confidenceScore).toBeLessThan(70)
  })

  it('truncates an unreasonably long username instead of storing it in full', () => {
    const hugeUsername = 'a'.repeat(1000)
    const csv = `url,username,password\nhttps://example.com,${hugeUsername},${SECRET}\n`
    const result = analyze(csv)
    expect(result.findings[0].usernames[0].length).toBe(320)
  })

  it('keeps distinct accounts under an unlisted compound suffix separate instead of merging them', () => {
    const csv = `url,username,password\nhttps://foo.co.in,ivan,${SECRET}\nhttps://bar.co.in,judy,${SECRET}\n`
    const result = analyze(csv)
    expect(result.findings).toHaveLength(2)
    expect(result.findings.map((finding) => finding.domain).sort()).toEqual(['bar.co.in', 'foo.co.in'])
  })
})

describe('validateLoginExportFile', () => {
  it('requires a non-empty .csv file', () => {
    expect(validateLoginExportFile({ name: 'chrome-passwords.csv', size: 42 }).valid).toBe(true)
    expect(validateLoginExportFile({ name: 'chrome-passwords.json', size: 42 }).valid).toBe(false)
    expect(validateLoginExportFile({ name: 'empty.csv', size: 0 }).valid).toBe(false)
  })
})
