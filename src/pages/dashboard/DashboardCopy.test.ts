import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const home = readFileSync(new URL('./DashboardHome.tsx', import.meta.url), 'utf8')
const settings = readFileSync(new URL('./SettingsPage.tsx', import.meta.url), 'utf8')

describe('provider-neutral dashboard copy', () => {
  it('does not repeat the old email-first workflow beneath the recovery choices', () => {
    expect(home).not.toContain('Three easy steps')
    expect(home).not.toContain('const nextSteps')
  })

  it('does not promise ongoing scans after Gmail OAuth removal', () => {
    expect(home).not.toContain('ongoing scans')
    expect(settings).not.toContain('ongoing scans')
  })
})
